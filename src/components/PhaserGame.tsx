'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { UserProfile, AvatarPosition, ChatMessage } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

interface PhaserGameProps {
  profile: UserProfile;
  avatarConfig?: any;
  onChatMessage?: (msg: ChatMessage) => void;
}

export default function PhaserGame({ profile, avatarConfig, onChatMessage }: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import('phaser').Game | null>(null);
  const gameSceneRef = useRef<import('@/game/scenes/GameScene').GameScene | null>(null);
  const [mounted, setMounted] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  
  const onChatMessageRef = useRef(onChatMessage);
  const profileRef = useRef(profile);
  const avatarConfigRef = useRef(avatarConfig);

  useEffect(() => {
    onChatMessageRef.current = onChatMessage;
    profileRef.current = profile;
    avatarConfigRef.current = avatarConfig;
  }, [onChatMessage, profile, avatarConfig]);

  const avatarConfigsCache = useRef<Map<string, any>>(new Map());

  const handlePositionUpdate = useCallback(async (x: number, y: number, direction: string) => {
    const currentProfile = profileRef.current;
    if (!currentProfile) return;
    const { error } = await supabase.from('avatar_positions').upsert({
      user_id: currentProfile.id,
      room_id: 'main',
      x,
      y,
      direction,
      updated_at: new Date().toISOString(),
      name: currentProfile.name,
      avatar_color: currentProfile.avatar_color,
      avatar_config: avatarConfigRef.current, // Sending the config
    }, { onConflict: 'user_id,room_id' });
    if (error) {
      console.error('Supabase Upsert Error:', error);
    }
  }, [supabase]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current || gameRef.current) return;

    let game: import('phaser').Game;

    const initPhaser = async () => {
      const Phaser = (await import('phaser')).default;
      const { IsometricScene } = await import('@/game/scenes/IsometricScene');
      const { GameScene } = await import('@/game/scenes/GameScene');

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: containerRef.current!.clientWidth || 900,
        height: containerRef.current!.clientHeight || 600,
        backgroundColor: 'transparent',
        parent: containerRef.current!,
        transparent: true,
        scene: [IsometricScene, GameScene],
        render: {
          antialias: false,
          pixelArt: true,
        },
      };

      game = new Phaser.Game(config);
      gameRef.current = game;

      game.events.once('ready', () => {
        const gs = game.scene.getScene('GameScene') as import('@/game/scenes/GameScene').GameScene;
        game.scene.start('GameScene', {
          profile: profileRef.current,
          avatarConfig: avatarConfigRef.current,
          events: {
            onPositionUpdate: handlePositionUpdate,
            onChatMessage: (msg: string) => {
              // handled by React UI
            },
          },
        });
        gameSceneRef.current = gs;
      });
    };

    initPhaser();

    // Supabase Realtime: avatar positions
    const posChannel = supabase
      .channel('avatar_positions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'avatar_positions',
        filter: `room_id=eq.main`,
      }, async (payload) => {
        const pos = payload.new as AvatarPosition;
        if (pos && gameSceneRef.current) {
          if (payload.eventType === 'DELETE') {
            gameSceneRef.current.removeRemoteAvatar((payload.old as AvatarPosition).user_id);
          } else {
            // Check if we have the config in the payload
            let config = pos.avatar_config;
            
            // If not in payload, check cache or fetch from DB
            if (!config) {
              if (avatarConfigsCache.current.has(pos.user_id)) {
                config = avatarConfigsCache.current.get(pos.user_id);
              } else {
                const { data } = await supabase
                  .from('avatar_config')
                  .select('*')
                  .eq('user_id', pos.user_id)
                  .maybeSingle();
                if (data) {
                  config = data;
                  avatarConfigsCache.current.set(pos.user_id, data);
                }
              }
            }

            // Ensure textures are loaded before updating avatar
            if (config) {
              const { AvatarCompositor } = await import('@/game/AvatarCompositor');
              const Phaser = (await import('phaser')).default;
              
              const layers = [config.body, config.shoes, config.bottom, config.top, config.hair, ...config.accessories];
              let needsLoad = false;
              
              for (const key of layers) {
                if (key && !gameSceneRef.current?.textures.exists(key)) {
                  gameSceneRef.current?.load.spritesheet(key, `/assets/sprites/${key}.png`, {
                    frameWidth: 32,
                    frameHeight: 32,
                  });
                  needsLoad = true;
                }
              }
              
              if (needsLoad) {
                gameSceneRef.current?.load.once('complete', () => {
                  gameSceneRef.current?.updateRemoteAvatar(pos, config);
                });
                gameSceneRef.current?.load.start();
              } else {
                gameSceneRef.current?.updateRemoteAvatar(pos, config);
              }
            } else {
              gameSceneRef.current.updateRemoteAvatar(pos);
            }
          }
        }
      })
      .subscribe();

    // Supabase Realtime: chat messages
    const chatChannel = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.main`,
      }, (payload) => {
        const msg = payload.new as ChatMessage;
        if (msg && gameSceneRef.current) {
          gameSceneRef.current.showChatMessage(msg.user_id, msg.content);
        }
        onChatMessageRef.current?.(msg);
      })
      .subscribe();

    const handleResize = () => {
      if (game && containerRef.current) {
        game.scale.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      supabase.removeChannel(posChannel);
      supabase.removeChannel(chatChannel);
      if (game) {
        game.destroy(true);
        gameRef.current = null;
        gameSceneRef.current = null;
      }
    };
  }, [mounted, handlePositionUpdate, supabase]);

  // Expose scene for chat
  (PhaserGame as any).getScene = () => gameSceneRef.current;

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
      id="phaser-container"
    >
      {/* Zoom Controls */}
      <div style={{
        position: 'absolute', bottom: '1.5rem', right: '1.5rem',
        display: 'flex', flexDirection: 'column', gap: '0.4rem', zIndex: 50,
      }}>
        <button
          title="Acercar"
          onClick={() => gameSceneRef.current?.adjustZoom(0.2)}
          style={zoomBtnStyle}
        >
          🔍＋
        </button>
        <button
          title="Alejar"
          onClick={() => gameSceneRef.current?.adjustZoom(-0.2)}
          style={zoomBtnStyle}
        >
          🔍－
        </button>
        <button
          title="Restablecer zoom"
          onClick={() => {
            gameSceneRef.current?.adjustZoom(1 - (gameSceneRef.current?.getZoom() ?? 1));
          }}
          style={{ ...zoomBtnStyle, fontSize: '0.6rem', padding: '0.35rem 0.5rem' }}
        >
          1:1
        </button>
      </div>
    </div>
  );
}

const zoomBtnStyle: React.CSSProperties = {
  background: 'rgba(15, 15, 30, 0.85)',
  border: '1px solid rgba(108, 99, 255, 0.5)',
  color: '#ffffff',
  borderRadius: '8px',
  padding: '0.4rem 0.6rem',
  fontSize: '0.75rem',
  cursor: 'pointer',
  backdropFilter: 'blur(6px)',
  transition: 'background 0.2s',
  userSelect: 'none',
};
