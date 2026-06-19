export class AudioEngine {
  private static instance: AudioEngine;
  private ctx: AudioContext | null = null;
  private currentAmbientSource: AudioScheduledSourceNode | null = null;
  private currentAmbientGain: GainNode | null = null;
  private ambientElement: HTMLAudioElement | null = null;
  private isAmbientSynthesized = false;
  private volume = 1.0;

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

  // Musique de fond (ambient) dynamique
  public playAmbientMusic(url?: string) {
    this.initCtx();
    this.stopAmbientMusic();

    if (url) {
      // Charger la musique depuis l'URL
      this.isAmbientSynthesized = false;
      this.ambientElement = new Audio(url);
      this.ambientElement.loop = true;
      this.ambientElement.volume = 0.25 * this.volume;
      this.ambientElement.play().catch((err) => {
        console.warn("L'autoplay de la musique d'ambiance a été bloqué par le navigateur:", err);
      });
    } else {
      // Si aucune URL, on synthétise un bruit d'ambiance ultra-doux (PS5 Pad)
      if (!this.ctx) return;
      this.isAmbientSynthesized = true;
      
      const now = this.ctx.currentTime;
      this.currentAmbientGain = this.ctx.createGain();
      this.currentAmbientGain.gain.setValueAtTime(0, now);
      this.currentAmbientGain.gain.linearRampToValueAtTime(0.08 * this.volume, now + 2.0); // fade in
      
      // Filtre passe-bas très bas pour rendre le son étouffé et ambient
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 250;

      this.currentAmbientGain.connect(filter);
      filter.connect(this.ctx.destination);

      // Création de 2 oscillateurs lents désaccordés pour un effet de pad
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = 65.41; // C2

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = 65.75; // C2 légèrement désaccordé (+9 cents)

      osc1.connect(this.currentAmbientGain);
      osc2.connect(this.currentAmbientGain);

      osc1.start(now);
      osc2.start(now);

      // On garde une référence pour pouvoir les stopper
      this.currentAmbientSource = osc1; // Hack pour conserver une référence à stopper
      // On wrap le stop dans une fonction personnalisée
      const self = this;
      (this.currentAmbientSource as any).stopCustom = () => {
        try {
          osc1.stop();
          osc2.stop();
        } catch (e) {}
      };
    }
  }

  public stopAmbientMusic() {
    // Arrêter l'élément audio s'il existe
    if (this.ambientElement) {
      this.ambientElement.pause();
      this.ambientElement = null;
    }

    // Arrêter le synthétiseur d'ambiance
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
          try { source.stop(); } catch(e) {}
        }
      }, 500);
      this.currentAmbientSource = null;
      this.currentAmbientGain = null;
    }
  }

  public setVolume(level: number) {
    this.volume = Math.max(0, Math.min(1, level));
    if (this.ambientElement) {
      this.ambientElement.volume = this.volume * 0.25;
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
