'use client';

import { useState, useCallback } from 'react';
import type { AvatarConfig, AvatarGender, AvatarPieceCategory } from '@/lib/types';
import { DEFAULT_AVATAR_CONFIG } from '@/lib/types';

// ---- Catalog data (hardcoded for now, will come from DB in Phase 3) ----

interface PieceOption {
  key: string;
  label: string;
  category: AvatarPieceCategory;
  gender: AvatarGender | 'unisex';
}

const HAIR_OPTIONS: PieceOption[] = [
  { key: 'hair_m_1', label: 'Corto', category: 'hair', gender: 'male' },
  { key: 'hair_m_2', label: 'Medio', category: 'hair', gender: 'male' },
  { key: 'hair_m_3', label: 'Peinado', category: 'hair', gender: 'male' },
  { key: 'hair_m_4', label: 'Mohicano', category: 'hair', gender: 'male' },
  { key: 'hair_m_5', label: 'Rapado', category: 'hair', gender: 'male' },
  { key: 'hair_f_1', label: 'Largo', category: 'hair', gender: 'female' },
  { key: 'hair_f_2', label: 'Bob', category: 'hair', gender: 'female' },
  { key: 'hair_f_3', label: 'Coleta', category: 'hair', gender: 'female' },
  { key: 'hair_f_4', label: 'Chino', category: 'hair', gender: 'female' },
  { key: 'hair_f_5', label: 'Trenzas', category: 'hair', gender: 'female' },
];

const TOP_OPTIONS: PieceOption[] = [
  { key: 'top_m_1', label: 'Camisa Formal', category: 'top', gender: 'male' },
  { key: 'top_m_2', label: 'Polo', category: 'top', gender: 'male' },
  { key: 'top_m_3', label: 'Hoodie', category: 'top', gender: 'male' },
  { key: 'top_m_4', label: 'Chaleco', category: 'top', gender: 'male' },
  { key: 'top_m_5', label: 'Camiseta', category: 'top', gender: 'male' },
  { key: 'top_f_1', label: 'Blusa Formal', category: 'top', gender: 'female' },
  { key: 'top_f_2', label: 'Top', category: 'top', gender: 'female' },
  { key: 'top_f_3', label: 'Suéter', category: 'top', gender: 'female' },
  { key: 'top_f_4', label: 'Blazer', category: 'top', gender: 'female' },
  { key: 'top_f_5', label: 'Camiseta', category: 'top', gender: 'female' },
];

const BOTTOM_OPTIONS: PieceOption[] = [
  { key: 'bottom_m_1', label: 'Pantalón Formal', category: 'bottom', gender: 'male' },
  { key: 'bottom_m_2', label: 'Jeans', category: 'bottom', gender: 'male' },
  { key: 'bottom_m_3', label: 'Shorts', category: 'bottom', gender: 'male' },
  { key: 'bottom_m_4', label: 'Cargo', category: 'bottom', gender: 'male' },
  { key: 'bottom_m_5', label: 'Chinos', category: 'bottom', gender: 'male' },
  { key: 'bottom_f_1', label: 'Pantalón', category: 'bottom', gender: 'female' },
  { key: 'bottom_f_2', label: 'Falda Corta', category: 'bottom', gender: 'female' },
  { key: 'bottom_f_3', label: 'Falda Larga', category: 'bottom', gender: 'female' },
  { key: 'bottom_f_4', label: 'Jeans', category: 'bottom', gender: 'female' },
  { key: 'bottom_f_5', label: 'Shorts', category: 'bottom', gender: 'female' },
];

const SHOES_OPTIONS: PieceOption[] = [
  { key: 'shoes_1', label: 'Formales', category: 'shoes', gender: 'unisex' },
  { key: 'shoes_2', label: 'Tenis', category: 'shoes', gender: 'unisex' },
  { key: 'shoes_3', label: 'Botas', category: 'shoes', gender: 'unisex' },
  { key: 'shoes_4', label: 'Sandalias', category: 'shoes', gender: 'unisex' },
  { key: 'shoes_5', label: 'Converse', category: 'shoes', gender: 'unisex' },
];

