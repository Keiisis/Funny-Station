import { GamepadDirection } from '@/types';
import { KeyMapping, loadKeyMapping, ConsoleAction } from '@/utils/inputMapping';

// Types WebHID pour le compilateur TypeScript
export interface HIDDevice {
  open(): Promise<void>;
  close(): Promise<void>;
  sendReport(reportId: number, data: BufferSource): Promise<void>;
  opened: boolean;
}

// Extension globale pour navigator.hid
declare global {
  interface Navigator {
    hid?: {
      requestDevice(options: {
        filters: { vendorId: number; productId: number }[];
      }): Promise<HIDDevice[]>;
    };
  }
}

export class GamepadController {
  private static instance: GamepadController;
  private animationFrameId: number | null = null;
  private prevStates: Map<number, boolean[]> = new Map();
  private dualSenseDevice: HIDDevice | null = null;
  
  private _paused = false;
  private _keyboardInjectionEnabled = false;
  private mapping = loadKeyMapping();
  private stickStates: Map<number, Record<string, boolean>> = new Map();

  // Configuration des seuils (Deadzone) pour les sticks analogiques
  private axisThreshold = 0.5;
  private axisCooldowns: Map<number, { [key: string]: boolean }> = new Map();

  private constructor() {
    this.initListeners();
    if (typeof window !== 'undefined') {
      window.addEventListener('funny_station_mapping_changed', (e: any) => {
        this.mapping = e.detail;
      });
    }
  }

  public static getInstance(): GamepadController {
    if (!GamepadController.instance) {
      GamepadController.instance = new GamepadController();
    }
    return GamepadController.instance;
  }

  private initListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('gamepadconnected', (e) => {
      console.log(`Manette connectée au port ${e.gamepad.index}: ${e.gamepad.id}`);
      this.prevStates.set(e.gamepad.index, Array(e.gamepad.buttons.length).fill(false));
      this.axisCooldowns.set(e.gamepad.index, { LEFT: false, RIGHT: false, UP: false, DOWN: false });
      
      // Tenter de négocier l'accès HID si c'est une DualSense officielle
      if (e.gamepad.id.toLowerCase().includes('wireless controller') || e.gamepad.id.toLowerCase().includes('dualsense')) {
        console.log("DualSense détectée, prête pour l'haptique avancée via WebHID.");
      }

      if (!this.animationFrameId) {
        this.pollGamepad();
      }
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      this.prevStates.delete(e.gamepad.index);
      this.axisCooldowns.delete(e.gamepad.index);
      this.stickStates.delete(e.gamepad.index);
      if (this.prevStates.size === 0 && this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    });
  }

  // Demande l'autorisation d'accéder au HID de la DualSense
  public async requestDualSenseAccess(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.hid) {
      console.warn("L'API WebHID n'est pas supportée sur ce navigateur.");
      return false;
    }

    try {
      const devices = await navigator.hid.requestDevice({
        filters: [
          { vendorId: 0x054c, productId: 0x0ce6 }, // DualSense PS5 USB
          { vendorId: 0x054c, productId: 0x0df2 }  // DualSense PS5 Bluetooth
        ]
      });

      if (devices.length > 0) {
        this.dualSenseDevice = devices[0];
        await this.dualSenseDevice.open();
        console.log("Connexion HID DualSense établie avec succès !");
        
        // Jouer un effet d'accueil haptique
        await this.triggerDualSenseHaptics(150, 200, 100);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Erreur de connexion WebHID DualSense:", err);
      return false;
    }
  }

  /**
   * Met en pause la navigation gamepad dans les menus de la Funny Station.
   */
  public pause() {
    this._paused = true;
    console.log('[GamepadController] Polling navigation en pause (jeu embarqué actif)');
  }

  /**
   * Reprend la navigation gamepad dans les menus de la Funny Station.
   */
  public resume() {
    this._paused = false;
    console.log('[GamepadController] Polling navigation repris');
  }

  public get paused() { return this._paused; }

  /**
   * Active ou désactive la conversion des touches manette physique en KeyboardEvents.
   */
  public enableKeyboardInjection(enabled: boolean) {
    this._keyboardInjectionEnabled = enabled;
    console.log('[GamepadController] Mode injection clavier:', enabled);
  }

