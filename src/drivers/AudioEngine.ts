export class AudioEngine {
  private static instance: AudioEngine;
  private ctx: AudioContext | null = null;
  private currentAmbientSource: AudioScheduledSourceNode | null = null;
  private currentAmbientGain: GainNode | null = null;
  private ambientElement: HTMLAudioElement | null = null;
  private isAmbientSynthesized = false;
  private volume = 1.0;

  // Playlist console d'arrière-plan
  private playlist: string[] = [];
  private playlistLoaded = false;
  private currentTrackIndex = -1;
  private isPlayingConsolePlaylist = false;

  private currentAmbientUrl: string | null = null;
  private currentObjectUrl: string | null = null;
  private isGameRunning = false;

  private constructor() {
    // Initialisé à la demande pour respecter la politique d'autoplay
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    // Reprendre le contexte s'il a été suspendu par le navigateur
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Obtenir un Object URL de Blob via le proxy obfuscateur
  private async getObfuscatedBlobUrl(url: string): Promise<string> {
    try {
      const base64Key = btoa(unescape(encodeURIComponent(url)));
      const res = await fetch(`/api/media?key=${base64Key}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch media through proxy: ${res.status}`);
      }
      const blob = await res.blob();
      // On crée un blob avec un type MIME correct pour la lecture mais stocké localement
      // de façon à ce que IDM ne puisse pas l'intercepter via le réseau ou le DOM.
      const mediaBlob = new Blob([blob], { type: 'audio/mpeg' });
      return URL.createObjectURL(mediaBlob);
    } catch (e) {
      console.warn("Erreur d'obfuscation du média, repli sur l'URL directe:", e);
      return url;
    }
  }

  private revokeCurrentObjectUrl() {
    if (this.currentObjectUrl) {
      try {
        URL.revokeObjectURL(this.currentObjectUrl);
      } catch (e) {}
      this.currentObjectUrl = null;
    }
  }

  // Jouer un effet sonore système (synthétisé ou chargé en local)
  public playSFX(type: 'navigate' | 'select' | 'trophy', pan: number = 0) {
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      let outputNode: AudioNode = this.ctx.destination;

      // Utiliser StereoPannerNode pour la spatialisation stéréo 3D
      if (this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(pan, now);
        panner.connect(this.ctx.destination);
        outputNode = panner;
      }

      if (type === 'navigate') {
        // Son de navigation PS5 : Un petit click/pluck rapide
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(outputNode);

        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'select') {
        // Son de sélection : Un double ton harmonieux
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, now); // E5
        osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.15); // C6

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(outputNode);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.18);
        osc2.stop(now + 0.18);
      } else if (type === 'trophy') {
        // Son de trophée : Fanfare scintillante et triomphale
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // Accord C Maj (C5, E5, G5, C6, E6)
        const mainGain = this.ctx.createGain();
        mainGain.gain.setValueAtTime(0.25, now);
        mainGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
        mainGain.connect(outputNode);

        notes.forEach((freq, index) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + index * 0.06);
          
          // Petit vibrato
          const lfo = this.ctx.createOscillator();
          const lfoGain = this.ctx.createGain();
          lfo.frequency.value = 6; // 6 Hz
          lfoGain.gain.value = 5; // 5 Hz de déviation
          
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          
          const oscGain = this.ctx.createGain();
          oscGain.gain.setValueAtTime(0, now);
          oscGain.gain.linearRampToValueAtTime(0.3, now + index * 0.06 + 0.02);
          oscGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
          
          osc.connect(oscGain);
          oscGain.connect(mainGain);
          
          lfo.start(now);
          osc.start(now + index * 0.06);
          osc.stop(now + 2.0);
          lfo.stop(now + 2.0);
        });
      }
    } catch (err) {
      console.warn("Erreur lors de la lecture du SFX:", err);
    }
  }

  // Charger la playlist depuis le serveur de manière asynchrone
  private async loadPlaylist() {
    if (this.playlistLoaded) return;
    try {
      const res = await fetch('/api/musics');
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          this.playlist = this.shuffleArray(list);
          this.playlistLoaded = true;
        }
      }
    } catch (e) {
      console.warn("Impossible de charger la playlist de musique d'ambiance:", e);
    }
  }

  private shuffleArray(array: string[]): string[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Jouer la piste suivante dans la playlist
  private async playNextTrack() {
    if (this.playlist.length === 0) return;
    
    if (this.currentTrackIndex === this.playlist.length - 1) {
      // Si on a joué tout le cycle, on remélange la playlist pour le tour suivant
      this.playlist = this.shuffleArray(this.playlist);
      this.currentTrackIndex = 0;
    } else {
      this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
    }
    const nextUrl = this.playlist[this.currentTrackIndex];

    this.stopAmbientMusic();

    this.isAmbientSynthesized = false;
    this.isPlayingConsolePlaylist = true;

    const targetUrl = nextUrl;
    this.currentAmbientUrl = targetUrl;

    // Charger l'élément audio de manière sécurisée contre IDM
    const blobUrl = await this.getObfuscatedBlobUrl(nextUrl);

    // Annuler la lecture si l'état a changé pendant le chargement asynchrone (ex: jeu lancé)
    if (this.currentAmbientUrl !== targetUrl || !this.isPlayingConsolePlaylist || this.isGameRunning) {
      try { URL.revokeObjectURL(blobUrl); } catch (e) {}
      return;
    }

    this.currentObjectUrl = blobUrl;
    this.ambientElement = new Audio(blobUrl);
    this.ambientElement.loop = false;
    // Volume adéquat et équilibré : 0.18 * volume système (doux mais présent)
    this.ambientElement.volume = 0.18 * this.volume;

    this.ambientElement.addEventListener('ended', () => {
      if (this.isPlayingConsolePlaylist) {
        this.playNextTrack();
      }
    });

    this.ambientElement.play().catch((err) => {
      console.warn("Échec de la lecture de la piste d'ambiance en arrière-plan:", err);
    });
  }

  // Synthétiseur d'ambiance alternatif (fallback)
  private playSynthesizedHum() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.currentAmbientGain = this.ctx.createGain();
    this.currentAmbientGain.gain.setValueAtTime(0, now);
    this.currentAmbientGain.gain.linearRampToValueAtTime(0.08 * this.volume, now + 2.0); // fade in


    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 250;

    this.currentAmbientGain.connect(filter);
    filter.connect(this.ctx.destination);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 65.41; // C2

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 65.75; // C2 légèrement désaccordé

    osc1.connect(this.currentAmbientGain);
    osc2.connect(this.currentAmbientGain);

    osc1.start(now);
    osc2.start(now);

    this.currentAmbientSource = osc1;
    (this.currentAmbientSource as any).stopCustom = () => {
      try {
        osc1.stop();
        osc2.stop();
      } catch (e) {}
    };
  }

  public setGameRunning(running: boolean) {
    this.isGameRunning = running;
    if (running) {
      this.currentAmbientUrl = null;
      this.stopAmbientMusic();
    }
  }

  // Musique de fond (ambient) dynamique
  public async playAmbientMusic(url?: string) {
    if (this.isGameRunning) {
      return;
    }
    this.initCtx();
    this.stopAmbientMusic();

    const targetUrl = url || 'playlist';
    this.currentAmbientUrl = targetUrl;

    if (url) {
      // Charger la musique spécifique du jeu focalisé
      this.isAmbientSynthesized = false;
      this.isPlayingConsolePlaylist = false;
      
      const blobUrl = await this.getObfuscatedBlobUrl(url);

      // Annuler si l'état a changé (ex: jeu lancé ou navigation vers un autre jeu)
      if (this.currentAmbientUrl !== targetUrl || this.isGameRunning) {
        try { URL.revokeObjectURL(blobUrl); } catch (e) {}
        return;
      }

      this.currentObjectUrl = blobUrl;
      this.ambientElement = new Audio(blobUrl);
      this.ambientElement.loop = true;
      this.ambientElement.volume = 0.25 * this.volume;
      this.ambientElement.play().catch((err) => {
        console.warn("L'autoplay de la musique d'ambiance du jeu a été bloqué par le navigateur:", err);
      });
    } else {
      // Playlist console générale en arrière-plan
      this.isPlayingConsolePlaylist = true;

      if (this.playlistLoaded && this.playlist.length > 0) {
        this.playNextTrack();
      } else {
        // Jouer le hum de secours temporairement
        this.isAmbientSynthesized = true;
        this.playSynthesizedHum();

        // Charger et démarrer la playlist dès qu'elle est prête
        this.loadPlaylist().then(() => {
          if (this.currentAmbientUrl === targetUrl && this.isPlayingConsolePlaylist && this.playlist.length > 0 && !this.isGameRunning) {
            this.stopAmbientMusic();
            this.playNextTrack();
          }
        });
      }
    }
  }

  public stopAmbientMusic() {
    this.isPlayingConsolePlaylist = false;
    this.currentAmbientUrl = null;

    // Arrêter l'élément audio
    if (this.ambientElement) {
      this.ambientElement.pause();
      this.ambientElement = null;
    }

    // Libérer l'Object URL pour éviter les fuites de mémoire
    this.revokeCurrentObjectUrl();

    // Arrêter le synthétiseur de secours
    if (this.isAmbientSynthesized && this.currentAmbientSource) {
      const now = this.ctx ? this.ctx.currentTime : 0;
      if (this.ctx && this.currentAmbientGain) {
        this.currentAmbientGain.gain.setValueAtTime(this.currentAmbientGain.gain.value, now);
        this.currentAmbientGain.gain.linearRampToValueAtTime(0, now + 0.5); // fade out
      }
      const source = this.currentAmbientSource as any;
      setTimeout(() => {
        if (source.stopCustom) {
          source.stopCustom();
        } else {
          try { source.stop(); } catch (e) {}
        }
      }, 500);
      this.currentAmbientSource = null;
      this.currentAmbientGain = null;
      this.isAmbientSynthesized = false;
    }
  }

  public setVolume(level: number) {
    this.volume = Math.max(0, Math.min(1, level));
    if (this.ambientElement) {
      // Ajuster selon le mode
      this.ambientElement.volume = this.isPlayingConsolePlaylist 
        ? this.volume * 0.18 
        : this.volume * 0.25;
    }
    if (this.currentAmbientGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.currentAmbientGain.gain.setValueAtTime(this.volume * 0.08, now);
    }
  }

  public getVolume(): number {
    return this.volume;
  }
}
