// ---- Avatar Piece Categories ----
export type AvatarGender = 'male' | 'female';

export type AvatarPieceCategory =
  | 'body'
  | 'hair'
  | 'top'
  | 'bottom'
  | 'shoes'
  | 'accessory';

// ---- Avatar Configuration (stored per user) ----
export interface AvatarConfig {
  user_id: string;
  gender: AvatarGender;
  body: string;         // e.g. 'body_m'
  hair: string;         // e.g. 'hair_m_1'
  hair_color: string;   // hex
  top: string;          // e.g. 'top_m_1'
  top_color: string;    // hex
  bottom: string;       // e.g. 'bottom_m_1'
  bottom_color: string; // hex
  shoes: string;        // e.g. 'shoes_1'
  shoes_color: string;  // hex
  accessories: string[]; // e.g. ['acc_glasses_clear', 'acc_hat_cap']
  skin_tone: string;    // hex
}

// ---- Asset Catalog Entry (managed by admins) ----
export interface AssetCatalogEntry {
  id: string;
  asset_key: string;       // unique key, e.g. 'hair_m_1'
  category: AvatarPieceCategory;
  gender: AvatarGender | 'unisex';
  display_name: string;
  sprite_url: string;      // URL to the spritesheet PNG
  thumbnail_url?: string;
  sort_order: number;
  is_active: boolean;
}

// ---- Layer rendering order for the compositor ----
export const AVATAR_LAYER_ORDER = [
  'body',
  'shoes',
  'bottom',
  'top',
  'accessory_necklace',
  'accessory_mask',
  'accessory_gloves',
  'hair',
  'accessory_glasses',
  'accessory_hat',
] as const;

// ---- Defaults ----
export const DEFAULT_AVATAR_CONFIG: Omit<AvatarConfig, 'user_id'> = {
  gender: 'male',
  body: 'body_m',
  hair: 'hair_m_1',
  hair_color: '#3a2000',
  top: 'top_m_1',
  top_color: '#6c63ff',
  bottom: 'bottom_m_1',
  bottom_color: '#333333',
  shoes: 'shoes_1',
  shoes_color: '#222222',
  accessories: [],
  skin_tone: '#fddbb4',
};

// ---- Existing Interfaces ----

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_color: string;
  role?: 'user' | 'admin' | 'superadmin';
  avatar_configured?: boolean;
  created_at?: string;
}

export interface AvatarPosition {
  id?: string;
  user_id: string;
  room_id: string;
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
  updated_at?: string;
  name?: string;
  avatar_color?: string;
  avatar_config?: AvatarConfig;
}

export interface ChatMessage {
  id?: string;
  user_id: string;
  room_id: string;
  content: string;
  x: number;
  y: number;
  created_at?: string;
  name?: string;
}

export interface Workspace {
  id: string;
  name: string;
  pin_code?: string;
  admin_id: string;
  created_at?: string;
}