  public get keyboardInjectionEnabled() { return this._keyboardInjectionEnabled; }

  // Boucle de mise à jour des entrées
  private pollGamepad = () => {
    // Si en pause ET que l'injection clavier n'est pas activée,
    // on continue la boucle rAF mais sans lire le gamepad pour économiser le CPU
    if (this._paused && !this._keyboardInjectionEnabled) {
      this.animationFrameId = requestAnimationFrame(this.pollGamepad);
      return;
    }

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp) continue;

      const prev = this.prevStates.get(gp.index);
      const cooldowns = this.axisCooldowns.get(gp.index);
      if (!prev || !cooldowns) continue;

      // Lecture des boutons principaux
      const current = gp.buttons.map(b => b.pressed);

      // --- 1. TRADUCTION DES BOUTONS DE LA MANETTE ---
      const BUTTON_MAP: Record<number, ConsoleAction> = {
        12: 'UP',
        13: 'DOWN',
        14: 'LEFT',
        15: 'RIGHT',
        0: 'A',
        1: 'B',
        2: 'X',
        3: 'Y',
        4: 'L',
        5: 'R',
        8: 'SELECT',
        9: 'START',
      };

      for (const [btnIdxStr, action] of Object.entries(BUTTON_MAP)) {
        const btnIdx = parseInt(btnIdxStr, 10);
        if (btnIdx >= current.length) continue;

        const isPressed = current[btnIdx];
        const wasPressed = prev[btnIdx];

        if (isPressed !== wasPressed) {
          const state = isPressed ? 'down' : 'up';

          // A. Dispatcher funny_gamepad_action pour la navigation UI
          if (!this._paused && isPressed) {
            let dir: GamepadDirection | null = null;
            if (action === 'UP') dir = 'UP';
            else if (action === 'DOWN') dir = 'DOWN';
            else if (action === 'LEFT') dir = 'LEFT';
            else if (action === 'RIGHT') dir = 'RIGHT';
            else if (action === 'A') dir = 'CONFIRM';
            else if (action === 'B') dir = 'BACK';
            else if (action === 'START') dir = 'OPTION';
            else if (action === 'X') dir = 'SQUARE';
            else if (action === 'Y') dir = 'TRIANGLE';

            if (dir) {
              this.dispatchAction(dir, gp.index);
            }
          }

          // B. Injecter des événements clavier standard dans le jeu
          if (this._keyboardInjectionEnabled) {
            const key = this.mapping[action];
            if (key) {
              this.dispatchKeyboardEvent(key, state);
            }
          }
        }
      }

      // --- 2. TRADUCTION DU STICK GAUCHE (Émulation Clavier continue) ---
      if (this._keyboardInjectionEnabled) {
        const leftStickX = gp.axes[0];
        const leftStickY = gp.axes[1];
        
        let states = this.stickStates.get(gp.index);
        if (!states) {
          states = { UP: false, DOWN: false, LEFT: false, RIGHT: false };
          this.stickStates.set(gp.index, states);
        }

        // Axe Horizontal (Gauche / Droite)
        if (leftStickX < -this.axisThreshold) {
          if (!states.LEFT) {
            states.LEFT = true;
            this.dispatchKeyboardEvent(this.mapping.LEFT, 'down');
          }
          if (states.RIGHT) {
            states.RIGHT = false;
            this.dispatchKeyboardEvent(this.mapping.RIGHT, 'up');
          }
        } else if (leftStickX > this.axisThreshold) {
          if (!states.RIGHT) {
            states.RIGHT = true;
            this.dispatchKeyboardEvent(this.mapping.RIGHT, 'down');
          }
          if (states.LEFT) {
            states.LEFT = false;
            this.dispatchKeyboardEvent(this.mapping.LEFT, 'up');
          }
        } else {
          if (states.LEFT) {
            states.LEFT = false;
            this.dispatchKeyboardEvent(this.mapping.LEFT, 'up');
          }
          if (states.RIGHT) {
            states.RIGHT = false;
            this.dispatchKeyboardEvent(this.mapping.RIGHT, 'up');
          }
        }

        // Axe Vertical (Haut / Bas)
        if (leftStickY < -this.axisThreshold) {
          if (!states.UP) {
            states.UP = true;
            this.dispatchKeyboardEvent(this.mapping.UP, 'down');
          }
          if (states.DOWN) {
            states.DOWN = false;
            this.dispatchKeyboardEvent(this.mapping.DOWN, 'up');
          }
        } else if (leftStickY > this.axisThreshold) {
          if (!states.DOWN) {
            states.DOWN = true;
            this.dispatchKeyboardEvent(this.mapping.DOWN, 'down');
          }
          if (states.UP) {
            states.UP = false;
            this.dispatchKeyboardEvent(this.mapping.UP, 'up');
          }
        } else {
          if (states.UP) {
            states.UP = false;
            this.dispatchKeyboardEvent(this.mapping.UP, 'up');
          }
          if (states.DOWN) {
            states.DOWN = false;
            this.dispatchKeyboardEvent(this.mapping.DOWN, 'up');
          }
        }
      }