const ACCESSORY_OPTIONS: PieceOption[] = [
  { key: 'acc_glasses_clear', label: 'Lentes Transparentes', category: 'accessory', gender: 'unisex' },
  { key: 'acc_glasses_dark', label: 'Lentes Oscuros', category: 'accessory', gender: 'unisex' },
  { key: 'acc_mask', label: 'Cubrebocas', category: 'accessory', gender: 'unisex' },
  { key: 'acc_gloves', label: 'Guantes', category: 'accessory', gender: 'unisex' },
  { key: 'acc_necklace', label: 'Collar', category: 'accessory', gender: 'unisex' },
  { key: 'acc_hat_cap', label: 'Gorra', category: 'accessory', gender: 'unisex' },
  { key: 'acc_hat_formal', label: 'Sombrero', category: 'accessory', gender: 'unisex' },
  { key: 'acc_hat_beanie', label: 'Gorro', category: 'accessory', gender: 'unisex' },
];

const SKIN_TONES = [
  '#fddbb4', '#f5c8a0', '#e0a87c', '#c68c5c', '#a0714a', '#7a5233',
];

const COLOR_PRESETS = [
  '#6c63ff', '#ff6584', '#f9a826', '#43b97f', '#00b4d8',
  '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#1abc9c',
  '#f39c12', '#333333', '#ffffff', '#c0392b', '#2980b9',
];

type TabKey = 'hair' | 'top' | 'bottom' | 'shoes' | 'accessories';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'hair', label: 'Cabello', icon: '💇' },
  { key: 'top', label: 'Superior', icon: '👕' },
  { key: 'bottom', label: 'Inferior', icon: '👖' },
  { key: 'shoes', label: 'Zapatos', icon: '👟' },
  { key: 'accessories', label: 'Accesorios', icon: '🕶️' },
];

interface CharacterCreatorProps {
  userId: string;
  initialConfig?: AvatarConfig;
  onSave: (config: AvatarConfig) => void;
}

