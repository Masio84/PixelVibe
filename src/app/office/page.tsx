'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Workspace, UserProfile } from '@/lib/types';

export default function OfficeLobbyPage() {
  const router = useRouter();
  const supabase = createClient();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [pinInput, setPinInput] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      // Fetch user profile to check role
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      setUserProfile(profile);

      // Fetch all workspaces
      const { data: ws } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });
      
      setWorkspaces(ws || []);
      setLoading(false);
    };

    init();
  }, [router, supabase]);

  const handleJoin = (ws: Workspace) => {
    if (ws.pin_code) {
      if (pinInput[ws.id] === ws.pin_code) {
        router.push(`/office/${ws.id}`);
      } else {
        setError(`NIP incorrecto para ${ws.name}`);
        setTimeout(() => setError(null), 3000);
      }
    } else {
      router.push(`/office/${ws.id}`);
    }
  };

  if (loading) {
    return (
      <div className="lobby-container">
        <div className="loading">Cargando salas de PixelVibe...</div>
      </div>
    );
  }

  return (
    <div className="lobby-container">
      <header className="lobby-header">
        <h1>PixelVibe Lobby 🏢</h1>
        <p>Selecciona un espacio de trabajo para unirte</p>
      </header>

      {error && <div className="error-toast">{error}</div>}

      <div className="workspace-grid">
        <div className="workspace-card public-ws">
          <div className="ws-icon">🌍</div>
          <h3>Oficina Pública</h3>
          <p>Entrada libre para todos</p>
          <button className="join-btn" onClick={() => router.push('/office/public-room')}>Entrar</button>
        </div>

        {workspaces.map((ws) => (
          <div key={ws.id} className="workspace-card">
            <div className="ws-icon">{ws.pin_code ? '🔒' : '🔓'}</div>
            <h3>{ws.name}</h3>
            {ws.pin_code ? (
              <div className="pin-entry">
                <input
                  type="password"
                  maxLength={4}
                  placeholder="PIN"
                  value={pinInput[ws.id] || ''}
                  onChange={(e) => setPinInput({ ...pinInput, [ws.id]: e.target.value.replace(/\D/g, '') })}
                />
                <button onClick={() => handleJoin(ws)}>Entrar</button>
              </div>
            ) : (
              <button className="join-btn" onClick={() => handleJoin(ws)}>Unirse</button>
            )}
          </div>
        ))}

        {userProfile?.role === 'admin' || userProfile?.role === 'superadmin' ? (
          <div className="workspace-card create-new" onClick={() => router.push('/admin/workspaces')}>
            <div className="ws-icon">➕</div>
            <h3>Crear nuevo grupo</h3>
            <p>Gestionar espacios</p>
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .lobby-container {
          min-height: 100vh;
          background: #0f0f1e;
          color: white;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          font-family: 'Inter', sans-serif;
        }
        .lobby-header {
          text-align: center;
          margin-bottom: 3rem;
        }
        .lobby-header h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #6c63ff, #ff6584);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .workspace-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 2rem;
          width: 100%;
          max-width: 1000px;
        }
        .workspace-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 2rem;
          text-align: center;
          transition: transform 0.3s, border-color 0.3s;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .workspace-card:hover {
          transform: translateY(-5px);
          border-color: #6c63ff;
        }
        .ws-icon {
          font-size: 3rem;
        }
        .join-btn, .pin-entry button {
          background: #6c63ff;
          color: white;
          border: none;
          padding: 0.8rem;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
        }
        .join-btn:hover, .pin-entry button:hover {
          background: #5a52d4;
        }
        .pin-entry {
          display: flex;
          gap: 0.5rem;
        }
        .pin-entry input {
          width: 60px;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          text-align: center;
          border-radius: 8px;
          outline: none;
        }
        .error-toast {
          background: #ff4757;
          color: white;
          padding: 0.8rem 2rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          animation: shake 0.5s;
        }
        .create-new {
          border: 2px dashed rgba(255,255,255,0.2);
          cursor: pointer;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
      `}</style>
    </div>
  );
}
