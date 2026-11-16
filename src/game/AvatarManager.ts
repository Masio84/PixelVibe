import Phaser from 'phaser';
import { AvatarCompositor } from '@/game/AvatarCompositor';
import type { AvatarConfig, AvatarPosition } from '@/lib/types';
import { DEFAULT_AVATAR_CONFIG } from '@/lib/types';

export interface AvatarEntry {
  userId: string;
  name: string;
  compositor: AvatarCompositor;
  label: Phaser.GameObjects.Text;
  chatBubble?: Phaser.GameObjects.Container;
  chatTimeout?: ReturnType<typeof setTimeout>;
  gridX: number;
  gridY: number;
  targetX: number;
  targetY: number;
  direction: 'up' | 'down' | 'left' | 'right';
  // Momento (reloj de Phaser) de la última actualización de posición
  // recibida para este avatar. Sirve para podar avatares fantasma.
  lastSeenAt: number;
  // JSON de la última config aplicada. Sirve para no reconstruir el avatar
  // en cada actualización de posición (ver updateAvatar).
  configJson?: string;
}

export class AvatarManager {
  private scene: Phaser.Scene;
  private avatars: Map<string, AvatarEntry> = new Map();
  private getIsoPos: (col: number, row: number) => { x: number; y: number };

  constructor(
    scene: Phaser.Scene,
    getIsoPos: (col: number, row: number) => { x: number; y: number },
  ) {
    this.scene = scene;
    this.getIsoPos = getIsoPos;
  }

  /** Create a new avatar with the given configuration. */
  createAvatar(
    userId: string,
    name: string,
    avatarConfig: AvatarConfig | null,
    gridX: number,
    gridY: number,
  ): AvatarEntry {
    const config: AvatarConfig = avatarConfig ?? {
      ...DEFAULT_AVATAR_CONFIG,
      user_id: userId,
    };

    const pos = this.getIsoPos(gridX, gridY);

    // Create compositor (handles sprite layers + shadow)
    const compositor = new AvatarCompositor(this.scene, config);
    compositor.setPosition(pos.x, pos.y);
    compositor.setDepth(gridX + gridY);

    // Name label — legible sans-serif, not pixel font
    const label = this.scene.add.text(0, -44, name, {
      fontFamily: '"Nunito", "Segoe UI", Arial, sans-serif',
      fontSize: '12px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      resolution: 3,
      shadow: {
        offsetX: 0,
        offsetY: 2,
        color: '#000000',
        blur: 4,
        fill: true,
      }
    }).setOrigin(0.5);
    compositor.container.add(label);

    const entry: AvatarEntry = {
      userId,
      name,
      compositor,
      label,
      gridX,
      gridY,
      targetX: gridX,
      targetY: gridY,
      direction: 'down',
      lastSeenAt: this.scene.time.now,
      configJson: JSON.stringify(config),
    };

    this.avatars.set(userId, entry);
    return entry;
  }

  /** Update or create a remote avatar. */
  updateAvatar(
    userId: string,
    x: number,
    y: number,
    direction: 'up' | 'down' | 'left' | 'right',
    name: string,
    _color: string, // kept for backwards compat; ignored in compositor mode
    avatarConfig?: AvatarConfig | null,
  ) {
    let entry = this.avatars.get(userId);
    if (!entry) {
      entry = this.createAvatar(userId, name, avatarConfig ?? null, x, y);
    } else if (avatarConfig) {
      // ANTES: cada actualización de posición (cada 200 ms por usuario
      // remoto) reconstruía todos los sprites del avatar: parpadeo y
      // trabajo inútil. Ahora solo se reconstruye si la config cambió.
      const nextJson = JSON.stringify(avatarConfig);
      if (entry.configJson !== nextJson) {
        entry.configJson = nextJson;
        entry.compositor.updateConfig(avatarConfig);
      }
    }
    entry.targetX = x;
    entry.targetY = y;
    entry.direction = direction;
    entry.name = name;
    entry.lastSeenAt = this.scene.time.now;

    // Update label text
    if (entry.label.text !== name) {
      entry.label.setText(name);
    }
  }

  /** Remove an avatar. */
  removeAvatar(userId: string) {
    const entry = this.avatars.get(userId);
    if (entry) {
      entry.compositor.destroy();
      if (entry.chatBubble) entry.chatBubble.destroy();
      this.avatars.delete(userId);
    }
  }

  /**
   * Elimina los avatares remotos sin actividad durante más de `maxAgeMs`.
   * El avatar local (`excludeUserId`) nunca se poda: su posición la mueve
   * el jugador, no llega por Realtime. Si un usuario vuelve a moverse
   * después de ser podado, `updateAvatar` lo recrea al recibir su
   * siguiente posición.
   */
  pruneInactiveAvatars(maxAgeMs: number, excludeUserId?: string) {
    const now = this.scene.time.now;
    this.avatars.forEach((entry) => {
      if (entry.userId === excludeUserId) return;
      if (now - entry.lastSeenAt > maxAgeMs) {
        this.removeAvatar(entry.userId);
      }
    });
  }

  /** Show a chat bubble above the avatar. */
  showChatBubble(userId: string, message: string) {
    const entry = this.avatars.get(userId);
    if (!entry) return;

    // Clean up existing bubble
    if (entry.chatBubble) entry.chatBubble.destroy();
    if (entry.chatTimeout) clearTimeout(entry.chatTimeout);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRoundedRect(-85, -20, 170, 34, 8);
    bg.fillTriangle(-6, 14, 6, 14, 0, 22);

    // ANTES se cortaba a 20 caracteres aunque el chat permite 120.
    const text = this.scene.add.text(0, -3, message.substring(0, 60), {
      fontFamily: 'var(--font-pixel), "Press Start 2P", monospace',
      fontSize: '6px',
      color: '#ffffff',
      wordWrap: { width: 160 },
    }).setOrigin(0.5);

    const bubble = this.scene.add.container(0, -58, [bg, text]);
    entry.compositor.container.add(bubble);
    entry.chatBubble = bubble;

    entry.chatTimeout = setTimeout(() => {
      bubble.destroy();
      entry.chatBubble = undefined;
    }, 4000);
  }

  /** Call each frame to interpolate positions and sync animations. */
  update(delta: number) {
    this.avatars.forEach((entry) => {
      // Smooth interpolation
      const speed = 0.08;
      entry.gridX += (entry.targetX - entry.gridX) * speed;
      entry.gridY += (entry.targetY - entry.gridY) * speed;

      const pos = this.getIsoPos(entry.gridX, entry.gridY);
      entry.compositor.setPosition(pos.x, pos.y);

      const depth = entry.gridX + entry.gridY;
      entry.compositor.setDepth(depth);

      // Check if moving
      const isMoving =
        Math.abs(entry.gridX - entry.targetX) > 0.01 ||
        Math.abs(entry.gridY - entry.targetY) > 0.01;

      // Sync animation
      entry.compositor.playAnim(entry.direction, isMoving);
    });
  }

  /** Get a single avatar entry. */
  getAvatar(userId: string): AvatarEntry | undefined {
    return this.avatars.get(userId);
  }

  /** Get all avatar entries. */
  getAllAvatars(): AvatarEntry[] {
    return Array.from(this.avatars.values());
  }
}
