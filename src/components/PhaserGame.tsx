'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { UserProfile, AvatarPosition, ChatMessage } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

interface PhaserGameProps {
  profile: UserProfile;
  onChatMessage?: (msg: ChatMessage) => void;
}

export default function PhaserGame({ profile, onChatMessage }: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<import('phaser').Game | null>(null);
  const gameSceneRef = useRef<import('@/game/scenes/GameScene').GameScene | null>(null);
  const [mounted, setMounted] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  
  const onChatMessageRef = useRef(onChatMessage);
  const profileRef = useRef(profile);

  useEffect(() => {
    onChatMessageRef.current = onChatMessage;
    profileRef.current = profile;
  }, [onChatMessage, profile]);

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
      }, (payload) => {
        const pos = payload.new as AvatarPosition;
        if (pos && gameSceneRef.current) {
          if (payload.eventType === 'DELETE') {
            gameSceneRef.current.removeRemoteAvatar((payload.old as AvatarPosition).user_id);
          } else {
            gameSceneRef.current.updateRemoteAvatar(pos);
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
    />
  );
}
