import Phaser from 'phaser';
import { IsometricScene } from '@/game/scenes/IsometricScene';
import { AvatarManager } from '@/game/AvatarManager';
import { MAP_LAYOUT, TILE_WALKABLE } from '@/game/map';
import type { UserProfile, AvatarPosition, AvatarConfig } from '@/lib/types';
import { DEFAULT_AVATAR_CONFIG } from '@/lib/types';
import { AvatarCompositor } from '@/game/AvatarCompositor';

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
  private avatarConfig?: AvatarConfig;

  // Camera
  private isDragging: boolean = false;
  private dragStart?: { x: number; y: number; scrollX: number; scrollY: number };

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { profile: UserProfile; events: GameSceneEvents; avatarConfig?: AvatarConfig }) {
    this.userProfile = data.profile;
    this.events_cb = data.events;
    this.localAvatarId = data.profile.id;
    this.avatarConfig = data.avatarConfig;
  }

  preload() {
    if (this.avatarConfig) {
      AvatarCompositor.preloadConfig(this, this.avatarConfig);
    } else {
      AvatarCompositor.preloadConfig(this, {
        ...DEFAULT_AVATAR_CONFIG,
        user_id: this.localAvatarId,
      });
    }
  }

  create() {
    // Launch the tile layer scene behind this one
    this.scene.launch('IsometricScene');
    this.scene.sendToBack('IsometricScene');

    this.mapScene = this.scene.get('IsometricScene') as IsometricScene;

    this.avatarManager = new AvatarManager(this, this.getIsoPos.bind(this));

    // Ambient Lighting Overlay (Night/Cozy mode)
    const ambient = this.add.rectangle(0, 0, this.scale.width * 2, this.scale.height * 2, 0x1a2b4c, 0.4);
    ambient.setOrigin(0, 0);
    ambient.setScrollFactor(0);
    ambient.setBlendMode(Phaser.BlendModes.MULTIPLY);
    ambient.setDepth(1000); // Above avatars
    
    // Add resize listener to keep overlay full screen
    this.scale.on('resize', (gameSize: any) => {
      ambient.setSize(gameSize.width * 2, gameSize.height * 2);
    });


    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.input.keyboard!.removeCapture('SPACE');

    // Camera drag (optional free look)
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.dragStart = { x: ptr.x, y: ptr.y, scrollX: this.cameras.main.scrollX, scrollY: this.cameras.main.scrollY };
      this.cameras.main.stopFollow();
      this.mapScene.cameras.main.stopFollow();
    });
    this.input.on('pointerup', () => { this.isDragging = false; });
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (this.isDragging && this.dragStart) {
        const sx = this.dragStart.scrollX + (this.dragStart.x - ptr.x);
        const sy = this.dragStart.scrollY + (this.dragStart.y - ptr.y);
        this.cameras.main.scrollX = sx;
        this.cameras.main.scrollY = sy;
        this.mapScene.cameras.main.scrollX = sx;
        this.mapScene.cameras.main.scrollY = sy;
      }
    });

    // ---- Mouse Wheel Zoom ----
    this.input.on('wheel', (_ptr: Phaser.Input.Pointer, _gos: any, _dx: number, dy: number) => {
      this.adjustZoom(dy > 0 ? -0.1 : 0.1);
    });

    // Create local avatar
    if (this.userProfile) {
      const config: AvatarConfig = this.avatarConfig ?? {
        ...DEFAULT_AVATAR_CONFIG,
        user_id: this.userProfile.id,
      };
      const avatar = this.avatarManager.createAvatar(
        this.userProfile.id,
        this.userProfile.name,
        config,
        this.localX,
        this.localY
      );

      // Follow player automatically
      this.cameras.main.startFollow(avatar.compositor.container, true, 0.1, 0.1);
      if (this.mapScene && this.mapScene.cameras && this.mapScene.cameras.main) {
        this.mapScene.cameras.main.startFollow(avatar.compositor.container, true, 0.1, 0.1);
      }
    }

    // Gradient background (handled in CSS / layout)
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
  }

  private getIsoPos(col: number, row: number) {
    const baseX = this.scale.width / 2;
    const baseY = 80;
    return {
      x: baseX + (col - row) * (TILE_W / 2),
      y: baseY + (col + row) * (TILE_H / 2),
    };
  }

  /** Adjust camera zoom. Delta > 0 = zoom in, Delta < 0 = zoom out */
  public adjustZoom(delta: number) {
    const MIN_ZOOM = 0.4;
    const MAX_ZOOM = 3.0;
    const current = this.cameras.main.zoom;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + delta));
    this.cameras.main.setZoom(next);
    if (this.mapScene?.cameras?.main) {
      this.mapScene.cameras.main.setZoom(next);
    }
  }

  public getZoom(): number {
    return this.cameras.main.zoom;
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

    // If following player, keep map in sync automatically
    if (!this.isDragging) {
      if (this.mapScene && this.mapScene.cameras && this.mapScene.cameras.main) {
        this.mapScene.cameras.main.scrollX = this.cameras.main.scrollX;
        this.mapScene.cameras.main.scrollY = this.cameras.main.scrollY;
      }
    }

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
