'use client';

import { useState } from 'react';
import type { UserProfile, AvatarConfig } from '@/lib/types';
import { DEFAULT_AVATAR_CONFIG } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import {
  AVATAR_PRESETS,
  buildPresetConfig,
  findPresetIdForConfig,
  avatarConfigToRow,
  type AvatarPreset,
} from '@/lib/avatarPresets';
import AvatarPreview from '@/components/AvatarPreview';
import CharacterCreator from '@/components/CharacterCreator';

interface ProfileModalProps {
  profile: UserProfile;
  onClose: () => void;
  onSave: (updated: UserProfile) => void;
  /** Config actual del avatar (la carga la página de la oficina). */
  avatarConfig?: AvatarConfig | null;
  /** Se llama tras guardar un preset o una personalización. */
  onAvatarConfigChange?: (config: AvatarConfig) => void;
}

const AVATAR_COLORS = [
  '#6c63ff', '#ff6584', '#f9a826', '#43b97f', '#00b4d8',
  '#e63946', '#ff9f1c', '#2ec4b6', '#c77dff', '#f72585',
];

const ROLE_LABELS: Record<string, string> = {
  superadmin: '👑 Super Admin',
  admin: '🛡️ Admin',
  user: '👤 Usuario',
};

/** Normaliza la fila de `avatar_config` (puede traer campos extra de BD). */
function normalizeConfig(config: AvatarConfig | null | undefined, userId: string): AvatarConfig {
  if (!config) return { ...DEFAULT_AVATAR_CONFIG, user_id: userId };
  return {
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
    accessories: [...(config.accessories ?? [])],
    skin_tone: config.skin_tone,
  };
}

