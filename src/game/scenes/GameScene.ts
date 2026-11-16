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
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<string, Phaser.Input.Keyboard.Key>;

  // Para distinguir clic (mover) de arrastre (mover cámara)
  private downAt?: { x: number; y: number; time: number };

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
  // True cuando un pointerdown detuvo el seguimiento de la cámara; se
  // reanuda al caminar (WASD/flechas), al hacer clic o al cambiar el zoom.
  private cameraFollowSuspended: boolean = false;
  // Acumulador para la poda periódica de avatares remotos sin actividad.
  private pruneTimer: number = 0;

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

    // Input — ANTES solo existían las flechas: el README prometía WASD y
    // no funcionaba. En móvil no hay teclado físico: sin esta guarda,
    // `this.input.keyboard!` podía ser nulo y romper la escena.
    const kb = this.input.keyboard;
    if (kb) {
      this.cursors = kb.createCursorKeys();
      this.wasd = kb.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
      kb.addCapture('UP,DOWN,LEFT,RIGHT');
      kb.removeCapture('SPACE');
    }

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
      this.cameraFollowSuspended = true;
      this.downAt = { x: ptr.x, y: ptr.y, time: this.time.now };
    });
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      this.isDragging = false;
      // ANTES cualquier pointerdown teletransportaba al avatar (había un
      // segundo listener que llamaba a handleWorldClick), así que arrastrar
      // la cámara también te movía. Ahora solo es clic para moverse si fue
      // un toque corto y casi sin desplazamiento; si fue un arrastre, no.
      if (ptr.button === 0 && this.downAt) {
        const moved = Math.hypot(ptr.x - this.downAt.x, ptr.y - this.downAt.y);
        const dt = this.time.now - this.downAt.time;
        if (moved < 10 && dt < 350) this.handleWorldClick(ptr);
      }
      this.downAt = undefined;
    });
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

  /** Reanuda el seguimiento de la cámara sobre el avatar local. */
  private resumeFollow() {
    const localAvatar = this.avatarManager.getAvatar(this.localAvatarId);
    if (!localAvatar) return;
    this.cameras.main.startFollow(localAvatar.compositor.container, true, 0.1, 0.1);
    if (this.mapScene?.cameras?.main) {
      this.mapScene.cameras.main.startFollow(localAvatar.compositor.container, true, 0.1, 0.1);
    }
    this.cameraFollowSuspended = false;
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
      this.resumeFollow();
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
    this.resumeFollow();
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
    // ANTES las teclas se leían siempre: escribir en el chat (WASD o
    // flechas dentro del input) también movía el avatar. Si el foco está
    // en un campo de texto, el teclado es del chat, no del juego.
    const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
    const isTyping = !!activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

    let dx = 0, dy = 0;
    let newDir = this.localDirection;

    const up = !isTyping && (this.cursors?.up.isDown || this.wasd?.W?.isDown);
    const down = !isTyping && (this.cursors?.down.isDown || this.wasd?.S?.isDown);
    const left = !isTyping && (this.cursors?.left.isDown || this.wasd?.A?.isDown);
    const right = !isTyping && (this.cursors?.right.isDown || this.wasd?.D?.isDown);

    if (up)    { dy -= 1; newDir = 'up'; }
    if (down)  { dy += 1; newDir = 'down'; }
    if (left)  { dx -= 1; newDir = 'left'; }
    if (right) { dx += 1; newDir = 'right'; }

    if (dx !== 0 || dy !== 0) {
      // ANTES el paso era fijo por frame (0.06): a 120 fps se caminaba al
      // doble que a 60. Ahora se escala por `delta` tomando 60 fps como
      // referencia (0.06 * 60 = 3.6 casillas/s). El `delta` se limita a
      // 100 ms para que un frame largo (pestaña inactiva) no teletransporte
      // al avatar atravesando muros.
      // La diagonal también era ~41% más rápida por no normalizar el
      // vector; ahora (dx, dy) es unitario en cualquier dirección.
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      const step = this.moveSpeed * Math.min(delta, 100) / (1000 / 60);
      const nextX = this.localX + dx * step;
      const nextY = this.localY + dy * step;
      if (this.isWalkable(nextX, this.localY)) this.localX = nextX;
      if (this.isWalkable(this.localX, nextY)) this.localY = nextY;
      this.localDirection = newDir;

      // Tras arrastrar la cámara, el seguimiento solo volvía con clic o
      // zoom: al caminar con el teclado también se reanuda.
      if (this.cameraFollowSuspended) this.resumeFollow();
    }

    const localAvatar = this.avatarManager.getAvatar(this.localAvatarId);
    if (localAvatar) {
      localAvatar.targetX = this.localX;
      localAvatar.targetY = this.localY;
      localAvatar.direction = this.localDirection;
    }

    this.avatarManager.update(delta);

    // Poda de avatares fantasma: si un remoto deja de enviar su posición
    // (cerró la pestaña sin salir), su fila queda en `avatar_positions`
    // y su avatar se quedaba congelado para siempre. Cada 5 s se eliminan
    // los que llevan más de 45 s sin actividad, el mismo corte que el HUD
    // usa para la lista de personas en línea.
    this.pruneTimer += delta;
    if (this.pruneTimer >= 5000) {
      this.pruneTimer = 0;
      this.avatarManager.pruneInactiveAvatars(45000, this.localAvatarId);
    }

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
