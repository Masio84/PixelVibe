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
  // Velocidad base en casillas/s (Fase 3: 5,0; antes el paso fijo por
  // frame equivalía a 3,6 casillas/s). El movimiento usa velocidad con
  // aceleración/desaceleración en vez de paso fijo (ver update()).
  private moveSpeed: number = 5.0;
  // Fase 5: zoom por defecto 1,2 (antes 1,5). Con todo al doble, 1,5
  // dejaba al avatar de 52 px en ~78 px en pantalla y solo se veía
  // parte de una sala. Cálculo con el mapa 23×23 (mundo ~1472×800 px,
  // canvas = viewport completo): a 1,2 se ven 1600×900 px en 1920×1080
  // (todo el mapa con margen; avatar 62 px en pantalla, 5,8 % de la
  // altura) y 1138×640 px en 1366×768 (una zona + vecinas; avatar 62 px,
  // 8,1 %). Mínimo 0,9 (antes 0,7): a 0,9 el avatar sigue en 47 px en
  // pantalla —más que los 39 px del zoom por defecto de Fase 4— y en
  // 1366×768 cabe todo el mapa, así que nadie aleja hasta ver la
  // oficina como miniatura. Máximo 3,0 sin cambios.
  public static readonly DEFAULT_ZOOM = 1.2;
  public static readonly MIN_ZOOM = 0.9;
  public static readonly MAX_ZOOM = 3.0;
  // Aceleración 45 casillas/s²: 0→5 en ~0,11 s. Frenado 70 casillas/s²:
  // 5→0 en ~0,07 s (~0,18 casillas de deslizamiento): al soltar la tecla
  // el avatar se detiene en seco, sin patinar ("hielo" de Fase 2).
  private readonly MOVE_ACCEL: number = 45;
  private readonly MOVE_DECEL: number = 70;
  private localVelX: number = 0;
  private localVelY: number = 0;
  // Destino del clic para moverse: el avatar CAMINA hacia él (Fase 3).
  // Una tecla pulsada lo cancela; sin pathfinding: si hay un muro en
  // medio, el avatar se detiene en él.
  private clickTarget?: { x: number; y: number };
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

    // Ambient Lighting Overlay (Fase 4): el alfa era 0,4 y apagaba los
    // colores ~un tercio (filtro azul 0x1a2b4c en MULTIPLY). Se baja a
    // 0,15 como primer paso —conserva algo de ambiente sin matar el
    // color—; si aun así se ve frío, el siguiente paso es quitarlo.
    const ambient = this.add.rectangle(0, 0, this.scale.width * 2, this.scale.height * 2, 0x1a2b4c, 0.15);
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
      // OJO (bug del chat, Fase 3): `addKeys` captura las teclas por
      // defecto (enableCapture=true) y el KeyboardManager de Phaser llama
      // a `preventDefault()` en cada keydown de W/A/S/D. Eso impide la
      // acción por defecto del navegador —insertar la letra en el input
      // enfocado— y por eso al escribir "Prueba de movimiento" en el chat
      // se perdían la 'a' y la 'd'. Con `false` las teclas se siguen
      // leyendo (isDown) pero el input las recibe. El guard de `isTyping`
      // en update() ya evita que el avatar se mueva al escribir.
      // Las flechas SÍ se capturan (no escriben texto y así no hacen
      // scroll a la página); SPACE ya se quitaba de la captura en Fase 2.
      this.wasd = kb.addKeys('W,A,S,D', false) as Record<string, Phaser.Input.Keyboard.Key>;
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

      this.cameras.main.startFollow(avatar.compositor.container, true, 0.2, 0.2);
      if (this.mapScene?.cameras?.main) {
        this.mapScene.cameras.main.startFollow(avatar.compositor.container, true, 0.2, 0.2);
      }
      // El avatar local no se interpola: su posición dibujada es la
      // lógica (Fase 3, ver AvatarManager.update()).
      this.avatarManager.setLocalUserId(this.userProfile.id);
    }

    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

    // Zoom inicial (Fase 5): 1,2 en ambas cámaras (la del mapa y la de
    // los avatares van sincronizadas; ver adjustZoom).
    this.cameras.main.setZoom(GameScene.DEFAULT_ZOOM);
    if (this.mapScene?.cameras?.main) {
      this.mapScene.cameras.main.setZoom(GameScene.DEFAULT_ZOOM);
    }
  }

  /** Reanuda el seguimiento de la cámara sobre el avatar local. */
  private resumeFollow() {
    const localAvatar = this.avatarManager.getAvatar(this.localAvatarId);
    if (!localAvatar) return;
    this.cameras.main.startFollow(localAvatar.compositor.container, true, 0.2, 0.2);
    if (this.mapScene?.cameras?.main) {
      this.mapScene.cameras.main.startFollow(localAvatar.compositor.container, true, 0.2, 0.2);
    }
    this.cameraFollowSuspended = false;
  }

  /**
   * Recentra la cámara en el personaje de inmediato (botón «Centrar» del
   * HUD). Tras arrastrar, la oficina puede quedar fuera de pantalla y
   * antes solo se podía volver recargando: esto coloca la vista sobre el
   * avatar al instante y reanuda el seguimiento suave.
   */
  public centerCamera() {
    const localAvatar = this.avatarManager.getAvatar(this.localAvatarId);
    if (!localAvatar) return;
    const pos = this.getIsoPos(this.localX, this.localY);
    this.cameras.main.centerOn(pos.x, pos.y);
    if (this.mapScene?.cameras?.main) {
      this.mapScene.cameras.main.centerOn(pos.x, pos.y);
    }
    this.resumeFollow();
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

    // ANTES el clic teletransportaba la posición lógica al destino. Ahora
    // (Fase 3) solo fija el destino y el avatar CAMINA hacia él en
    // update() a velocidad de caminata, con las mismas comprobaciones de
    // colisión por eje. Sin pathfinding: si hay un muro en medio, el
    // avatar se detiene en él. Un clic nuevo reemplaza el destino; una
    // tecla pulsada lo cancela.
    if (this.isWalkable(targetCol, targetRow)) {
      this.clickTarget = { x: targetCol, y: targetRow };
      // Auto resume follow on click
      this.resumeFollow();
    }
  }

  /** Mueve `value` hacia `target` como mucho `maxDelta` (sin pasarse). */
  private approach(value: number, target: number, maxDelta: number): number {
    if (value < target) return Math.min(value + maxDelta, target);
    if (value > target) return Math.max(value - maxDelta, target);
    return value;
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
    // Fase 5: mínimo 0,9 y zoom por defecto 1,2 (DEFAULT_ZOOM); antes
    // mínimo 0,7 y defecto 1,5 con el avatar a la mitad de tamaño.
    const MIN_ZOOM = GameScene.MIN_ZOOM;
    const MAX_ZOOM = GameScene.MAX_ZOOM;
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

  /** Vuelve al zoom por defecto (botón de restablecer del HUD). */
  public resetZoom() {
    this.cameras.main.setZoom(GameScene.DEFAULT_ZOOM);
    if (this.mapScene?.cameras?.main) {
      this.mapScene.cameras.main.setZoom(GameScene.DEFAULT_ZOOM);
    }
    this.resumeFollow();
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

    // `dt` en segundos, limitado a 100 ms para que un frame largo
    // (pestaña inactiva) no teletransporte al avatar atravesando muros.
    const dt = Math.min(delta, 100) / 1000;

    if (dx !== 0 || dy !== 0) {
      // Teclado: una tecla pulsada cancela el destino del clic.
      this.clickTarget = undefined;
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      this.localDirection = newDir;
    } else if (this.clickTarget) {
      // Clic para moverse: camina hacia el destino a velocidad de
      // caminata. Sin pathfinding: si un muro bloquea el paso, el avatar
      // se detiene en él (ver abajo).
      const tx = this.clickTarget.x - this.localX;
      const ty = this.clickTarget.y - this.localY;
      const dist = Math.hypot(tx, ty);
      if (dist < 0.05) {
        // Llegada: colocar exactamente en el destino y parar en seco.
        this.localX = this.clickTarget.x;
        this.localY = this.clickTarget.y;
        this.localVelX = 0;
        this.localVelY = 0;
        this.clickTarget = undefined;
      } else {
        dx = tx / dist;
        dy = ty / dist;
        this.localDirection =
          Math.abs(tx) > Math.abs(ty)
            ? (tx > 0 ? 'right' : 'left')
            : (ty > 0 ? 'down' : 'up');
      }
    }

    // Velocidad con aceleración/desaceleración (Fase 3): ANTES el paso era
    // fijo por frame y la posición dibujada iba con lerp 0,08 detrás de la
    // lógica, lo que producía el deslizamiento ("hielo") al soltar la
    // tecla. Ahora la velocidad sube a 45 casillas/s² (0→5 en ~0,11 s) y
    // baja a 70 casillas/s² (5→0 en ~0,07 s, ~0,18 casillas de
    // deslizamiento): al soltar, el avatar se detiene en seco. La
    // diagonal sigue normalizada (vector unitario en cualquier dirección).
    const hasInput = dx !== 0 || dy !== 0;
    const maxDelta = (hasInput ? this.MOVE_ACCEL : this.MOVE_DECEL) * dt;
    this.localVelX = this.approach(this.localVelX, dx * this.moveSpeed, maxDelta);
    this.localVelY = this.approach(this.localVelY, dy * this.moveSpeed, maxDelta);

    const speed = Math.hypot(this.localVelX, this.localVelY);
    if (speed > 0.001) {
      const nextX = this.localX + this.localVelX * dt;
      const nextY = this.localY + this.localVelY * dt;
      let movedX = false;
      let movedY = false;
      // Colisión por eje, como antes: deslizarse junto a un muro sigue
      // funcionando y el eje bloqueado no arrastra al otro.
      if (this.isWalkable(nextX, this.localY)) { this.localX = nextX; movedX = true; }
      else { this.localVelX = 0; }
      if (this.isWalkable(this.localX, nextY)) { this.localY = nextY; movedY = true; }
      else { this.localVelY = 0; }
      // Clic: si un muro bloquea el avance en ambos ejes, se llegó tan
      // lejos como se puede; no quedarse empujando el muro para siempre.
      if (this.clickTarget && !movedX && !movedY) {
        this.clickTarget = undefined;
        this.localVelX = 0;
        this.localVelY = 0;
      }

      // Tras arrastrar la cámara, el seguimiento solo volvía con clic o
      // zoom: al caminar también se reanuda.
      if (this.cameraFollowSuspended) this.resumeFollow();
    }

    const localAvatar = this.avatarManager.getAvatar(this.localAvatarId);
    if (localAvatar) {
      localAvatar.targetX = this.localX;
      localAvatar.targetY = this.localY;
      localAvatar.direction = this.localDirection;
      // La animación de caminar para cuando la velocidad llega a cero
      // (AvatarManager la lee para el avatar local, que ya no usa lerp).
      localAvatar.moving = speed > 0.5;
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

  /**
   * Refresco en vivo del avatar PROPIO al cambiar de skin (Fase 3, parte A).
   * ANTES no existía: `updateRemoteAvatar` ignora el user_id local y el
   * avatar local solo se crea en `create()` con la config inicial, así que
   * el propio usuario solo veía su nueva skin al reentrar (los demás sí la
   * veían en vivo por Realtime). Esto reconstruye el avatar en su sitio,
   * sin remontar el juego ni reiniciar la posición al spawn: delega en
   * `avatarManager.updateAvatar`, que solo reconstruye los sprites si el
   * JSON de config cambió. Las texturas nuevas se cargan antes de aplicar,
   * con el mismo patrón que el camino de remotos en PhaserGame.
   */
  public updateLocalAvatarConfig(config: AvatarConfig) {
    if (!this.avatarManager || !this.userProfile) return;
    this.avatarConfig = config;
    const apply = () => {
      // Si llegó otra config mientras se cargaban las texturas, esa es la
      // vigente y esta aplicación quedaría obsoleta.
      if (this.avatarConfig !== config) return;
      this.avatarManager.updateAvatar(
        this.localAvatarId,
        this.localX,
        this.localY,
        this.localDirection,
        this.userProfile?.name ?? 'User',
        this.userProfile?.avatar_color ?? '#6c63ff',
        config
      );
    };
    const layers = [config.body, config.shoes, config.bottom, config.top, config.hair, ...(config.accessories ?? [])];
    let needsLoad = false;
    for (const key of layers) {
      if (key && !this.textures.exists(key)) {
        needsLoad = true;
        break;
      }
    }
    AvatarCompositor.preloadConfig(this, config);
    if (needsLoad) {
      this.load.once('complete', apply);
      this.load.start();
    } else {
      apply();
    }
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
