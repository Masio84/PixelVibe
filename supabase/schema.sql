-- ============================================================
-- PixelVibe — Supabase Schema
-- Ejecuta esto en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- 1. Tabla users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Pixel User',
  avatar_color TEXT NOT NULL DEFAULT '#6c63ff',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can upsert own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 2. Tabla avatar_positions
CREATE TABLE IF NOT EXISTS public.avatar_positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL DEFAULT 'main',
  x FLOAT NOT NULL DEFAULT 8,
  y FLOAT NOT NULL DEFAULT 8,
  direction TEXT NOT NULL DEFAULT 'down',
  name TEXT,
  avatar_color TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, room_id)
);

ALTER TABLE public.avatar_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read positions" ON public.avatar_positions
  FOR SELECT USING (true);

CREATE POLICY "Users can upsert own position" ON public.avatar_positions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own position" ON public.avatar_positions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own position" ON public.avatar_positions
  FOR DELETE USING (auth.uid() = user_id);

-- Index for realtime queries
CREATE INDEX IF NOT EXISTS idx_avatar_positions_room ON public.avatar_positions(room_id);
CREATE INDEX IF NOT EXISTS idx_avatar_positions_updated ON public.avatar_positions(updated_at);

-- 3. Tabla messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL DEFAULT 'main',
  content TEXT NOT NULL,
  x FLOAT DEFAULT 8,
  y FLOAT DEFAULT 8,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read messages" ON public.messages
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for realtime queries
CREATE INDEX IF NOT EXISTS idx_messages_room ON public.messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);

-- ============================================================
-- 4. Tabla avatar_config (configuración del avatar compositor)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.avatar_config (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gender TEXT NOT NULL DEFAULT 'male',
  body TEXT NOT NULL DEFAULT 'body_m',
  hair TEXT NOT NULL DEFAULT 'hair_m_1',
  hair_color TEXT DEFAULT '#3a2000',
  top TEXT NOT NULL DEFAULT 'top_m_1',
  top_color TEXT DEFAULT '#6c63ff',
  bottom TEXT NOT NULL DEFAULT 'bottom_m_1',
  bottom_color TEXT DEFAULT '#333333',
  shoes TEXT NOT NULL DEFAULT 'shoes_1',
  shoes_color TEXT DEFAULT '#222222',
  accessories TEXT[] DEFAULT '{}',
  skin_tone TEXT DEFAULT '#fddbb4',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.avatar_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read avatar configs" ON public.avatar_config
  FOR SELECT USING (true);

CREATE POLICY "Users can upsert own config" ON public.avatar_config
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own config" ON public.avatar_config
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- 5. Tabla asset_catalog (catálogo de piezas para admins)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.asset_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_key TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  gender TEXT DEFAULT 'unisex',
  display_name TEXT NOT NULL,
  sprite_url TEXT NOT NULL,
  thumbnail_url TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.asset_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active assets" ON public.asset_catalog
  FOR SELECT USING (is_active = true);

-- Admin-only write policies (requires role column in users table)
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
-- CREATE POLICY "Admins manage assets" ON public.asset_catalog
--   FOR ALL USING (
--     auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
--   );

-- ============================================================
-- 6. Habilitar Realtime en las tablas
-- (Ejecuta esto DESPUÉS de crear las tablas)
-- ============================================================

-- En Supabase Dashboard > Database > Replication:
-- Añade las tablas: avatar_positions, messages

-- O usa SQL:
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.avatar_positions, 
    public.messages;
COMMIT;

-- ============================================================
-- 5. Google OAuth Setup en Supabase Dashboard:
-- Authentication > Providers > Google
-- - Client ID y Client Secret desde Google Cloud Console
-- - Redirect URL: https://[tu-proyecto].supabase.co/auth/v1/callback
-- ============================================================
