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

export interface Game {
  id: string;
  title: string;
  slug: string;
  description?: string;
  runtime: GameLanguage;
  entry_point: string;
  assets_bucket_path: string;
  background_url?: string;
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

declare global {
  interface WindowEventMap {
    'funny_gamepad_action': CustomEvent<{ direction: GamepadDirection }>;
  }
}
