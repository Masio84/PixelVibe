import Phaser from 'phaser';
import type { AvatarPosition } from '@/lib/types';

export interface AvatarSprite {
  userId: string;
  name: string;
  color: string;
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Ellipse;
  chatBubble?: Phaser.GameObjects.Container;
  chatTimeout?: ReturnType<typeof setTimeout>;
  gridX: number;
  gridY: number;
  targetX: number;
  targetY: number;
  direction: 'up' | 'down' | 'left' | 'right';
  animFrame: number;
  animTimer: number;
}

const TILE_W = 64;
const TILE_H = 32;

export class AvatarManager {
  private scene: Phaser.Scene;
  private avatars: Map<string, AvatarSprite> = new Map();
  private getIsoPos: (col: number, row: number) => { x: number; y: number };

  constructor(scene: Phaser.Scene, getIsoPos: (col: number, row: number) => { x: number; y: number }) {
    this.scene = scene;
    this.getIsoPos = getIsoPos;
  }

  createAvatar(userId: string, name: string, color: string, gridX: number, gridY: number): AvatarSprite {
    const pos = this.getIsoPos(gridX, gridY);

    const shadow = this.scene.add.ellipse(pos.x, pos.y + 6, 28, 10, 0x000000, 0.2);
    shadow.setDepth(gridX + gridY);

    const body = this.scene.add.graphics();
    const label = this.scene.add.text(0, -40, name, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      resolution: 2,
    }).setOrigin(0.5);

    const container = this.scene.add.container(pos.x, pos.y, [body, label]);
    container.setDepth(gridX + gridY + 0.9);

    const avatar: AvatarSprite = {
      userId,
      name,
      color,
      container,
      body,
      label,
      shadow,
      gridX,
      gridY,
      targetX: gridX,
      targetY: gridY,
      direction: 'down',
      animFrame: 0,
      animTimer: 0,
    };

    this.drawAvatarBody(avatar);
    this.avatars.set(userId, avatar);
    return avatar;
  }

  private drawAvatarBody(avatar: AvatarSprite) {
    const g = avatar.body;
    g.clear();

    const color = parseInt(avatar.color.replace('#', ''), 16);
    const darkColor = parseInt(avatar.color.replace('#', ''), 16) - 0x202020;
    const frame = avatar.animFrame;
    const isMoving = (avatar.gridX !== avatar.targetX || avatar.gridY !== avatar.targetY);
    const legOffset = isMoving ? (frame % 2 === 0 ? 2 : -2) : 0;

    // Shadow feet
    g.fillStyle(color, 0.3);
    g.fillEllipse(0, 12, 20, 6);

    // Legs
    g.fillStyle(darkColor, 1);
    g.fillRect(-5, 4 + legOffset, 4, 8);
    g.fillRect(1, 4 - legOffset, 4, 8);

    // Body (isometric cube style)
    g.fillStyle(color, 1);
    // Front face
    g.fillRect(-8, -14, 16, 18);
    // Top (lighter)
    g.fillStyle(parseInt(avatar.color.replace('#', ''), 16) + 0x303030, 1);
    g.fillRect(-8, -18, 16, 4);

    // Head
    g.fillStyle(0xfddbb4, 1);
    g.fillCircle(0, -22, 9);

    // Eyes (direction-based)
    g.fillStyle(0x222222, 1);
    switch (avatar.direction) {
      case 'down':
        g.fillCircle(-3, -23, 2);
        g.fillCircle(3, -23, 2);
        break;
      case 'up':
        // Back of head
        break;
      case 'left':
        g.fillCircle(-4, -23, 2);
        break;
      case 'right':
        g.fillCircle(4, -23, 2);
        break;
    }

    // Hair
    g.fillStyle(0x4a3000, 1);
    g.fillRect(-9, -31, 18, 8);
    g.fillCircle(-9, -26, 3);
    g.fillCircle(9, -26, 3);
  }

  updateAvatar(userId: string, x: number, y: number, direction: 'up' | 'down' | 'left' | 'right', name: string, color: string) {
    let avatar = this.avatars.get(userId);
    if (!avatar) {
      avatar = this.createAvatar(userId, name, color, x, y);
    }
    avatar.targetX = x;
    avatar.targetY = y;
    avatar.direction = direction;
    avatar.name = name;
    avatar.color = color;
  }

  removeAvatar(userId: string) {
    const avatar = this.avatars.get(userId);
    if (avatar) {
      avatar.container.destroy();
      avatar.shadow.destroy();
      if (avatar.chatBubble) avatar.chatBubble.destroy();
      this.avatars.delete(userId);
    }
  }

  showChatBubble(userId: string, message: string) {
    const avatar = this.avatars.get(userId);
    if (!avatar) return;

    if (avatar.chatBubble) {
      avatar.chatBubble.destroy();
    }
    if (avatar.chatTimeout) {
      clearTimeout(avatar.chatTimeout);
    }

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRoundedRect(-60, -20, 120, 26, 8);
    bg.fillStyle(0x000000, 0.8);
    bg.fillTriangle(-6, 6, 6, 6, 0, 14);

    const text = this.scene.add.text(0, -7, message.substring(0, 20), {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '5px',
      color: '#ffffff',
      wordWrap: { width: 110 },
    }).setOrigin(0.5);

    const bubble = this.scene.add.container(0, -55, [bg, text]);
    avatar.container.add(bubble);
    avatar.chatBubble = bubble;

    avatar.chatTimeout = setTimeout(() => {
      bubble.destroy();
      avatar.chatBubble = undefined;
    }, 4000);
  }

  update(delta: number) {
    this.avatars.forEach((avatar) => {
      // Smooth interpolation toward target
      const speed = 0.08;
      avatar.gridX += (avatar.targetX - avatar.gridX) * speed;
      avatar.gridY += (avatar.targetY - avatar.gridY) * speed;

      const pos = this.getIsoPos(avatar.gridX, avatar.gridY);
      avatar.container.setPosition(pos.x, pos.y);
      avatar.shadow.setPosition(pos.x, pos.y + 6);

      const depth = avatar.gridX + avatar.gridY;
      avatar.container.setDepth(depth + 0.9);
      avatar.shadow.setDepth(depth);

      // Animation
      avatar.animTimer += delta;
      if (avatar.animTimer > 200) {
        avatar.animTimer = 0;
        avatar.animFrame++;
        this.drawAvatarBody(avatar);
      }
    });
  }

  getAvatar(userId: string): AvatarSprite | undefined {
    return this.avatars.get(userId);
  }

  getAllAvatars(): AvatarSprite[] {
    return Array.from(this.avatars.values());
  }
}
