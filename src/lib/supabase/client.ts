import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL && typeof window !== 'undefined') {
  console.warn('[PixelVibe] NEXT_PUBLIC_SUPABASE_URL no está configurada. Configura .env.local con tus credenciales de Supabase.');
}

// Singleton del cliente de navegador.
//
// ANTES: cada componente llamaba a createClient() dentro del render, por lo
// que cada render creaba una instancia distinta. Los useEffect que dependían
// de `supabase` se volvían a ejecutar en cada render (bucle de re-inicialización
// en /office y /office/[workspaceId]: re-fetch, re-suscripción a canales y
// borrado repetido de la posición del avatar). Con una única instancia
// compartida, esos efectos solo corren una vez.
let browserClient: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return browserClient;
}
