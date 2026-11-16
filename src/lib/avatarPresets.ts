import type { AvatarConfig } from '@/lib/types';
import { AVATAR_LAYER_ORDER } from '@/lib/types';

/**
 * avatarPresets — Presets de personaje para el selector de skin del perfil
 * (PixelVibe Fase 3, parte C).
 *
 * Cada preset es un AvatarConfig completo construido SOLO con piezas que ya
 * existen en el catálogo de CharacterCreator.tsx (y con su PNG en
 * public/assets/sprites/). No hay arte nuevo ni IDs inventados.
 *
 * Nota de catálogo: NO existe blazer masculino (top_m_* solo tiene Camisa
 * Formal, Polo, Hoodie, Chaleco y Camiseta), así que el preset «Director»
 * usa Camisa Formal (top_m_1) como equivalente formal más cercano.
 */

export interface AvatarPreset {
  id: string;
  name: string;
  description: string;
  /** Config completa salvo user_id (se rellena al aplicar el preset). */
  config: Omit<AvatarConfig, 'user_id'>;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'director',
    name: 'Director',
    description: 'Camisa formal y pantalón de vestir',
    config: {
      gender: 'male',
      body: 'body_m',
      hair: 'hair_m_3',
      hair_color: '#333333',
      top: 'top_m_1',
      top_color: '#ffffff',
      bottom: 'bottom_m_1',
      bottom_color: '#333333',
      shoes: 'shoes_1',
      shoes_color: '#222222',
      accessories: ['acc_glasses_dark'],
      skin_tone: '#e0a87c',
    },
  },
  {
    id: 'directora',
    name: 'Directora',
    description: 'Blazer y falda larga',
    config: {
      gender: 'female',
      body: 'body_f',
      hair: 'hair_f_1',
      hair_color: '#333333',
      top: 'top_f_4',
      top_color: '#2980b9',
      bottom: 'bottom_f_3',
      bottom_color: '#333333',
      shoes: 'shoes_1',
      shoes_color: '#222222',
      accessories: ['acc_necklace'],
      skin_tone: '#f5c8a0',
    },
  },
  {
    id: 'desarrollador',
    name: 'Desarrollador',
    description: 'Hoodie, jeans y tenis',
    config: {
      gender: 'male',
      body: 'body_m',
      hair: 'hair_m_2',
      hair_color: '#3a2000',
      top: 'top_m_3',
      top_color: '#6c63ff',
      bottom: 'bottom_m_2',
      bottom_color: '#2980b9',
      shoes: 'shoes_2',
      shoes_color: '#ffffff',
      accessories: [],
      skin_tone: '#fddbb4',
    },
  },
  {
    id: 'recepcionista',
    name: 'Recepcionista',
    description: 'Blusa formal y pantalón',
    config: {
      gender: 'female',
      body: 'body_f',
      hair: 'hair_f_2',
      hair_color: '#3a2000',
      top: 'top_f_1',
      top_color: '#ffffff',
      bottom: 'bottom_f_1',
      bottom_color: '#333333',
      shoes: 'shoes_1',
      shoes_color: '#222222',
      accessories: [],
      skin_tone: '#f5c8a0',
    },
  },
  {
    id: 'creativo',
    name: 'Creativo',
    description: 'Camiseta, cargo y converse',
    config: {
      gender: 'male',
      body: 'body_m',
      hair: 'hair_m_4',
      hair_color: '#333333',
      top: 'top_m_5',
      top_color: '#ff6584',
      bottom: 'bottom_m_4',
      bottom_color: '#8a7a5b',
      shoes: 'shoes_5',
      shoes_color: '#e74c3c',
      accessories: ['acc_hat_cap'],
      skin_tone: '#e0a87c',
    },
  },
  {
    id: 'ejecutivo-casual',
    name: 'Ejecutivo casual',
    description: 'Polo y chinos',
    config: {
      gender: 'male',
      body: 'body_m',
      hair: 'hair_m_1',
      hair_color: '#3a2000',
      top: 'top_m_2',
      top_color: '#00b4d8',
      bottom: 'bottom_m_5',
      bottom_color: '#d9c39a',
      shoes: 'shoes_1',
      shoes_color: '#222222',
      accessories: [],
      skin_tone: '#c68c5c',
    },
  },
  {
    id: 'formal-noche',
    name: 'Formal noche',
    description: 'Chaleco y formales',
    config: {
      gender: 'male',
      body: 'body_m',
      hair: 'hair_m_3',
      hair_color: '#333333',
      top: 'top_m_4',
      top_color: '#333333',
      bottom: 'bottom_m_1',
      bottom_color: '#222222',
      shoes: 'shoes_1',
      shoes_color: '#222222',
      accessories: ['acc_glasses_dark'],
      skin_tone: '#fddbb4',
    },
  },
  {
    id: 'deportista',
    name: 'Deportista',
    description: 'Camiseta, shorts y tenis',
    config: {
      gender: 'male',
      body: 'body_m',
      hair: 'hair_m_5',
      hair_color: '#3a2000',
      top: 'top_m_5',
      top_color: '#43b97f',
      bottom: 'bottom_m_3',
      bottom_color: '#333333',
      shoes: 'shoes_2',
      shoes_color: '#ffffff',
      accessories: [],
      skin_tone: '#e0a87c',
    },
  },
];

