import Phaser from 'phaser';
import type { AvatarConfig, AvatarGender } from '@/lib/types';
import { AVATAR_LAYER_ORDER, DEFAULT_AVATAR_CONFIG } from '@/lib/types';

/**
 * AvatarCompositor — Renders a multi-layer composable avatar.
 *
 * Each avatar is a stack of sprite layers (body, clothes, hair, accessories)
 * rendered inside a single Phaser Container. Every layer is an independent
 * spritesheet that shares the same frame layout (6 cols × 4 rows, 32×32 per
 * frame), so animations stay perfectly synchronised.
 */

// Sprite frame layout: 6 cols × 4 rows  (192×128 total)
const FRAME_W = 32;
const FRAME_H = 32;
const COLS = 6;

// Direction → spritesheet row
const DIR_ROW: Record<string, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};

/** Resolve the list of texture keys needed for a given AvatarConfig. */
function resolveLayerKeys(config: AvatarConfig): { layerName: string; textureKey: string }[] {
  const layers: { layerName: string; textureKey: string }[] = [];

  // Fixed layers
  layers.push({ layerName: 'body', textureKey: config.body });
  layers.push({ layerName: 'shoes', textureKey: config.shoes });
  layers.push({ layerName: 'bottom', textureKey: config.bottom });
  layers.push({ layerName: 'top', textureKey: config.top });
  layers.push({ layerName: 'hair', textureKey: config.hair });

  // Dynamic accessories
  for (const acc of config.accessories) {
    // Determine sub-layer from accessory key
    let layerName = 'accessory';
    if (acc.includes('glasses')) layerName = 'accessory_glasses';
    else if (acc.includes('hat') || acc.includes('beanie') || acc.includes('cap')) layerName = 'accessory_hat';
    else if (acc.includes('mask')) layerName = 'accessory_mask';
    else if (acc.includes('gloves')) layerName = 'accessory_gloves';
    else if (acc.includes('necklace')) layerName = 'accessory_necklace';

    layers.push({ layerName, textureKey: acc });
  }

  return layers;
}

/** Tint colour to apply per layer. */
function getTintForLayer(layerName: string, config: AvatarConfig): number | null {
  switch (layerName) {
    case 'body': return parseInt(config.skin_tone.replace('#', ''), 16);
    case 'hair': return parseInt(config.hair_color.replace('#', ''), 16);
    case 'top': return parseInt(config.top_color.replace('#', ''), 16);
    case 'bottom': return parseInt(config.bottom_color.replace('#', ''), 16);
    case 'shoes': return parseInt(config.shoes_color.replace('#', ''), 16);
    default: return null; // no tint for accessories
  }
}

export class AvatarCompositor {
  private scene: Phaser.Scene;
  private layers: Map<string, Phaser.GameObjects.Sprite> = new Map();
  public container: Phaser.GameObjects.Container;
  private config: AvatarConfig;
  private currentDir: string = 'down';
  private isMoving: boolean = false;