export default function ProfileModal({
  profile,
  onClose,
  onSave,
  avatarConfig,
  onAvatarConfigChange,
}: ProfileModalProps) {
  const [name, setName] = useState(profile.name);
  const [color, setColor] = useState(profile.avatar_color);
  const [saving, setSaving] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<AvatarConfig>(() =>
    normalizeConfig(avatarConfig, profile.id),
  );
  const [savingPresetId, setSavingPresetId] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const supabase = createClient();

  const activePresetId = findPresetIdForConfig(currentConfig);

  /** Guarda una config en `avatar_config` (mismo upsert que create-avatar). */
  const saveAvatarConfig = async (config: AvatarConfig): Promise<boolean> => {
    const { error } = await supabase.from('avatar_config').upsert(avatarConfigToRow(config));
    if (error) {
      console.error('Error saving avatar config:', error);
      setAvatarError('No se pudo guardar el personaje. Intenta de nuevo.');
      return false;
    }
    setAvatarError(null);
    setCurrentConfig(config);
    onAvatarConfigChange?.(config);
    return true;
  };

  const handlePresetSelect = async (preset: AvatarPreset) => {
    if (savingPresetId) return;
    const previous = currentConfig;
    const next = buildPresetConfig(preset, profile.id);
    // Vista previa inmediata: la config local cambia antes del upsert.
    setCurrentConfig(next);
    setSavingPresetId(preset.id);
    const ok = await saveAvatarConfig(next);
    if (!ok) setCurrentConfig(previous);
    setSavingPresetId(null);
  };

  const handleCustomSave = async (config: AvatarConfig) => {
    const ok = await saveAvatarConfig({ ...config, user_id: profile.id });
    if (ok) setShowCustomizer(false);
    else alert('Error al guardar tu personaje. Intenta de nuevo.');
  };

  const handleSave = async () => {
    setSaving(true);
    const updated: UserProfile = { ...profile, name, avatar_color: color };

    await supabase.from('users').upsert({
      id: profile.id,
      email: profile.email,
      name,
      avatar_color: color,
    });

    localStorage.setItem('pixelvibe_profile', JSON.stringify(updated));
    onSave(updated);
    setSaving(false);
    onClose();
  };

  const isSuperAdmin = profile.role === 'superadmin';
  const isAdmin = profile.role === 'admin' || isSuperAdmin;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(480px, 94vw)', maxHeight: '92vh', overflowY: 'auto' }}
      >
        <h2 className="modal-title">✏️ Tu Perfil</h2>

        {/* Role badge */}
        {profile.role && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.3rem 0.8rem', borderRadius: '999px', marginBottom: '0.75rem',
            fontSize: '0.7rem', fontWeight: 700,
            background: isSuperAdmin ? 'linear-gradient(135deg, #f9a826, #ff6584)' :
                        isAdmin ? 'linear-gradient(135deg, #6c63ff, #00b4d8)' : 'rgba(255,255,255,0.1)',
            color: '#fff',
          }}>
            {ROLE_LABELS[profile.role] ?? profile.role}
          </div>
        )}

        {/* Avatar preview */}
        <div className="modal-avatar-preview">
          <div className="avatar-preview-bubble" style={{ background: color }}>
            {name.charAt(0).toUpperCase()}
          </div>
        </div>

        <div className="modal-field">
          <label className="modal-label">Nombre</label>
          <input
            className="modal-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="Tu nombre"
          />
        </div>

        <div className="modal-field">
          <label className="modal-label">Color de Avatar</label>
          <div className="color-grid">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                className={`color-swatch ${color === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* ---- Tu personaje (Fase 3C) ---- */}
        <div className="modal-field">
          <label className="modal-label">🧑‍💼 Tu personaje</label>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)',
            borderRadius: '12px', padding: '0.75rem',
          }}>
            <AvatarPreview config={currentConfig} size={112} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {activePresetId
                ? AVATAR_PRESETS.find((p) => p.id === activePresetId)?.name
                : 'Personalizado'}
            </span>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem',
            marginTop: '0.6rem',
          }}>
            {AVATAR_PRESETS.map((preset) => {
              const presetConfig = buildPresetConfig(preset, profile.id);
              const isActive = preset.id === activePresetId;
              const isSaving = savingPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => void handlePresetSelect(preset)}
                  disabled={savingPresetId !== null}
                  title={preset.description}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '0.15rem', padding: '0.4rem 0.2rem', cursor: 'pointer',
                    background: isActive ? 'rgba(108,99,255,0.2)' : 'rgba(255,255,255,0.05)',
                    border: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    borderRadius: '10px', color: 'var(--text)',
                    fontFamily: 'var(--font-ui)', opacity: isSaving ? 0.6 : 1,
                  }}
                >
                  <AvatarPreview config={presetConfig} size={52} />
                  <span style={{ fontSize: '0.62rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
                    {isSaving ? '⏳…' : preset.name}
                  </span>
                </button>
              );
            })}
          </div>

          {avatarError && (
            <p style={{ color: '#ff6584', fontSize: '0.75rem', marginTop: '0.5rem' }}>{avatarError}</p>
          )}
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Los demás te ven con el nuevo aspecto al instante; tu propio avatar
            en pantalla se actualiza al volver a entrar a la oficina.
          </p>

          <button
            className="modal-btn-save"
            onClick={() => setShowCustomizer(true)}
            style={{ width: '100%', marginTop: '0.6rem' }}
          >
            🎨 Personalizar
          </button>
        </div>

        <div className="modal-email">
          <span className="modal-email-label">Email:</span> {profile.email}
        </div>

        {/* Admin Panel Access */}
        {isAdmin && (
          <a
            href="/admin/assets"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1rem', borderRadius: '10px', marginBottom: '0.75rem',
              background: 'linear-gradient(135deg, rgba(108,99,255,0.25), rgba(255,101,132,0.25))',
              border: '1px solid rgba(108,99,255,0.5)',
              color: '#ffffff', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600,
              transition: 'background 0.2s',
            }}
          >
            {isSuperAdmin ? '👑' : '🛡️'}
            Panel de Control Admin
            <span style={{ marginLeft: 'auto', opacity: 0.6, fontSize: '0.7rem' }}>↗</span>
          </a>
        )}

        <div className="modal-actions">
          <button className="modal-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="modal-btn-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : '✅ Guardar'}
          </button>
        </div>
      </div>

      {/* Editor completo en modo edición (por encima del modal de perfil). */}
      {showCustomizer && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000, overflowY: 'auto',
          background: 'radial-gradient(ellipse at 30% 20%, #1a1040 0%, #0d0d1a 50%, #0a1520 100%)',
        }}>
          <CharacterCreator
            userId={profile.id}
            initialConfig={currentConfig}
            onSave={handleCustomSave}
            onCancel={() => setShowCustomizer(false)}
            saveLabel="✓ Guardar cambios"
            title="Personaliza tu Personaje"
            subtitle="Los cambios se aplican a tu avatar en la oficina"
          />
        </div>
      )}
    </div>
  );
}
