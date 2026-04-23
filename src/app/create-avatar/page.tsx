'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import CharacterCreator from '@/components/CharacterCreator';
import type { AvatarConfig } from '@/lib/types';

export default function CreateAvatarPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/');
        return;
      }

      // Check if user already has avatar config
      const { data: existing } = await supabase
        .from('avatar_config')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (existing) {
        // Already configured, go to office
        router.replace('/office');
        return;
      }

      setUserId(session.user.id);
      setLoading(false);
    };

    init();
  }, [router, supabase]);

  const handleSave = async (config: AvatarConfig) => {
    if (!userId) return;

    // Save to Supabase
    const { error } = await supabase.from('avatar_config').upsert({
      user_id: userId,
      gender: config.gender,
      body: config.body,
      hair: config.hair,
      hair_color: config.hair_color,
      top: config.top,
      top_color: config.top_color,
      bottom: config.bottom,
      bottom_color: config.bottom_color,
      shoes: config.shoes,
      shoes_color: config.shoes_color,
      accessories: config.accessories,
      skin_tone: config.skin_tone,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error saving avatar config:', error);
      alert('Error al guardar tu avatar. Intenta de nuevo.');
      return;
    }

    router.push('/office');
  };

  if (loading || !userId) {
    return (
      <div className="cc-loading">
        <div style={{ fontSize: '2.5rem', animation: 'float 2s ease-in-out infinite' }}>🎨</div>
        <div>Cargando editor...</div>
      </div>
    );
  }

  return <CharacterCreator userId={userId} onSave={handleSave} />;
}
