import Phaser from 'phaser';
import { IsometricScene } from '@/game/scenes/IsometricScene';
import { AvatarManager } from '@/game/AvatarManager';
import { isGridWalkable, setActiveMapData, DEFAULT_MAP_DATA } from '@/game/map';
import type { MapData } from '@/game/map';
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
  private mapData: MapData = DEFAULT_MAP_DATA;

  // Camera
  private isDragging: boolean = false;
  private dragStart?: { x: number; y: number; scrollX: number; scrollY: number };

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: {
    profile: UserProfile;
    events: GameSceneEvents;
    avatarConfig?: AvatarConfig;
    mapData?: MapData;
  }) {
    this.userProfile = data.profile;
    this.events_cb = data.events;
    this.localAvatarId = data.profile.id;
    this.avatarConfig = data.avatarConfig;
    this.mapData = data.mapData ?? DEFAULT_MAP_DATA;
    this.localX = this.mapData.spawn_x ?? 8;
    this.localY = this.mapData.spawn_y ?? 8;
    // Push map into the live reference so walkability checks use it
    setActiveMapData(this.mapData);
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
    // Launch the tile layer scene behind this one, passing map data
    this.scene.launch('IsometricScene');
    this.scene.sendToBack('IsometricScene');

    this.mapScene = this.scene.get('IsometricScene') as IsometricScene;
    this.mapScene.setMapData(this.mapData);

    this.avatarManager = new AvatarManager(this, this.getIsoPos.bind(this));

    // Ambient Lighting Overlay
    const ambient = this.add.rectangle(0, 0, this.scale.width * 2, this.scale.height * 2, 0x1a2b4c, 0.4);
    ambient.setOrigin(0, 0);
    ambient.setScrollFactor(0);
    ambient.setBlendMode(Phaser.BlendModes.MULTIPLY);
    ambient.setDepth(1000);

    this.scale.on('resize', (gameSize: any) => {
      ambient.setSize(gameSize.width * 2, gameSize.height * 2);
    });

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.input.keyboard!.addCapture('UP,DOWN,LEFT,RIGHT');
    this.input.keyboard!.removeCapture('SPACE');

    // Camera drag
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      // Focus game on click
      if (typeof window !== 'undefined') {
        (this.game.canvas as HTMLElement).focus();
      }

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

    // Mouse wheel zoom
    this.input.on('wheel', (ptr: Phaser.Input.Pointer, _gos: any, _dx: number, dy: number) => {
      this.adjustZoom(dy > 0 ? -0.1 : 0.1, ptr);
    });

    // Click to move (Mobile/Mouse)
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      // If we clicked on a UI element (handled by HTML), don't move
      // But Phaser captures everything. We'll use a simple coordinate check
      // or just allow it since the HUD is HTML on top.
      if (ptr.button === 0) { // Left click
         this.handleWorldClick(ptr);
      }
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

      this.cameras.main.startFollow(avatar.compositor.container, true, 0.1, 0.1);
      if (this.mapScene?.cameras?.main) {
        this.mapScene.cameras.main.startFollow(avatar.compositor.container, true, 0.1, 0.1);
      }
    }

    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
  }

  private handleWorldClick(ptr: Phaser.Input.Pointer) {
    // Convert screen click to iso grid coordinates
    // This is the inverse of getIsoPos
    const baseX = this.scale.width / 2;
    const baseY = 80;
    
    // x = baseX + (col - row) * (TILE_W / 2)
    // y = baseY + (col + row) * (TILE_H / 2)
    
    // Let's simplify and use the camera inverse
    const worldX = (ptr.x - this.cameras.main.centerX) / this.cameras.main.zoom + this.cameras.main.scrollX + this.cameras.main.centerX;
    const worldY = (ptr.y - this.cameras.main.centerY) / this.cameras.main.zoom + this.cameras.main.scrollY + this.cameras.main.centerY;
    
    // Iso to Grid:
    // relX = worldX - baseX
    // relY = worldY - baseY
    // col = (relX / (TILE_W/2) + relY / (TILE_H/2)) / 2
    // row = (relY / (TILE_H/2) - relX / (TILE_W/2)) / 2
    
    const relX = worldX - baseX;
    const relY = worldY - baseY;
    const targetCol = Math.round((relX / (TILE_W / 2) + relY / (TILE_H / 2)) / 2);
    const targetRow = Math.round((relY / (TILE_H / 2) - relX / (TILE_W / 2)) / 2);

    if (this.isWalkable(targetCol, targetRow)) {
      this.localX = targetCol;
      this.localY = targetRow;
      // Auto resume follow on click
      const localAvatar = this.avatarManager.getAvatar(this.localAvatarId);
      if (localAvatar) {
        this.cameras.main.startFollow(localAvatar.compositor.container, true, 0.1, 0.1);
        this.mapScene.cameras.main.startFollow(localAvatar.compositor.container, true, 0.1, 0.1);
      }
    }
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
  public adjustZoom(delta: number, _ptr?: Phaser.Input.Pointer) {
    const MIN_ZOOM = 0.4;
    const MAX_ZOOM = 3.0;
    const current = this.cameras.main.zoom;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + delta));
    
    this.cameras.main.setZoom(next);
    if (this.mapScene?.cameras?.main) {
      this.mapScene.cameras.main.setZoom(next);
    }

    // Centrar en el jugador después del zoom
    const localAvatar = this.avatarManager.getAvatar(this.localAvatarId);
    if (localAvatar) {
       this.cameras.main.startFollow(localAvatar.compositor.container, true, 0.1, 0.1);
       if (this.mapScene?.cameras?.main) {
         this.mapScene.cameras.main.startFollow(localAvatar.compositor.container, true, 0.1, 0.1);
       }
    }
  }

  public getZoom(): number {
    return this.cameras.main.zoom;
  }

  /** Check walkability against the live dynamic grid */
  private isWalkable(gridX: number, gridY: number): boolean {
    return isGridWalkable(gridX, gridY);
  }

  /** Called by React when admin changes the map layout (Realtime) */
  public reloadMap(data: MapData) {
    this.mapData = data;
    setActiveMapData(data);
    this.mapScene?.reloadMap(data);
  }

  update(_time: number, delta: number) {
    let dx = 0, dy = 0;
    let newDir = this.localDirection;

    if (this.cursors.up.isDown)    { dy = -this.moveSpeed; newDir = 'up'; }
    if (this.cursors.down.isDown)  { dy =  this.moveSpeed; newDir = 'down'; }
    if (this.cursors.left.isDown)  { dx = -this.moveSpeed; newDir = 'left'; }
    if (this.cursors.right.isDown) { dx =  this.moveSpeed; newDir = 'right'; }

    if (dx !== 0 || dy !== 0) {
      const nextX = this.localX + dx;
      const nextY = this.localY + dy;
      if (this.isWalkable(nextX, this.localY)) this.localX = nextX;
      if (this.isWalkable(this.localX, nextY)) this.localY = nextY;
      this.localDirection = newDir;
    }

    const localAvatar = this.avatarManager.getAvatar(this.localAvatarId);
    if (localAvatar) {
      localAvatar.targetX = this.localX;
      localAvatar.targetY = this.localY;
      localAvatar.direction = this.localDirection;
    }

    this.avatarManager.update(delta);

    if (!this.isDragging && this.mapScene?.cameras?.main) {
      this.mapScene.cameras.main.scrollX = this.cameras.main.scrollX;
      this.mapScene.cameras.main.scrollY = this.cameras.main.scrollY;
    }

    this.syncTimer += delta;
    if (this.syncTimer >= SYNC_INTERVAL) {
      this.syncTimer = 0;
      this.events_cb?.onPositionUpdate(this.localX, this.localY, this.localDirection);
    }
  }

  updateRemoteAvatar(pos: AvatarPosition, config?: AvatarConfig) {
    if (pos.user_id === this.localAvatarId) return;
    this.avatarManager.updateAvatar(
      pos.user_id,
      pos.x,
      pos.y,
      pos.direction,
      pos.name || 'User',
      pos.avatar_color || '#6c63ff',
      config
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
