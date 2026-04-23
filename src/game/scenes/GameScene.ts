import Phaser from 'phaser';
import { IsometricScene } from '@/game/scenes/IsometricScene';
import { AvatarManager } from '@/game/AvatarManager';
import { MAP_LAYOUT, TILE_WALKABLE } from '@/game/map';
import type { UserProfile, AvatarPosition, ChatMessage } from '@/lib/types';

const TILE_W = 64;
const TILE_H = 32;
const SYNC_INTERVAL = 200;

export interface GameSceneEvents {
  onPositionUpdate: (x: number, y: number, direction: string) => void;
  onChatMessage: (msg: string) => void;
}

export class GameScene extends Phaser.Scene {
  private mapScene!: IsometricScene;
  private avatarManager!: AvatarManager;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  
  private localAvatarId: string = '';
  private localX: number = 8;
  private localY: number = 8;
  private localDirection: 'up' | 'down' | 'left' | 'right' = 'down';
  private moveSpeed: number = 0.06;
  private syncTimer: number = 0;
  private events_cb?: GameSceneEvents;
  private userProfile?: UserProfile;

  // Camera
  private camOffsetX: number = 0;
  private camOffsetY: number = 0;
  private isDragging: boolean = false;
  private dragStart?: { x: number; y: number; camX: number; camY: number };

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { profile: UserProfile; events: GameSceneEvents }) {
    this.userProfile = data.profile;
    this.events_cb = data.events;
    this.localAvatarId = data.profile.id;
  }

  create() {
    // Launch the tile layer scene behind this one
    this.scene.launch('IsometricScene');
    this.scene.sendToBack('IsometricScene');

    this.mapScene = this.scene.get('IsometricScene') as IsometricScene;

    this.avatarManager = new AvatarManager(this, this.getIsoPos.bind(this));

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Camera drag
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.dragStart = { x: ptr.x, y: ptr.y, camX: this.camOffsetX, camY: this.camOffsetY };
    });
    this.input.on('pointerup', () => { this.isDragging = false; });
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (this.isDragging && this.dragStart) {
        this.camOffsetX = this.dragStart.camX + (ptr.x - this.dragStart.x);
        this.camOffsetY = this.dragStart.camY + (ptr.y - this.dragStart.y);
      }
    });

    // Create local avatar
    if (this.userProfile) {
      this.avatarManager.createAvatar(
        this.userProfile.id,
        this.userProfile.name,
        this.userProfile.avatar_color,
        this.localX,
        this.localY
      );
    }

    // Gradient background (handled in CSS / layout)
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
  }

  private getIsoPos(col: number, row: number) {
    const baseX = this.scale.width / 2 + this.camOffsetX;
    const baseY = 80 + this.camOffsetY;
    return {
      x: baseX + (col - row) * (TILE_W / 2),
      y: baseY + (col + row) * (TILE_H / 2),
    };
  }

  private isWalkable(gridX: number, gridY: number): boolean {
    const col = Math.round(gridX);
    const row = Math.round(gridY);
    if (row < 0 || row >= MAP_LAYOUT.length || col < 0 || col >= MAP_LAYOUT[0].length) return false;
    return TILE_WALKABLE[MAP_LAYOUT[row][col]] ?? false;
  }

  update(time: number, delta: number) {
    // Movement
    let dx = 0, dy = 0;
    let newDir = this.localDirection;

    if (this.cursors.up.isDown) { dy = -this.moveSpeed; newDir = 'up'; }
    if (this.cursors.down.isDown) { dy = this.moveSpeed; newDir = 'down'; }
    if (this.cursors.left.isDown) { dx = -this.moveSpeed; newDir = 'left'; }
    if (this.cursors.right.isDown) { dx = this.moveSpeed; newDir = 'right'; }

    if (dx !== 0 || dy !== 0) {
      const nextX = this.localX + dx;
      const nextY = this.localY + dy;

      if (this.isWalkable(nextX, this.localY)) this.localX = nextX;
      if (this.isWalkable(this.localX, nextY)) this.localY = nextY;
      this.localDirection = newDir;
    }

    // Update local avatar target
    const localAvatar = this.avatarManager.getAvatar(this.localAvatarId);
    if (localAvatar) {
      localAvatar.targetX = this.localX;
      localAvatar.targetY = this.localY;
      localAvatar.direction = this.localDirection;
    }

    // Update all avatars
    this.avatarManager.update(delta);

    // Rebuild map camera offset (need to re-draw tiles with camera)
    // For now we use scrollX/Y camera shift
    this.cameras.main.scrollX = -this.camOffsetX;
    this.cameras.main.scrollY = -this.camOffsetY;

    // Sync position
    this.syncTimer += delta;
    if (this.syncTimer >= SYNC_INTERVAL) {
      this.syncTimer = 0;
      this.events_cb?.onPositionUpdate(this.localX, this.localY, this.localDirection);
    }
  }

  // Called from React to update remote avatars
  updateRemoteAvatar(pos: AvatarPosition) {
    if (pos.user_id === this.localAvatarId) return;
    this.avatarManager.updateAvatar(
      pos.user_id,
      pos.x,
      pos.y,
      pos.direction,
      pos.name || 'User',
      pos.avatar_color || '#6c63ff'
    );
  }

  removeRemoteAvatar(userId: string) {
    this.avatarManager.removeAvatar(userId);
  }

  showChatMessage(userId: string, message: string) {
    this.avatarManager.showChatBubble(userId, message);
  }

  getLocalPosition() {
    return { x: this.localX, y: this.localY };
  }
}
