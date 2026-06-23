export type ConsoleAction = 
  | 'UP'
  | 'DOWN'
  | 'LEFT'
  | 'RIGHT'
  | 'A'
  | 'B'
  | 'X'
  | 'Y'
  | 'L'
  | 'R'
  | 'START'
  | 'SELECT';

export type KeyMapping = Record<ConsoleAction, string>;

export const DEFAULT_KEY_MAPPING: KeyMapping = {
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  A: 'e',          // Confirm / Interact
  B: 'q',          // Cancel / Back
  X: ' ',          // Attack / Jump (Space)
  Y: 'f',          // Special / Weapon Switch
  L: 'l',          // Left shoulder / Special light
  R: 'r',          // Right shoulder / Reload
  START: 'Enter',  // Pause
  SELECT: 'Tab',   // Menu
};

const STORAGE_KEY = 'funny_station_custom_key_mapping';

/**
 * Loads the user's custom key mapping from localStorage, falling back to defaults.
 */
export function loadKeyMapping(): KeyMapping {
  if (typeof window === 'undefined') return DEFAULT_KEY_MAPPING;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old START: 'Escape' to 'Enter' to avoid clash with global exit key
      if (parsed.START === 'Escape') {
        parsed.START = 'Enter';
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } catch (e) {}
      }
      // Ensure all standard actions are present in the loaded mapping
      return { ...DEFAULT_KEY_MAPPING, ...parsed };
    }
  } catch (e) {
    console.error('[InputMapping] Failed to load key mapping:', e);
  }
  return DEFAULT_KEY_MAPPING;
}

/**
 * Saves a custom key mapping to localStorage.
 */
export function saveKeyMapping(mapping: KeyMapping): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));
    // Dispatch custom event to notify components that the mapping has changed
    window.dispatchEvent(new CustomEvent('funny_station_mapping_changed', { detail: mapping }));
  } catch (e) {
    console.error('[InputMapping] Failed to save key mapping:', e);
  }
}

/**
 * Convertit un nom de touche (ex: 'ArrowUp', 'e', ' ', 'Enter') en propriétés
 * complètes d'événement clavier : `code` (ex: 'KeyE', 'ArrowUp', 'Space') et
 * `keyCode` legacy (ex: 69, 38, 32).
 *
 * Indispensable pour les jeux **Unity WebGL** et beaucoup de moteurs HTML5 qui
 * lisent `event.keyCode` / `event.code` et IGNORENT `event.key`. Sans ça, un input
 * synthétique n'a que `key` et reste invisible pour ces jeux.
 */
export function keyEventInit(keyName: string): { key: string; code: string; keyCode: number } {
  let code = '';
  let keyCode = 0;

  if (keyName.length === 1) {
    const c = keyName.toLowerCase();
    if (c >= 'a' && c <= 'z') {
      code = 'Key' + c.toUpperCase();
      keyCode = c.toUpperCase().charCodeAt(0); // A=65 … Z=90
    } else if (c >= '0' && c <= '9') {
      code = 'Digit' + c;
      keyCode = c.charCodeAt(0); // '0'=48 … '9'=57
    } else if (keyName === ' ') {
      code = 'Space';
      keyCode = 32;
    } else {
      const sym: Record<string, [string, number]> = {
        '/': ['Slash', 191], '*': ['NumpadMultiply', 106], '-': ['Minus', 189],
        '+': ['Equal', 187], '.': ['Period', 190], ',': ['Comma', 188],
      };
      const s = sym[keyName];
      if (s) { code = s[0]; keyCode = s[1]; }
    }
  } else {
    const named: Record<string, [string, number]> = {
      ArrowUp: ['ArrowUp', 38], ArrowDown: ['ArrowDown', 40],
      ArrowLeft: ['ArrowLeft', 37], ArrowRight: ['ArrowRight', 39],
      Enter: ['Enter', 13], Tab: ['Tab', 9], Escape: ['Escape', 27],
      Backspace: ['Backspace', 8], Shift: ['ShiftLeft', 16],
      Control: ['ControlLeft', 17], Space: ['Space', 32],
    };
    const n = named[keyName];
    if (n) { code = n[0]; keyCode = n[1]; }
    else { code = keyName; }
  }

  return { key: keyName, code, keyCode };
}

/**
 * Crée un KeyboardEvent synthétique COMPLET (key + code + keyCode + which).
 * Le constructeur KeyboardEvent ignore `keyCode`/`which` dans le dictionnaire init,
 * donc on les force via Object.defineProperty (technique standard pour piloter
 * Unity WebGL et les moteurs HTML5 legacy depuis une manette virtuelle/physique).
 */
export function makeKeyboardEvent(type: 'keydown' | 'keyup', keyName: string): KeyboardEvent {
  const { key, code, keyCode } = keyEventInit(keyName);
  const ev = new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true });
  try {
    Object.defineProperty(ev, 'keyCode', { get: () => keyCode });
    Object.defineProperty(ev, 'which', { get: () => keyCode });
  } catch {
    /* certains navigateurs figent l'objet : on garde au moins key + code */
  }
  return ev;
}

/**
 * Human readable labels for the ConsoleActions.
 */
export const ACTION_LABELS: Record<ConsoleAction, string> = {
  UP: 'D-Pad Haut',
  DOWN: 'D-Pad Bas',
  LEFT: 'D-Pad Gauche',
  RIGHT: 'D-Pad Droite',
  A: 'Bouton A / Croix (✕)',
  B: 'Bouton B / Rond (◯)',
  X: 'Bouton X / Carré (■)',
  Y: 'Bouton Y / Triangle (▲)',
  L: 'Bouton L (L1)',
  R: 'Bouton R (R1)',
  START: 'Start / Options',
  SELECT: 'Select / Share',
};