  // Shadow ellipse rendered below the container
  public shadow: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, config: AvatarConfig) {
    this.scene = scene;
    this.config = config;
    this.container = scene.add.container(0, 0);
    this.shadow = scene.add.ellipse(0, 6, 28, 10, 0x000000, 0.25);
    this.buildLayers();
  }

  // ------------------------------------------------------------------
  // Static helpers — call once during preload
  // ------------------------------------------------------------------

  /**
   * Register spritesheet + walk/idle animations for a single texture key.
   * Must be called AFTER the texture is loaded.
   */
  static registerAnims(scene: Phaser.Scene, key: string) {
    // Guard: only register once
    if (scene.anims.exists(`${key}_walk_down`)) return;

    const dirs = ['down', 'left', 'right', 'up'];
    dirs.forEach((dir, rowIdx) => {
      scene.anims.create({
        key: `${key}_walk_${dir}`,
        frames: scene.anims.generateFrameNumbers(key, {
          start: rowIdx * COLS + 1,
          end: rowIdx * COLS + 5,
        }),
        frameRate: 10,
        repeat: -1,
      });
      scene.anims.create({
        key: `${key}_idle_${dir}`,
        frames: [{ key, frame: rowIdx * COLS }],
        frameRate: 1,
      });
    });
  }

  /**
   * Load a layer spritesheet into the Phaser asset pipeline.
   * Call from `preload()`.
   */
  static preloadLayer(scene: Phaser.Scene, key: string, url: string) {
    if (scene.textures.exists(key)) return;
    scene.load.spritesheet(key, url, {
      frameWidth: FRAME_W,
      frameHeight: FRAME_H,
    });
  }

  /**
   * Preload all layers needed for a given AvatarConfig.
   */
  static preloadConfig(scene: Phaser.Scene, config: AvatarConfig) {
    const layers = resolveLayerKeys(config);
    for (const { textureKey } of layers) {
      AvatarCompositor.preloadLayer(scene, textureKey, `/assets/sprites/${textureKey}.png`);
    }
  }

  // ------------------------------------------------------------------
  // Instance methods
  // ------------------------------------------------------------------

  /** Build (or rebuild) all sprite layers from current config. */
  private buildLayers() {
    // Destroy existing sprites
    this.layers.forEach((sprite) => sprite.destroy());
    this.layers.clear();

    const layerSpecs = resolveLayerKeys(this.config);

    // Sort according to AVATAR_LAYER_ORDER
    const orderMap = new Map<string, number>(AVATAR_LAYER_ORDER.map((name, idx) => [name as string, idx]));
    layerSpecs.sort((a, b) => {
      const oa = orderMap.get(a.layerName) ?? 50;
      const ob = orderMap.get(b.layerName) ?? 50;
      return oa - ob;
    });

    for (const { layerName, textureKey } of layerSpecs) {
      // Only create if texture exists
      if (!this.scene.textures.exists(textureKey)) {
        console.warn(`[AvatarCompositor] Texture "${textureKey}" not found, skipping layer "${layerName}".`);
        continue;
      }

      // Register animations if needed
      AvatarCompositor.registerAnims(this.scene, textureKey);

      const sprite = this.scene.add.sprite(0, 0, textureKey);
      sprite.setOrigin(0.5, 0.8); // anchor near feet

      // Apply tint
      const tint = getTintForLayer(layerName, this.config);
      if (tint !== null) {
        sprite.setTint(tint);
      }

      this.container.add(sprite);
      this.layers.set(layerName, sprite);
    }

    // Start with idle down
    this.playAnim('down', false);
  }

  /** Update the avatar configuration and rebuild layers. */
  updateConfig(config: AvatarConfig) {
    this.config = config;
    this.buildLayers();
  }

  /** Play walk/idle animation in the given direction on ALL layers. */
  playAnim(direction: string, moving: boolean) {
    if (direction === this.currentDir && moving === this.isMoving) return;
    this.currentDir = direction;
    this.isMoving = moving;

    const suffix = moving ? 'walk' : 'idle';
    this.layers.forEach((sprite) => {
      const animKey = `${sprite.texture.key}_${suffix}_${direction}`;
      if (this.scene.anims.exists(animKey)) {
        sprite.anims.play(animKey, true);
      }
    });
  }

  /** Set depth for all elements. */
  setDepth(value: number) {
    this.container.setDepth(value + 0.9);
    this.shadow.setDepth(value);
  }

  /** Set position for both container and shadow. */
  setPosition(x: number, y: number) {
    this.container.setPosition(x, y);
    this.shadow.setPosition(x, y + 6);
  }

  /** Destroy all game objects. */
  destroy() {
    this.layers.forEach((sprite) => sprite.destroy());
    this.layers.clear();
    this.container.destroy();
    this.shadow.destroy();
  }

  /** Get the underlying config. */
  getConfig(): AvatarConfig {
    return this.config;
  }
}
