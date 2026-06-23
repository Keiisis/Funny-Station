export type GameLanguage = 'js' | 'wasm' | 'python' | 'lua' | 'java' | 'gba' | 'psp' | 'android';
export type TrophyTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type AccountType = 'gamer' | 'creator';
export type GameStatus = 'draft' | 'published';

export interface GameManifest {
  dependencies?: string[];
  maxMemoryMb?: number;
  python_libs?: string[];
  screen_ratio?: string;
}

/**
 * Profile — reflète exactement la table public.profiles (source de vérité Supabase).
 * L'identité de connexion (email réel ou synthétique) vit dans auth.users.
 */
export interface Profile {
  id: string;                 // = auth.users.id
  username: string;
  avatar_url?: string;
  account_type: AccountType;
  funny_coins: number;
  recovery_email?: string | null;
  has_recovery: boolean;      // un email de récupération est-il rattaché ?
  online_status: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * ProfileData — vue applicative enrichie utilisée par le shell (profil + jeux possédés).
 * `ownedGames` provient désormais d'un JOIN sur `purchases`, plus du localStorage.
 */
export interface ProfileData {
  id: string;
  username: string;
  avatar: string;             // avatar_url résolu (Storage ou preset)
  funnyCoins: number;
  accountType: AccountType;
  ownedGames: string[];       // ids des jeux possédés (table purchases)
  hasRecovery: boolean;
  recoveryEmail?: string | null;
}

export interface Game {
  id: string;
  title: string;
  slug: string;
  description?: string;
  runtime: GameLanguage;
  entry_point: string;
  assets_bucket_path: string;
  background_url?: string;
  video_url?: string;         // trailer/cinématique en boucle
  ambient_music_url?: string;
  price: number;              // en FunnyCoins (0 = gratuit)
  manifest: GameManifest;
  author_id?: string | null;
  status: GameStatus;
  play_count: number;
  rating: number;
  rating_count: number;
  created_at: string;
}

export interface Purchase {
  user_id: string;
  game_id: string;
  price_paid: number;
  purchased_at: string;
}

export interface GameSave {
  id: string;
  user_id: string;
  game_id: string;
  slot_name: string;
  save_data: Record<string, unknown>; // JSONB — fichiers VFS sérialisés
  checksum?: string | null;
  updated_at: string;
}

export interface Trophy {
  id: string;
  game_id: string;
  trophy_key: string;       // clé stable utilisée par le code des jeux
  name: string;
  description: string;
  icon_url?: string;
  tier: TrophyTier;
  coin_reward: number;
  hidden?: boolean;
  created_at: string;
}

export interface UserTrophy {
  user_id: string;
  trophy_id: string;
  unlocked_at: string;
}

export type GamepadDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'CONFIRM' | 'BACK' | 'OPTION' | 'TRIANGLE' | 'SQUARE';

// === ONLINE MULTIPLAYER TYPES ===

export interface OnlineRoom {
  roomCode: string;
  hostId: string;
  gameId: string;
  players: OnlinePlayer[];
  status: 'waiting' | 'playing' | 'finished';
}

export interface OnlinePlayer {
  userId: string;
  username: string;
  playerNumber: number;
  isHost: boolean;
}

export interface GameState {
  players: { x: number; y: number; alive: boolean; score: number; color: string; label: string }[];
  obstacles: { x: number; y: number; size: number; speed: number; color: string }[];
  gameOver: boolean;
  frame: number;
  canvasWidth: number;
  canvasHeight: number;
}

export type NetworkMode = 'local' | 'host' | 'client';

declare global {
  interface WindowEventMap {
    'funny_gamepad_action': CustomEvent<{ direction: GamepadDirection; playerNumber?: number; userId?: string }>;
  }
}
