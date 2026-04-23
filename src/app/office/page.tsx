'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile, ChatMessage, AvatarPosition } from '@/lib/types';
import HUD from '@/components/HUD';
import ChatPanel from '@/components/ChatPanel';
import ProfileModal from '@/components/ProfileModal';

// Dynamically import Phaser game (client-only)
const PhaserGame = dynamic(() => import('@/components/PhaserGame'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', fontFamily: 'var(--font-pixel)', fontSize: '0.6rem',
      color: 'rgba(255,255,255,0.5)', flexDirection: 'column', gap: '1rem',
    }}>
      <div style={{ fontSize: '2rem', animation: 'float 2s ease-in-out infinite' }}>🕹️</div>
      <div>Cargando oficina...</div>
    </div>
  ),
});

const DEFAULT_COLORS = ['#6c63ff', '#ff6584', '#f9a826', '#43b97f', '#00b4d8'];

function getRandomColor() {
  return DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
}

function buildProfileFromSession(user: any): UserProfile {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('pixelvibe_profile') : null;
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed.id === user.id) return parsed;
  }
  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Pixel User',
    avatar_color: getRandomColor(),
  };
}

export default function OfficePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineCount, setOnlineCount] = useState(1);
  const [showProfile, setShowProfile] = useState(false);
  const [localPosition, setLocalPosition] = useState({ x: 8, y: 8 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const positionRef = useRef({ x: 8, y: 8 });

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/');
        return;
      }

      const p = buildProfileFromSession(session.user);
      localStorage.setItem('pixelvibe_profile', JSON.stringify(p));

      // Upsert user in DB
      await supabase.from('users').upsert({
        id: p.id,
        email: p.email,
        name: p.name,
        avatar_color: p.avatar_color,
        created_at: new Date().toISOString(),
      });

      // Load recent messages
      const { data: recentMsgs } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', 'main')
        .order('created_at', { ascending: false })
        .limit(50);

      if (recentMsgs) {
        setMessages(recentMsgs.reverse());
      }

      // Count online (avatar_positions updated in last 30s)
      const { count } = await supabase
        .from('avatar_positions')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', 'main')
        .gte('updated_at', new Date(Date.now() - 30000).toISOString());

      setOnlineCount(Math.max(1, count || 1));
      setProfile(p);
      setLoading(false);
    };

    init();
  }, [router, supabase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (profile) {
        supabase.from('avatar_positions').delete()
          .eq('user_id', profile.id).eq('room_id', 'main');
      }
    };
  }, [profile, supabase]);

  const handlePositionUpdate = useCallback((x: number, y: number, direction: string) => {
    positionRef.current = { x, y };
    setLocalPosition({ x, y });
  }, []);

  const handleChatMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      // Evitar duplicados por si acaso
      if (prev.some((m) => m.id === msg.id && msg.id)) return prev;
      return [...prev.slice(-49), msg];
    });
  }, []);

  const handleProfileSave = (updated: UserProfile) => {
    setProfile(updated);
  };

  if (loading || !profile) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-deep)', flexDirection: 'column', gap: '1rem',
      }}>
        <div style={{ fontSize: '2.5rem' }}>🎮</div>
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>
          Iniciando sesión...
        </div>
      </div>
    );
  }

  return (
    <div className="office-layout">
      <div className="office-canvas">
        {/* Phaser Canvas */}
        <PhaserGame
          profile={profile}
          onChatMessage={handleChatMessage}
        />

        {/* HUD Overlay */}
        <HUD
          profile={profile}
          onlineCount={onlineCount}
          onOpenProfile={() => setShowProfile(true)}
        />

        {/* Chat Panel */}
        <ChatPanel
          profile={profile}
          messages={messages}
          localPosition={localPosition}
        />
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <ProfileModal
          profile={profile}
          onClose={() => setShowProfile(false)}
          onSave={handleProfileSave}
        />
      )}
    </div>
  );
}
