'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile, ChatMessage, AvatarPosition } from '@/lib/types';
import type { MapData } from '@/game/map';
import { DEFAULT_MAP_DATA } from '@/game/map';
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
  const [avatarConfig, setAvatarConfig] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<AvatarPosition[]>([]);
  const [mapData, setMapData] = useState<MapData>(DEFAULT_MAP_DATA);
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

      // Check if user has configured their avatar
      const { data: avatarConfig } = await supabase
        .from('avatar_config')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!avatarConfig) {
        // First time user — redirect to character creator
        router.replace('/create-avatar');
        return;
      }

      const p = buildProfileFromSession(session.user);

      // Fetch role from DB
      const { data: dbUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', p.id)
        .maybeSingle();
      if (dbUser?.role) p.role = dbUser.role;

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

      // Fetch online users (active in last 30s)
      const { data: positions } = await supabase
        .from('avatar_positions')
        .select('*')
        .eq('room_id', 'main')
        .gte('updated_at', new Date(Date.now() - 30000).toISOString());

      setOnlineUsers(positions || []);

      // Fetch active building layout from DB
      const { data: layoutData } = await supabase
        .from('building_layouts')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (layoutData) {
        setMapData({
          id: layoutData.id,
          name: layoutData.name,
          width: layoutData.width,
          height: layoutData.height,
          grid: layoutData.grid,
          zones: layoutData.zones ?? [],
          furniture: layoutData.furniture ?? [],
        });
      }
      setProfile(p);
      setAvatarConfig(avatarConfig);
      setLoading(false);
    };

    init();

    // Subscribe to avatar_positions for HUD updates
    const channel = supabase
      .channel('hud_positions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'avatar_positions',
        filter: 'room_id=eq.main',
      }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const newUser = payload.new as AvatarPosition;
          setOnlineUsers((prev) => {
            const index = prev.findIndex((u) => u.user_id === newUser.user_id);
            if (index >= 0) {
              const next = [...prev];
              next[index] = newUser;
              return next;
            }
            return [...prev, newUser];
          });
        } else if (payload.eventType === 'DELETE') {
          const oldUser = payload.old as AvatarPosition;
          setOnlineUsers((prev) => prev.filter((u) => u.user_id !== oldUser.user_id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
          workspaceId="main"
          avatarConfig={avatarConfig}
          mapData={mapData}
          onChatMessage={handleChatMessage}
        />

        {/* HUD Overlay */}
        <HUD
          profile={profile}
          workspaceId="main"
          workspaceName="Oficina Pública"
          users={onlineUsers}
          onOpenProfile={() => setShowProfile(true)}
          onOpenAdmin={() => {}}
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
