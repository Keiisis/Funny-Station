// ════════════════════════════════════════════════════════════════════════════
//  LIAISON P2P MANETTE  (WebRTC DataChannel)
//  But : supprimer la latence du relais pour la manette virtuelle.
//
//  Le Supabase Realtime channel sert de canal de SIGNALING (échange offre/réponse/ICE)
//  ET de repli. Une fois le DataChannel ouvert, les inputs passent en PAIR-À-PAIR
//  (téléphone ⇄ console) : sur un même réseau, ~2-5 ms au lieu de ~50-150 ms via le
//  relais Supabase. Si la liaison P2P ne s'ouvre pas (NAT strict, navigateur ancien…),
//  l'appelant garde le broadcast Supabase — RIEN ne casse, c'est purement additif.
//
//  Rôles :
//   - CONSOLE (Dashboard) : 1 pair par manette, REÇOIT les inputs (répond aux offres).
//   - MANETTE (controller): 1 pair vers la console, ENVOIE les inputs (émet l'offre).
//
//  Événements de signaling (relayés via channel.send broadcast) :
//   rtc_console_ready {}                          console → manettes (relance la négo)
//   rtc_offer  { fromUserId, sdp }                manette → console
//   rtc_answer { toUserId,   sdp }                console → manette
//   rtc_ice    { dir:'c2s'|'s2c', userId, candidate }   les deux sens
// ════════════════════════════════════════════════════════════════════════════

type Signal = (event: string, payload: any) => void;

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

function rtcAvailable(): boolean {
  return typeof window !== 'undefined' && typeof RTCPeerConnection !== 'undefined';
}

// ── CÔTÉ CONSOLE ────────────────────────────────────────────────────────────
export interface ConsoleRtc {
  handleSignal: (event: string, payload: any) => void;
  announce: () => void;
  close: () => void;
}

export function createConsoleRtc(signal: Signal, onInput: (payload: any) => void): ConsoleRtc {
  if (!rtcAvailable()) {
    return { handleSignal: () => {}, announce: () => {}, close: () => {} };
  }

  const peers = new Map<string, RTCPeerConnection>();

  function ensure(userId: string): RTCPeerConnection {
    const existing = peers.get(userId);
    if (existing) return existing;
    const pc = new RTCPeerConnection(ICE_CONFIG);
    pc.onicecandidate = (e) => {
      if (e.candidate) signal('rtc_ice', { dir: 's2c', userId, candidate: e.candidate });
    };
    pc.ondatachannel = (e) => {
      e.channel.onmessage = (m) => { try { onInput(JSON.parse(m.data)); } catch { /* ignore */ } };
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        peers.delete(userId);
      }
    };
    peers.set(userId, pc);
    return pc;
  }

  async function handleSignal(event: string, payload: any) {
    try {
      if (event === 'rtc_offer') {
        const pc = ensure(payload.fromUserId);
        await pc.setRemoteDescription(payload.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        signal('rtc_answer', { toUserId: payload.fromUserId, sdp: pc.localDescription });
      } else if (event === 'rtc_ice' && payload.dir === 'c2s') {
        const pc = peers.get(payload.userId);
        if (pc && payload.candidate) await pc.addIceCandidate(payload.candidate);
      }
    } catch { /* négociation best-effort : on retombe sur le broadcast */ }
  }

  return {
    handleSignal,
    announce: () => signal('rtc_console_ready', {}),
    close: () => { peers.forEach((pc) => { try { pc.close(); } catch { /* */ } }); peers.clear(); },
  };
}

// ── CÔTÉ MANETTE ────────────────────────────────────────────────────────────
export interface ControllerRtc {
  start: () => void;
  handleSignal: (event: string, payload: any) => void;
  send: (data: any) => boolean; // true si envoyé en P2P (sinon : l'appelant broadcast)
  close: () => void;
}

export function createControllerRtc(
  userId: string,
  signal: Signal,
  onState: (open: boolean) => void,
): ControllerRtc {
  if (!rtcAvailable()) {
    return { start: () => {}, handleSignal: () => {}, send: () => false, close: () => {} };
  }

  let pc: RTCPeerConnection | null = null;
  let dc: RTCDataChannel | null = null;

  function start() {
    if (pc) { try { pc.close(); } catch { /* */ } }
    pc = new RTCPeerConnection(ICE_CONFIG);
    // Fiable + ordonné : un 'up' perdu = touche bloquée. La latence LAN reste minime.
    dc = pc.createDataChannel('input', { ordered: true });
    dc.onopen = () => onState(true);
    dc.onclose = () => onState(false);
    pc.onicecandidate = (e) => {
      if (e.candidate) signal('rtc_ice', { dir: 'c2s', userId, candidate: e.candidate });
    };
    pc.onconnectionstatechange = () => {
      if (pc && (pc.connectionState === 'failed' || pc.connectionState === 'disconnected')) onState(false);
    };
    pc.createOffer()
      .then((o) => pc!.setLocalDescription(o))
      .then(() => signal('rtc_offer', { fromUserId: userId, sdp: pc!.localDescription }))
      .catch(() => { /* repli broadcast */ });
  }

  async function handleSignal(event: string, payload: any) {
    try {
      if (event === 'rtc_answer' && payload.toUserId === userId && pc) {
        await pc.setRemoteDescription(payload.sdp);
      } else if (event === 'rtc_ice' && payload.dir === 's2c' && payload.userId === userId && pc) {
        if (payload.candidate) await pc.addIceCandidate(payload.candidate);
      } else if (event === 'rtc_console_ready') {
        start(); // la console vient d'apparaître → (re)lance la négociation
      }
    } catch { /* best-effort */ }
  }

  function send(data: any): boolean {
    if (dc && dc.readyState === 'open') {
      try { dc.send(JSON.stringify(data)); return true; } catch { return false; }
    }
    return false;
  }

  return {
    start,
    handleSignal,
    send,
    close: () => {
      if (dc) { try { dc.close(); } catch { /* */ } }
      if (pc) { try { pc.close(); } catch { /* */ } }
      dc = null; pc = null;
    },
  };
}
