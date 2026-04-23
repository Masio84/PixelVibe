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
-- 4. Habilitar Realtime en las tablas
-- (Ejecuta esto DESPUÉS de crear las tablas)
-- ============================================================

-- En Supabase Dashboard > Database > Replication:
-- Añade las tablas: avatar_positions, messages

-- O usa SQL:
BEGIN;
  -- avatar_positions realtime
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
