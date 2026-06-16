import { GamepadDirection } from '@/types';

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

  // Configuration des seuils (Deadzone) pour les sticks analogiques
  private axisThreshold = 0.5;
  private axisCooldowns: Map<number, { [key: string]: boolean }> = new Map();

  private constructor() {
    this.initListeners();
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

  // Boucle de mise à jour des entrées
  private pollGamepad = () => {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp) continue;

      const prev = this.prevStates.get(gp.index);
      const cooldowns = this.axisCooldowns.get(gp.index);
      if (!prev || !cooldowns) continue;

      // Lecture des boutons principaux
      const current = gp.buttons.map(b => b.pressed);

      // Détection des transitions montantes (appui instantané)
      if (current[12] && !prev[12]) this.dispatchAction('UP');
      if (current[13] && !prev[13]) this.dispatchAction('DOWN');
      if (current[14] && !prev[14]) this.dispatchAction('LEFT');
      if (current[15] && !prev[15]) this.dispatchAction('RIGHT');

      // Bouton A / Croix (PS) -> 0
      if (current[0] && !prev[0]) this.dispatchAction('CONFIRM');
      // Bouton B / Rond (PS) -> 1
      if (current[1] && !prev[1]) this.dispatchAction('BACK');
      // Bouton Options (PS) -> 9
      if (current[9] && !prev[9]) this.dispatchAction('OPTION');

      // Détection sur les sticks analogiques (Gauche)
      const leftStickX = gp.axes[0];
      const leftStickY = gp.axes[1];

      // Gérer la deadzone et la transition de direction pour le stick
      this.handleStickDirection(leftStickX, 'LEFT', 'RIGHT', cooldowns);
      this.handleStickDirection(leftStickY, 'UP', 'DOWN', cooldowns);

      this.prevStates.set(gp.index, current);
    }

    this.animationFrameId = requestAnimationFrame(this.pollGamepad);
  };

  private handleStickDirection(
    val: number,
    negDir: GamepadDirection,
    posDir: GamepadDirection,
    cooldowns: { [key: string]: boolean }
  ) {
    if (val < -this.axisThreshold) {
      if (!cooldowns[negDir]) {
        this.dispatchAction(negDir);
        cooldowns[negDir] = true;
      }
    } else {
      cooldowns[negDir] = false;
    }

    if (val > this.axisThreshold) {
      if (!cooldowns[posDir]) {
        this.dispatchAction(posDir);
        cooldowns[posDir] = true;
      }
    } else {
      cooldowns[posDir] = false;
    }
  }

  private dispatchAction(direction: GamepadDirection) {
    if (typeof window === 'undefined') return;
    const event = new CustomEvent('funny_gamepad_action', { detail: { direction } });
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