      this.prevStates.set(gp.index, current);
    }

    this.animationFrameId = requestAnimationFrame(this.pollGamepad);
  };

  private dispatchKeyboardEvent(keyName: string, action: 'down' | 'up') {
    if (typeof window === 'undefined') return;

    // Cible l'élément actif du document parent
    const targets: EventTarget[] = [window.document.activeElement || window.document, window];
    
    // Propage dans tous les iframes enfants same-origin
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      try {
        const iframeWindow = iframe.contentWindow;
        if (iframeWindow) {
          const iframeTarget = iframeWindow.document.activeElement || iframeWindow.document;
          targets.push(iframeTarget);
          targets.push(iframeWindow);
        }
      } catch (e) {
        // Ignorer les erreurs d'origines différentes
      }
    });

    targets.forEach(target => {
      try {
        const eventType = action === 'down' ? 'keydown' : 'keyup';
        const event = new KeyboardEvent(eventType, {
          key: keyName,
          bubbles: true,
          cancelable: true,
          code: keyName,
        });
        target.dispatchEvent(event);
      } catch (e) {
        // Ignorer
      }
    });
  }

  private dispatchAction(direction: GamepadDirection, playerNumber: number) {
    if (typeof window === 'undefined') return;
    const event = new CustomEvent('funny_gamepad_action', { detail: { direction, playerNumber } });
    window.dispatchEvent(event);
  }

  // Contrôle du retour haptique
  public async triggerDualSenseHaptics(leftMotorFreq: number, rightMotorFreq: number, durationMs: number) {
    // 1. Tenter d'utiliser l'effet standard du navigateur (Fallback manette classique)
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gamepads) {
      if (gp && gp.vibrationActuator && gp.vibrationActuator.playEffect) {
        try {
          gp.vibrationActuator.playEffect('dual-rumble', {
            startDelay: 0,
            duration: durationMs,
            weakMagnitude: rightMotorFreq / 255,
            strongMagnitude: leftMotorFreq / 255
          });
          return;
        } catch (e) {
          console.warn("Le moteur de vibration standard a échoué:", e);
        }
      }
    }

    // 2. Si WebHID DualSense est activé et supporté, envoyer un rapport de sortie USB (0x02)
    if (this.dualSenseDevice && this.dualSenseDevice.opened) {
      const reportId = 0x02; // Rapport basique d'haptique
      const data = new Uint8Array(47);
      
      data[0] = 0xFF; // Masque d'activation des moteurs
      data[1] = 0xF7;
      data[2] = leftMotorFreq;  // Force du moteur gauche (Vibration faible fréquence / Lourdes)
      data[3] = rightMotorFreq; // Force du moteur droit (Vibration haute fréquence / Légères)

      try {
        await this.dualSenseDevice.sendReport(reportId, data);
        
        // Stopper le moteur après la durée demandée
        setTimeout(async () => {
          if (this.dualSenseDevice && this.dualSenseDevice.opened) {
            data[2] = 0x00;
            data[3] = 0x00;
            await this.dualSenseDevice.sendReport(reportId, data);
          }
        }, durationMs);
      } catch (err) {
        console.error("Échec d'envoi du paquet haptique DualSense HID:", err);
      }
    }
  }
}