/** Devuelve la config completa de un preset para un usuario concreto. */
export function buildPresetConfig(preset: AvatarPreset, userId: string): AvatarConfig {
  return { ...preset.config, accessories: [...preset.config.accessories], user_id: userId };
}

/** Busca el preset cuya config coincide con la dada (ignorando user_id). */
export function findPresetIdForConfig(config: AvatarConfig): string | null {
  const match = AVATAR_PRESETS.find((p) => {
    const c = p.config;
    return (
      c.gender === config.gender &&
      c.body === config.body &&
      c.hair === config.hair &&
      c.hair_color === config.hair_color &&
      c.top === config.top &&
      c.top_color === config.top_color &&
      c.bottom === config.bottom &&
      c.bottom_color === config.bottom_color &&
      c.shoes === config.shoes &&
      c.shoes_color === config.shoes_color &&
      c.skin_tone === config.skin_tone &&
      c.accessories.length === config.accessories.length &&
      c.accessories.every((a) => config.accessories.includes(a))
    );
  });
  return match ? match.id : null;
}

/**
 * Fila para el upsert en la tabla `avatar_config` (mismo mecanismo que
 * src/app/create-avatar/page.tsx). No toca la base de datos: solo construye
 * el objeto que el llamador envía con supabase.
 */
export function avatarConfigToRow(config: AvatarConfig): Record<string, unknown> {
  return {
    user_id: config.user_id,
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
  };
}

// ------------------------------------------------------------------
// Resolución de capas para la vista previa (espejo de AvatarCompositor)
// ------------------------------------------------------------------

export interface PreviewLayer {
  /** Clave de textura = nombre del PNG en /assets/sprites/ (sin extensión). */
  key: string;
  /** Tinte hexadecimal a aplicar, o null si la capa no lleva tinte. */
  tint: string | null;
}

/** Sub-capa de un accesorio, igual que en AvatarCompositor.resolveLayerKeys. */
function accessoryLayerName(acc: string): string {
  if (acc.includes('glasses')) return 'accessory_glasses';
  if (acc.includes('hat') || acc.includes('beanie') || acc.includes('cap')) return 'accessory_hat';
  if (acc.includes('mask')) return 'accessory_mask';
  if (acc.includes('gloves')) return 'accessory_gloves';
  if (acc.includes('necklace')) return 'accessory_necklace';
  return 'accessory';
}

/** Tinte por capa, igual que en AvatarCompositor.getTintForLayer. */
function tintForLayer(layerName: string, config: AvatarConfig): string | null {
  switch (layerName) {
    case 'body': return config.skin_tone;
    case 'hair': return config.hair_color;
    case 'top': return config.top_color;
    case 'bottom': return config.bottom_color;
    case 'shoes': return config.shoes_color;
    default: return null; // los accesorios no llevan tinte
  }
}

/**
 * Capas de una config ordenadas según AVATAR_LAYER_ORDER, listas para
 * componer en un canvas 2D. Es el mismo orden y los mismos tintes que usa
 * AvatarCompositor en Phaser, así que la vista previa es el sprite real.
 */
export function resolvePreviewLayers(config: AvatarConfig): PreviewLayer[] {
  const layers: { layerName: string; key: string }[] = [
    { layerName: 'body', key: config.body },
    { layerName: 'shoes', key: config.shoes },
    { layerName: 'bottom', key: config.bottom },
    { layerName: 'top', key: config.top },
    { layerName: 'hair', key: config.hair },
  ];
  for (const acc of config.accessories) {
    layers.push({ layerName: accessoryLayerName(acc), key: acc });
  }

  const orderMap = new Map<string, number>(
    AVATAR_LAYER_ORDER.map((name, idx) => [name as string, idx]),
  );
  layers.sort((a, b) => (orderMap.get(a.layerName) ?? 50) - (orderMap.get(b.layerName) ?? 50));

  return layers.map(({ layerName, key }) => ({ key, tint: tintForLayer(layerName, config) }));
}
