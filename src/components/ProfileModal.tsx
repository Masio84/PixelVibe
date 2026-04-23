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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">✏️ Tu Perfil</h2>

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
