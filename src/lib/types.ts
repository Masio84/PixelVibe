export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_color: string;
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
