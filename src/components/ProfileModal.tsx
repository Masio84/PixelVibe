'use client';

import { useState } from 'react';
import type { UserProfile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

interface ProfileModalProps {
  profile: UserProfile;
  onClose: () => void;
  onSave: (updated: UserProfile) => void;
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

export default function ProfileModal({ profile, onClose, onSave }: ProfileModalProps) {
  const [name, setName] = useState(profile.name);
  const [color, setColor] = useState(profile.avatar_color);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

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
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
}
