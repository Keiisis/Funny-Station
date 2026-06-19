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
