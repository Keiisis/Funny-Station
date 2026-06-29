'use client';

import { buildIceServers } from '@/utils/rtcLink';

/**
 * CHAT VOCAL TEMPS RÉEL (WebRTC, vrai audio P2P) entre joueurs d'une même room.
 *
 * Topologie MESH : chaque joueur ouvre une RTCPeerConnection vers chaque autre, avec
 * sa piste micro. Le SIGNALING (offre/réponse/ICE) passe par le canal Supabase de la
 * room (déjà ouvert pour le jeu). STUN + TURN (cf. rtcLink) pour la traversée NAT.
 *
 * Anti-glare : pour une paire (A,B), SEUL celui dont l'id est « inférieur » émet
 * l'offre ; l'autre répond. Déterministe → pas de collision d'offres.
 *
 * Confidentialité : le micro n'est capturé qu'à l'appel de start() (geste explicite
 * « Activer le micro »). setMuted() coupe la piste localement (track.enabled=false).
 */

type Signal = (event: string, payload: unknown) => void;

interface VoiceSignal {
  to: string;
  from: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export class VoiceChat {
  private selfId: string;
  private signal: Signal;
  private localStream: MediaStream | null = null;
  private peers = new Map<string, RTCPeerConnection>();
  private audioEls = new Map<string, HTMLAudioElement>();
  private muted = false;
  private active = false;
  private onPeersChange?: (count: number) => void;

  constructor(selfId: string, signal: Signal, onPeersChange?: (count: number) => void) {
    this.selfId = selfId;
    this.signal = signal;
    this.onPeersChange = onPeersChange;
  }

  get isActive() { return this.active; }
  get peerCount() { return this.peers.size; }

  /** Capture le micro (geste utilisateur requis). Retourne false si refus/erreur. */
  async start(): Promise<boolean> {
    if (this.active) return true;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false;
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      // On démarre actif mais NON coupé (le bouton "Activer le micro" = parler).
      this.muted = false;
      this.applyMute();
      this.active = true;
      return true;
    } catch (e) {
      console.warn('[VoiceChat] Accès micro refusé/indisponible:', e);
      return false;
    }
  }

  setMuted(m: boolean) { this.muted = m; this.applyMute(); }
  isMuted() { return this.muted; }
  private applyMute() {
    this.localStream?.getAudioTracks().forEach((t) => { t.enabled = !this.muted; });
  }

  /**
   * Synchronise les pairs avec la liste des membres présents. À appeler quand la
   * présence de la room change. On n'initie QUE vers les ids « supérieurs » au sien.
   */
  syncPeers(memberIds: string[]) {
    if (!this.active) return;
    const others = memberIds.filter((id) => id && id !== this.selfId);
    // Ouvre les connexions manquantes (anti-glare : selfId < peerId initie).
    for (const id of others) {
      if (!this.peers.has(id) && this.selfId < id) this.connectTo(id);
    }
    // Ferme les pairs qui ont quitté.
    for (const id of [...this.peers.keys()]) {
      if (!others.includes(id)) this.removePeer(id);
    }
  }

  private makePeer(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
    this.localStream?.getTracks().forEach((t) => pc.addTrack(t, this.localStream!));
    pc.onicecandidate = (e) => {
      if (e.candidate) this.signal('voice_ice', { to: peerId, from: this.selfId, candidate: e.candidate });
    };
    pc.ontrack = (e) => this.playRemote(peerId, e.streams[0]);
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) this.removePeer(peerId);
    };
    this.peers.set(peerId, pc);
    this.onPeersChange?.(this.peers.size);
    return pc;
  }

  private async connectTo(peerId: string) {
    try {
      const pc = this.makePeer(peerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.signal('voice_offer', { to: peerId, from: this.selfId, sdp: pc.localDescription });
    } catch (e) { console.warn('[VoiceChat] connectTo:', e); }
  }

  /** Traite un message de signaling reçu sur le canal de la room. */
  async handleSignal(event: string, payload: VoiceSignal) {
    if (!this.active || !payload || payload.to !== this.selfId) return;
    try {
      if (event === 'voice_offer' && payload.sdp) {
        const pc = this.peers.get(payload.from) || this.makePeer(payload.from);
        await pc.setRemoteDescription(payload.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.signal('voice_answer', { to: payload.from, from: this.selfId, sdp: pc.localDescription });
      } else if (event === 'voice_answer' && payload.sdp) {
        const pc = this.peers.get(payload.from);
        if (pc) await pc.setRemoteDescription(payload.sdp);
      } else if (event === 'voice_ice' && payload.candidate) {
        const pc = this.peers.get(payload.from);
        if (pc) await pc.addIceCandidate(payload.candidate);
      } else if (event === 'voice_leave') {
        this.removePeer(payload.from);
      }
    } catch (e) { console.warn('[VoiceChat] handleSignal', event, e); }
  }

  private playRemote(peerId: string, stream: MediaStream) {
    let el = this.audioEls.get(peerId);
    if (!el) {
      el = new Audio();
      el.autoplay = true;
      (el as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
      this.audioEls.set(peerId, el);
    }
    el.srcObject = stream;
    el.play().catch(() => { /* autoplay : reprend au 1er geste */ });
  }

  private removePeer(peerId: string) {
    const pc = this.peers.get(peerId);
    if (pc) { try { pc.close(); } catch { /* */ } this.peers.delete(peerId); }
    const el = this.audioEls.get(peerId);
    if (el) { try { el.srcObject = null; el.remove(); } catch { /* */ } this.audioEls.delete(peerId); }
    this.onPeersChange?.(this.peers.size);
  }

  /** Coupe tout : prévient les pairs, ferme les connexions, relâche le micro. */
  stop() {
    if (this.active) {
      for (const id of this.peers.keys()) this.signal('voice_leave', { to: id, from: this.selfId });
    }
    for (const id of [...this.peers.keys()]) this.removePeer(id);
    this.localStream?.getTracks().forEach((t) => { try { t.stop(); } catch { /* */ } });
    this.localStream = null;
    this.active = false;
  }
}