export default function CharacterCreator({ userId, initialConfig, onSave }: CharacterCreatorProps) {
  const [config, setConfig] = useState<AvatarConfig>(
    initialConfig ?? { ...DEFAULT_AVATAR_CONFIG, user_id: userId }
  );
  const [activeTab, setActiveTab] = useState<TabKey>('hair');
  const [saving, setSaving] = useState(false);

  const updateConfig = useCallback((partial: Partial<AvatarConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  // When gender changes, reset gendered pieces to defaults
  const handleGenderChange = (gender: AvatarGender) => {
    const prefix = gender === 'male' ? 'm' : 'f';
    updateConfig({
      gender,
      body: `body_${prefix}`,
      hair: `hair_${prefix}_1`,
      top: `top_${prefix}_1`,
      bottom: `bottom_${prefix}_1`,
    });
  };

  // Filter options by current gender
  const getOptions = (allOptions: PieceOption[]) =>
    allOptions.filter((o) => o.gender === config.gender || o.gender === 'unisex');

  // Toggle accessory
  const toggleAccessory = (key: string) => {
    const current = config.accessories;
    if (current.includes(key)) {
      updateConfig({ accessories: current.filter((a) => a !== key) });
    } else {
      updateConfig({ accessories: [...current, key] });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    onSave(config);
  };

  // Get the piece options for the active tab
  const getTabContent = () => {
    switch (activeTab) {
      case 'hair':
        return (
          <PieceSection
            options={getOptions(HAIR_OPTIONS)}
            selected={config.hair}
            onSelect={(key) => updateConfig({ hair: key })}
            colorValue={config.hair_color}
            onColorChange={(c) => updateConfig({ hair_color: c })}
            colorLabel="Color de cabello"
          />
        );
      case 'top':
        return (
          <PieceSection
            options={getOptions(TOP_OPTIONS)}
            selected={config.top}
            onSelect={(key) => updateConfig({ top: key })}
            colorValue={config.top_color}
            onColorChange={(c) => updateConfig({ top_color: c })}
            colorLabel="Color de prenda"
          />
        );
      case 'bottom':
        return (
          <PieceSection
            options={getOptions(BOTTOM_OPTIONS)}
            selected={config.bottom}
            onSelect={(key) => updateConfig({ bottom: key })}
            colorValue={config.bottom_color}
            onColorChange={(c) => updateConfig({ bottom_color: c })}
            colorLabel="Color de prenda"
          />
        );
      case 'shoes':
        return (
          <PieceSection
            options={getOptions(SHOES_OPTIONS)}
            selected={config.shoes}
            onSelect={(key) => updateConfig({ shoes: key })}
            colorValue={config.shoes_color}
            onColorChange={(c) => updateConfig({ shoes_color: c })}
            colorLabel="Color de zapatos"
          />
        );
      case 'accessories':
        return (
          <div className="cc-accessories">
            <div className="cc-piece-grid">
              {ACCESSORY_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  className={`cc-piece-btn ${config.accessories.includes(opt.key) ? 'selected' : ''}`}
                  onClick={() => toggleAccessory(opt.key)}
                >
                  <span className="cc-piece-label">{opt.label}</span>
                </button>
              ))}
            </div>
            <p className="cc-hint">Puedes seleccionar múltiples accesorios</p>
          </div>
        );
    }
  };

  return (
    <div className="cc-overlay">
      <div className="cc-card">
        {/* Header */}
        <div className="cc-header">
          <span className="cc-header-icon">🎨</span>
          <h1 className="cc-title">Crea tu Personaje</h1>
          <p className="cc-subtitle">Personaliza tu avatar para la oficina virtual</p>
        </div>

        <div className="cc-body">
          {/* Left: Preview + Gender */}
          <div className="cc-left">
            {/* Avatar Preview */}
            <div className="cc-preview-container">
              <div className="cc-preview-bg">
                <div className="cc-preview-avatar" style={{ fontSize: '4rem' }}>
                  {config.gender === 'male' ? '🧑‍💼' : '👩‍💼'}
                </div>
                <p className="cc-preview-hint">Vista previa en vivo</p>
              </div>
            </div>

            {/* Gender Selector */}
            <div className="cc-gender-selector">
              <button
                className={`cc-gender-btn ${config.gender === 'male' ? 'active' : ''}`}
                onClick={() => handleGenderChange('male')}
              >
                <span>♂</span> Hombre
              </button>
              <button
                className={`cc-gender-btn ${config.gender === 'female' ? 'active' : ''}`}
                onClick={() => handleGenderChange('female')}
              >
                <span>♀</span> Mujer
              </button>
            </div>

            {/* Skin Tone */}
            <div className="cc-skin-section">
              <label className="cc-section-label">Tono de piel</label>
              <div className="cc-skin-row">
                {SKIN_TONES.map((tone) => (
                  <button
                    key={tone}
                    className={`cc-skin-swatch ${config.skin_tone === tone ? 'selected' : ''}`}
                    style={{ backgroundColor: tone }}
                    onClick={() => updateConfig({ skin_tone: tone })}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right: Tabs + Options */}
          <div className="cc-right">
            {/* Tabs */}
            <div className="cc-tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`cc-tab ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span className="cc-tab-icon">{tab.icon}</span>
                  <span className="cc-tab-label">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="cc-tab-content">
              {getTabContent()}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          className="cc-save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '⏳ Guardando...' : '✓ Guardar y Entrar a la Oficina'}
        </button>
      </div>
    </div>
  );
}

// ---- Sub-components ----

function PieceSection({
  options,
  selected,
  onSelect,
  colorValue,
  onColorChange,
  colorLabel,
}: {
  options: PieceOption[];
  selected: string;
  onSelect: (key: string) => void;
  colorValue: string;
  onColorChange: (color: string) => void;
  colorLabel: string;
}) {
  return (
    <div className="cc-piece-section">
      <div className="cc-piece-grid">
        {options.map((opt) => (
          <button
            key={opt.key}
            className={`cc-piece-btn ${selected === opt.key ? 'selected' : ''}`}
            onClick={() => onSelect(opt.key)}
          >
            <span className="cc-piece-label">{opt.label}</span>
          </button>
        ))}
      </div>
      <div className="cc-color-section">
        <label className="cc-section-label">{colorLabel}</label>
        <div className="cc-color-row">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              className={`cc-color-swatch ${colorValue === color ? 'selected' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onColorChange(color)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
