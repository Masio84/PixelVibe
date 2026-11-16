'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile } from '@/lib/types';
import { getURL } from '@/lib/utils';

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // ANTES el callback redirigía aquí con ?error=auth_failed pero nadie
    // leía ese parámetro: el usuario volvía al login sin saber qué pasó.
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error') === 'auth_failed') {
        setAuthError('No se pudo completar el inicio de sesión con Google. Inténtalo de nuevo.');
      }
    }
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.replace('/office');
      } else {
        setLoading(false);
      }
    });
  }, [router, supabase]);

  const handleGoogleLogin = async () => {
    setSigningIn(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${getURL()}auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) {
      console.error('Auth error:', error);
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="landing-bg">
        <div className="landing-stars" />
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>
          Cargando...
        </div>
      </div>
    );
  }

  return (
    <div className="landing-bg">
      <div className="landing-stars" />
      <div className="landing-card">
        <div className="landing-pixel-art">🏢</div>

        <h1 className="landing-pixel-title">PixelVibe</h1>
        <p className="landing-subtitle">
          Tu oficina virtual isométrica. Muévete, chatea y colabora<br />
          con tu equipo en tiempo real al estilo pixel art retro.
        </p>

        <div className="landing-features">
          <div className="landing-feature">
            <span className="landing-feature-icon">🗺️</span>
            <span>Mapa iso 16×16</span>
          </div>
          <div className="landing-feature">
            <span className="landing-feature-icon">🧑‍💻</span>
            <span>Avatares en vivo</span>
          </div>
          <div className="landing-feature">
            <span className="landing-feature-icon">💬</span>
            <span>Chat por cercanía</span>
          </div>
          <div className="landing-feature">
            <span className="landing-feature-icon">⚡</span>
            <span>Realtime</span>
          </div>
        </div>

        <button
          id="btn-google-login"
          className="btn-google"
          onClick={handleGoogleLogin}
          disabled={signingIn}
        >
          <span className="btn-google-icon">G</span>
          {signingIn ? 'Redirigiendo...' : 'Entrar con Google'}
        </button>

        {authError && (
          <p className="landing-error" role="alert">
            {authError}
          </p>
        )}

        <p className="landing-footer">
          Al entrar aceptas los términos de uso. Solo almacenamos tu nombre y email.
        </p>
      </div>
    </div>
  );
}
