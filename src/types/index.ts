export type GameLanguage = 'js' | 'wasm' | 'python' | 'lua' | 'java';
export type TrophyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  funny_coins: number;
  online_status: boolean;
  current_lobby_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileData {
  id: string;
  username: string;
  avatar: string; // Unsplash image URL or preset URL
  funnyCoins: number;
  password?: string; // Optional password or PIN code
  accountType: 'gamer' | 'creator';
  ownedGames: string[]; // List of purchased game IDs
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
  video_url?: string; // Background trailer/cinematic loop
  price?: number; // Price in FunnyCoins (FC), e.g., 200. Free if undefined/0
  ambient_music_url?: string;
  manifest: {
    dependencies?: string[];
    maxMemoryMb?: number;
    python_libs?: string[];
    screen_ratio?: string;
  };
  author_id?: string;
  play_count: number;
  rating: number;
  created_at: string;
}

export interface GameSave {
  id: string;
  user_id: string;
  game_id: string;
  slot_name: string;
  save_data: string; // Base64 encoded or stringified JSON
  checksum: string;
  updated_at: string;
}

export interface Trophy {
  id: string;
  game_id: string;
  name: string;
  description: string;
  icon_url?: string;
  tier: TrophyTier;
  coin_reward: number;
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
