import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL && typeof window !== 'undefined') {
  console.warn('[PixelVibe] NEXT_PUBLIC_SUPABASE_URL no está configurada. Configura .env.local con tus credenciales de Supabase.');
}

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
