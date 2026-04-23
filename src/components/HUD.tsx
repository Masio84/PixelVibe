'use client';

import { useState, useEffect } from 'react';
import type { UserProfile, AvatarPosition } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

interface HUDProps {
  profile: UserProfile;
  workspaceId: string;
  workspaceName: string;
  users: AvatarPosition[];
  onOpenProfile: () => void;
  onOpenAdmin: () => void;
}

function useOnlineDuration() {
  const [start] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed(Date.now() - start), 60000);
    return () => clearInterval(interval);
  }, [start]);

  const mins = Math.floor(elapsed / 60000);
  if (mins < 1) return 'Recién conectado';
  if (mins === 1) return 'En línea hace 1 min';
  return `En línea hace ${mins} min`;
}

export default function HUD({ profile, workspaceId, workspaceName, users, onOpenProfile, onOpenAdmin }: HUDProps) {
  const duration = useOnlineDuration();
  const supabase = createClient();
  const onlineCount = users.length;

  const handleLogout = async () => {
    // Remove avatar position
    await supabase.from('avatar_positions').delete()
      .eq('user_id', profile.id).eq('room_id', workspaceId);
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="hud">
      {/* Top Left */}
      <div className="hud-tl">
        <div className="hud-logo">
          <span className="hud-logo-icon">🎮</span>
          <div className="hud-logo-stack">
            <span className="hud-logo-text">PixelVibe</span>
            <span className="hud-workspace-name">{workspaceName}</span>
          </div>
        </div>
        
        <div className="hud-users-list">
          {users.map((u) => (
            <div key={u.user_id} className="hud-user-info">
              <span 
                className="hud-avatar-dot" 
                style={{ background: u.avatar_color || '#6c63ff' }} 
              />
              <span className="hud-user-name">
                {u.name} {u.user_id === profile.id && '(Tú)'}
              </span>
              {u.user_id === profile.id && (
                <>
                  <span className="hud-separator">·</span>
                  <span className="hud-duration">{duration}</span>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="hud-online-count">
          <span className="hud-online-dot" />
          {onlineCount} {onlineCount === 1 ? 'persona' : 'personas'} en línea
        </div>
      </div>

      {/* Top Right */}
      <div className="hud-tr">
        {(profile.role === 'admin' || profile.role === 'superadmin') && (
          <button className="hud-btn hud-btn-admin" onClick={onOpenAdmin}>
            👑 Admin
          </button>
        )}
        <button className="hud-btn hud-btn-profile" onClick={onOpenProfile}>
          👤 Perfil
        </button>
        <button className="hud-btn hud-btn-logout" onClick={handleLogout}>
          🚪 Salir
        </button>
      </div>
      <style jsx>{`
        .hud {
          position: absolute;
          top: 0; left: 0; right: 0;
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          pointer-events: none;
          z-index: 100;
        }
        .hud > div { pointer-events: auto; }
        
        .hud-tl {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .hud-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(15, 15, 30, 0.8);
          padding: 0.5rem 1rem;
          border-radius: 12px;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .hud-logo-text { font-family: var(--font-pixel); font-size: 0.9rem; }
        .hud-logo-stack { display: flex; flex-direction: column; }
        .hud-workspace-name { 
          font-size: 0.6rem; 
          color: var(--accent2); 
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .hud-users-list {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          max-height: 200px;
          overflow-y: auto;
        }
        .hud-user-info {
          background: rgba(0,0,0,0.5);
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: fit-content;
        }
        .hud-avatar-dot { width: 8px; height: 8px; border-radius: 50%; }
        .hud-duration { color: #888; font-size: 0.65rem; }
        
        .hud-online-count {
          font-size: 0.7rem;
          color: #aaa;
          margin-left: 0.5rem;
        }

        .hud-tr {
          display: flex;
          gap: 0.5rem;
        }
        .hud-btn {
          background: rgba(108, 99, 255, 0.2);
          border: 1px solid rgba(108, 99, 255, 0.4);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          backdrop-filter: blur(4px);
          transition: all 0.2s;
        }
        .hud-btn:hover { background: rgba(108, 99, 255, 0.4); }
        .hud-btn-logout { background: rgba(255, 71, 87, 0.2); border-color: rgba(255, 71, 87, 0.4); }
        .hud-btn-logout:hover { background: rgba(255, 71, 87, 0.4); }

        @media (max-width: 600px) {
          .hud { padding: 0.5rem; }
          .hud-logo-text { display: none; }
          .hud-users-list { display: none; }
          .hud-btn { padding: 0.4rem 0.6rem; font-size: 0.8rem; }
        }
      `}</style>
    </div>
  );
}
