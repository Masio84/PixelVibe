'use client';

import { useState, useEffect } from 'react';
import type { UserProfile, AvatarPosition } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

interface HUDProps {
  profile: UserProfile;
  users: AvatarPosition[];
  onOpenProfile: () => void;
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

export default function HUD({ profile, users, onOpenProfile }: HUDProps) {
  const duration = useOnlineDuration();
  const supabase = createClient();
  const onlineCount = users.length;

  const handleLogout = async () => {
    // Remove avatar position
    await supabase.from('avatar_positions').delete()
      .eq('user_id', profile.id).eq('room_id', 'main');
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="hud">
      {/* Top Left */}
      <div className="hud-tl">
        <div className="hud-logo">
          <span className="hud-logo-icon">🎮</span>
          <span className="hud-logo-text">PixelVibe</span>
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
        <button className="hud-btn hud-btn-profile" onClick={onOpenProfile}>
          👤 Perfil
        </button>
        <button className="hud-btn hud-btn-logout" onClick={handleLogout}>
          🚪 Salir
        </button>
      </div>
    </div>
  );
}
