export type GameLanguage = 'js' | 'wasm' | 'python' | 'lua' | 'java' | 'gba' | 'psp' | 'android' | 'nes' | 'snes';
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

// === SOCIAL FEATURES TYPES ===

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';
export type NotificationType = 'friend_request' | 'friend_accepted' | 'room_invite' | 'trophy_unlocked' | 'new_game' | 'message' | 'daily_reward' | 'level_up' | 'season_reward';
export type LeaderboardPeriod = 'weekly' | 'monthly' | 'alltime';
export type ChatChannelType = 'room' | 'private' | 'global';
export type SeasonStatusType = 'active' | 'ended' | 'upcoming';
export type ScreenshotType = 'screenshot' | 'clip';

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
}

export interface FriendWithProfile {
  friendship_id: string;
  friend_id: string;
  username: string;
  avatar_url?: string;
  online_status: boolean;
  current_game_title?: string | null;
  level?: number;
  title?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  game_id: string;
  score: number;
  period: LeaderboardPeriod;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined fields
  username?: string;
  avatar_url?: string;
  rank?: number;
}

export interface GameTag {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon?: string | null;
}

export interface DailyRewardStatus {
  already_claimed: boolean;
  streak: number;
  reward: number;
}

export interface PlayerLevel {
  user_id: string;
  xp: number;
  level: number;
  title: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  channel_type: ChatChannelType;
  channel_id: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined
  sender_username?: string;
  sender_avatar?: string;
}

export interface Season {
  id: string;
  name: string;
  description?: string | null;
  status: SeasonStatusType;
  starts_at: string;
  ends_at: string;
  created_at: string;
}

export interface SeasonReward {
  id: string;
  season_id: string;
  tier: number;
  name: string;
  description?: string | null;
  reward_type: string;
  reward_value: number;
  icon_url?: string | null;
  is_premium: boolean;
}

export interface SeasonProgress {
  user_id: string;
  season_id: string;
  xp: number;
  tier_reached: number;
  is_premium: boolean;
  claimed_rewards: string[];
}

export interface Screenshot {
  id: string;
  user_id: string;
  game_id?: string | null;
  type: ScreenshotType;
  url: string;
  thumbnail_url?: string | null;
  caption?: string | null;
  created_at: string;
  // Joined
  game_title?: string;
}

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  is_public: boolean;
  created_at: string;
  track_count?: number;
}

export interface PlaylistTrack {
  id: string;
  playlist_id: string;
  title: string;
  artist?: string | null;
  url: string;
  duration?: number | null;
  position: number;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  locale: string;
  theme: string;
  accent_color: string;
  wallpaper_url?: string | null;
  layout_mode: string;
  reduce_motion: boolean;
  colorblind: boolean;
  updated_at: string;
}

declare global {
  interface WindowEventMap {
    'funny_gamepad_action': CustomEvent<{ direction: GamepadDirection; playerNumber?: number; userId?: string }>;
  }
}
