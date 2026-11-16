import Phaser from 'phaser';
import { getActiveGrid, TILE_WALKABLE } from '@/game/map';
import type { MapData } from '@/game/map';
import { VOXEL_ASSETS, VOXEL_METRICS, VOXEL_TARGET_H } from '@/game/voxelAssets';

// ---- Color palette ----
const COLORS = {
  floorLight: 0x8cccd0,
  floorDark: 0x6bb5bc,
  openLight: 0xa1a1aa,
  openDark: 0x71717a,
  meetLight: 0xc4b5fd,
  meetDark: 0x8b5cf6,
  breakLight: 0xfef08a,
  breakDark: 0xfacc15,
  quietLight: 0x93c5fd,
  quietDark: 0x3b82f6,
  terrLight: 0x86efac,
  terrDark: 0x22c55e,
  wallTop: 0x3d6b7a,
  wallSide: 0x2c4b57,
  wallFront: 0x1d333d,
  deskTop: 0xaf8b44,
  deskFront: 0x82642a,
  chairBack: 0x333333,
  chairSeat: 0x444444,
  plantPot: 0xcca687,
  plantLeaf: 0x2e8c4a,
  lampPole: 0xaaaaaa,
  lampHead: 0xfff9cc,
  sofaBody: 0xe0607e,
  sofaBack: 0xb53b58,
};

const TILE_W = 64;
const TILE_H = 32;

export class IsometricScene extends Phaser.Scene {
  private tileLayer!: Phaser.GameObjects.Container;
  private mapData?: MapData;

  constructor() {
    super({ key: 'IsometricScene' });
  }

  /** Called by GameScene to inject dynamic map data before create() */
  setMapData(data: MapData) {
    this.mapData = data;
  }

  preload() {
    this.load.image('floor_reception', '/assets/tilesets/floor_reception.png');
    this.load.image('floor_open',      '/assets/tilesets/floor_open.png');
    this.load.image('floor_meet',      '/assets/tilesets/floor_meet.png');
    this.load.image('floor_break',     '/assets/tilesets/floor_break.png');
    this.load.image('floor_quiet',     '/assets/tilesets/floor_quiet.png');
    this.load.image('floor_terr',      '/assets/tilesets/floor_terr.png');
    this.load.image('floor_garden',    '/assets/tilesets/floor_garden.png');
    this.load.image('floor_lobby',     '/assets/tilesets/floor_lobby.png');
    this.load.image('floor_private',   '/assets/tilesets/floor_private.png');
    // 'wall' ya no se carga: el muro es procedural (drawWallTile, Fase 3B)
    // porque wall.png era un único color plano sin volumen.

    this.load.atlas('furniture',  '/assets/furniture/furniture_atlas.png',
                                  '/assets/furniture/furniture_atlas.json');
    this.load.atlas('furniture2', '/assets/furniture/furniture_atlas2.png',
                                  '/assets/furniture/furniture_atlas2.json');

    // FX
    this.load.image('light_mask',    '/assets/fx/light_mask.png');
    this.load.image('monitor_glow',  '/assets/fx/monitor_glow.png');
    this.load.image('particle_steam','/assets/fx/particle_steam.png');
    this.load.image('particle_leaf', '/assets/fx/particle_leaf.png');

    // Preload voxel props
    Object.entries(VOXEL_ASSETS).forEach(([id, info]) => {
      this.load.image(`voxel_${id}`, `/assets/props/voxel/${info.file}`);
    });
  }

  create() {
    this.tileLayer = this.add.container(0, 0);
    this.drawMap();
  }

  /** Rebuild the entire map (called when admin changes layout) */
  reloadMap(data: MapData) {
    this.mapData = data;
    this.tileLayer.removeAll(true);
    this.drawMap();
  }

  private getGrid(): number[][] {
    return this.mapData?.grid ?? getActiveGrid();
  }

  private getIsoPos(col: number, row: number) {
    const screenX = (this.scale.width / 2) + (col - row) * (TILE_W / 2);
    const screenY = 80 + (col + row) * (TILE_H / 2);
    return { x: screenX, y: screenY };
  }

  drawMap() {
    const grid = this.getGrid();
    const rows = grid.length;
    const cols = grid[0].length;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tile = grid[row][col];
        const { x, y } = this.getIsoPos(col, row);
        this.drawTile(tile, x, y, col, row);
      }
    }

    this.drawZoneLabels();
  }

  /**
   * Dibuja el nombre de cada zona (MapData.zones) en el centro de su
   * rectángulo, como etiqueta con fondo semitransparente y texto pixel.
   * Se llama desde drawMap(), así que reloadMap() la reconstruye junto
   * con el resto del mapa cuando el admin cambia el layout. La etiqueta
   * es solo visual (no intercepta clics) y su profundidad sigue la de su
   * casilla central para no tapar avatares ni muebles de otras zonas.
   */
  private drawZoneLabels() {
    const zones = this.mapData?.zones ?? [];
    for (const zone of zones) {
      if (!zone.name) continue;
      const centerCol = zone.x + (zone.w - 1) / 2;
      const centerRow = zone.y + (zone.h - 1) / 2;
      const { x, y } = this.getIsoPos(centerCol, centerRow);

      const label = this.add.text(x, y - 6, zone.name, {
        fontFamily: 'var(--font-pixel), "Press Start 2P", monospace',
        fontSize: '9px',
        color: '#ffffff',
        backgroundColor: 'rgba(10, 10, 25, 0.65)',
        padding: { x: 6, y: 4 },
        align: 'center',
      }).setOrigin(0.5);
      label.setDepth(Math.round(centerCol + centerRow) + 0.5);
      this.tileLayer.add(label);
    }
  }

  private drawTile(type: number, x: number, y: number, col: number, row: number) {
    const depth = col + row;

    switch (type) {
      // ── Floors ──
      case 0:
      case 7:
      case 8:
      case 9:
      case 10:
      case 11:
      case 12:
      case 13:
      case 14:
        this.drawFloorTile(x, y, depth, type);
        break;

      // ── Furniture (existing) ──
      case 1: this.drawFloorTile(x, y, depth, 0);  this.drawDesk(x, y, depth);  break;
      case 2: this.drawFloorTile(x, y, depth, 0);  this.drawChair(x, y, depth); break;
      case 3: this.drawFloorTile(x, y, depth, 0);  this.drawPlant(x, y, depth); break;
      case 4: this.drawFloorTile(x, y, depth, 0);  this.drawLamp(x, y, depth);  break;
      case 5: this.drawFloorTile(x, y, depth, 0);  this.drawSofa(x, y, depth);  break;
      case 6: this.drawWallTile(x, y, depth);       break;

      // ── New furniture (Fase 3B: los dibujos procedurales con
      // Graphics pasaron a sprites voxel/atlas; ver nota en cada caso) ──
      // 15 Árbol → 141 Monstera (aprox.: no hay árbol en voxel/atlas)
      case 15: this.drawFloorTile(x, y, depth, 12); this.drawVoxelProp(x, y, depth, 141); break;
      // 16 Arbusto → 134 Planta en maceta (aprox.: no hay arbusto)
      case 16: this.drawFloorTile(x, y, depth, 12); this.drawVoxelProp(x, y, depth, 134); break;
      // 17 Bicicletero → SIN equivalente en voxel/atlas: se conserva el
      // dibujo procedural (único caso 15–25 sin sustituto; ver informe)
      case 17: this.drawFloorTile(x, y, depth, 12); this.drawBikeRack(x, y, depth);      break;
      // 18 Expendedora → 135 Máquina expendedora
      case 18: this.drawFloorTile(x, y, depth, 0);  this.drawVoxelProp(x, y, depth, 135); break;
      // 19 Mostrador de recepción → 136 Escritorio de cómputo (aprox.:
      // escritorio con monitor, como el mostrador anterior)
      case 19: this.drawFloorTile(x, y, depth, 0);  this.drawReceptionCounter(x, y, depth); break;
      // 20 Escritorio con monitor → 136 Escritorio de cómputo
      case 20: this.drawFloorTile(x, y, depth, 0);  this.drawMonitorDesk(x, y, depth);      break;
      // 21 Mesa de juntas → 149 Mesa de comedor (mesa larga)
      case 21: this.drawFloorTile(x, y, depth, 0);  this.drawVoxelProp(x, y, depth, 149); break;
      // 22 Pizarrón → 121 Pizarrón blanco
      case 22: this.drawFloorTile(x, y, depth, 0);  this.drawVoxelProp(x, y, depth, 121); break;
      // 23 Maceta → 134 Planta en maceta
      case 23: this.drawFloorTile(x, y, depth, 0);  this.drawVoxelProp(x, y, depth, 134); break;
      // 24 Cafetera → 133 Cafetera
      case 24: this.drawFloorTile(x, y, depth, 0);  this.drawCoffeeMachine(x, y, depth);    break;
      // 25 Pantalla/TV → 139 Pantalla / TV
      case 25: this.drawFloorTile(x, y, depth, 0);  this.drawTVScreen(x, y, depth);         break;

      default:
        if (type >= 100) {
          this.drawFloorTile(x, y, depth, 0); // Always draw floor under voxels
          this.drawVoxelProp(x, y, depth, type);
        }
        break;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Floor tile renderer — supports all floor types
  // ──────────────────────────────────────────────────────────────
  private drawFloorTile(x: number, y: number, depth: number, floorType: number) {
    const keyMap: Record<number, string> = {
      0:  'floor_reception',
      7:  'floor_open',
      8:  'floor_meet',
      9:  'floor_break',
      10: 'floor_quiet',
      11: 'floor_terr',
      12: 'floor_garden',
      13: 'floor_lobby',
      14: 'floor_private',
    };
    const key = keyMap[floorType] ?? 'floor_reception';

    const img = this.add.image(x, y, key);
    img.setDepth(depth);

    const isLight = (Math.floor(x / 10) + Math.floor(y / 10)) % 2 === 0;
    if (!isLight) img.setTint(0xdddddd);
    this.tileLayer.add(img);

    // Falling leaves on Terrace
    if (floorType === 11 && Math.random() < 0.08) {
      const emitter = this.add.particles(x, y - 60, 'particle_leaf', {
        speed: { min: 10, max: 30 },
        angle: { min: 45, max: 135 },
        scale: { start: 1, end: 0.5 },
        alpha: { start: 1, end: 0 },
        gravityY: 10,
        lifespan: 3000,
        frequency: 2000,
        rotate: { start: 0, end: 360 },
      });
      emitter.setDepth(depth + 1);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Existing furniture drawers
  // ──────────────────────────────────────────────────────────────
  /**
   * Muro isométrico con volumen (Fase 3B). Sustituye a wall.png, que era
   * un único color plano (36,62,71) sin textura ni cara superior.
   * Misma huella y punto de apoyo que el PNG anterior: base en `y`,
   * 32 px de ancho centrado en `x`. Altura visible 44 px (~1,7× el
   * avatar) con 3 caras: superior más clara, laterales sombreados,
   * juntas de panel y sombra en el suelo. Depth igual que antes (+0,0).
   */
  private drawWallTile(x: number, y: number, depth: number) {
    const g = this.add.graphics();
    // Sombra en el suelo
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(x, y + 4, 36, 9);
    // Cara superior (más clara, legible)
    g.fillStyle(COLORS.wallTop);
    g.fillPoints([
      { x, y: y - 44 }, { x: x + 16, y: y - 36 },
      { x, y: y - 28 }, { x: x - 16, y: y - 36 },
    ], true);
    // Cara izquierda (sombra media)
    g.fillStyle(COLORS.wallSide);
    g.fillPoints([
      { x: x - 16, y: y - 36 }, { x, y: y - 28 },
      { x, y }, { x: x - 16, y: y - 8 },
    ], true);
    // Cara derecha (más oscura)
    g.fillStyle(COLORS.wallFront);
    g.fillPoints([
      { x: x + 16, y: y - 36 }, { x, y: y - 28 },
      { x, y }, { x: x + 16, y: y - 8 },
    ], true);
    // Juntas de panel en ambas caras (textura mínima)
    g.lineStyle(1, 0x000000, 0.15);
    g.lineBetween(x - 16, y - 26, x, y - 18);
    g.lineBetween(x - 16, y - 16, x, y - 8);
    g.lineBetween(x + 16, y - 26, x, y - 18);
    g.lineBetween(x + 16, y - 16, x, y - 8);
    // Borde superior claro
    g.lineStyle(1, 0x7fb3c4, 0.5);
    g.lineBetween(x, y - 44, x + 16, y - 36);
    g.lineBetween(x, y - 44, x - 16, y - 36);
    g.setDepth(depth);
    this.tileLayer.add(g);
  }

  /**
   * Escritorio (tile 1). El frame 'desk' del atlas es un cuadrado plano
   * de color (32×32), no arte de escritorio: sustituido por el voxel 136
   * (escritorio de cómputo con monitor). Se conservan el glow del monitor
   * y el vapor, reposicionados a la geometría del voxel.
   */
  private drawDesk(x: number, y: number, depth: number) {
    this.drawVoxelProp(x, y, depth, 136);

    const glow = this.add.image(x, y - 6, 'monitor_glow');
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setDepth(depth + 0.6);
    glow.setAlpha(0.8);
    this.tileLayer.add(glow);
    this.tweens.add({ targets: glow, alpha: 0.4, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const emitter = this.add.particles(x - 10, y, 'particle_steam', {
      speed: { min: 5, max: 15 }, angle: { min: 250, max: 290 },
      scale: { start: 0.5, end: 0 }, alpha: { start: 0.5, end: 0 },
      lifespan: 1500, frequency: 400,
    });
    emitter.setDepth(depth + 0.7);
  }

  /** Silla (tile 2). Atlas 'chair' = cuadrado plano → voxel 117. */
  private drawChair(x: number, y: number, depth: number) {
    this.drawVoxelProp(x, y, depth, 117);
  }

  /** Planta (tile 3). Atlas 'plant' = cuadrado plano → voxel 134. */
  private drawPlant(x: number, y: number, depth: number) {
    this.drawVoxelProp(x, y, depth, 134);
  }

  /**
   * Lámpara (tile 4). Atlas 'lamp' = cuadrado plano → voxel 140
   * (lámpara de pie). Se conserva el halo de luz en el suelo.
   */
  private drawLamp(x: number, y: number, depth: number) {
    this.drawVoxelProp(x, y, depth, 140);

    const light = this.add.image(x, y + 8, 'light_mask');
    light.setBlendMode(Phaser.BlendModes.ADD);
    light.setDepth(depth + 0.6);
    this.tileLayer.add(light);
    this.tweens.add({ targets: light, alpha: 0.6, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Sofá (tile 5). Atlas 'sofa' = cuadrado plano → voxel 142. */
  private drawSofa(x: number, y: number, depth: number) {
    this.drawVoxelProp(x, y, depth, 142);
  }

  // ──────────────────────────────────────────────────────────────
  // Furniture 15–25 (Fase 3B) — los dibujos procedurales con Graphics
  // (rectángulos planos de un solo color) se sustituyeron por sprites
  // voxel/atlas. Solo queda procedural el bicicletero (tile 17), que no
  // tiene equivalente en voxel ni en atlas. Los casos 15, 16, 21, 22 y 23
  // llaman directamente a drawVoxelProp desde drawTile; los casos con
  // efectos (19, 20, 24, 25) conservan aquí su envoltorio con el FX.
  // ──────────────────────────────────────────────────────────────

  /**
   * Bicicletero (tile 17) — ÚNICO procedural que queda: no hay bicicletas
   * en voxel (100–149) ni en el atlas. Se conserva el dibujo y se le añade
   * la sombra de suelo que le faltaba (antes solo árbol/arbusto la tenían).
   */
  private drawBikeRack(x: number, y: number, depth: number) {
    const g = this.add.graphics();
    // Sombra en el suelo
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(x, y + 4, 30, 8);
    // Rack bar
    g.fillStyle(0x888888);
    g.fillRect(x - 20, y - 4, 40, 4);
    g.fillRect(x - 18, y - 12, 4, 12);
    g.fillRect(x + 14, y - 12, 4, 12);
    // Bike 1
    g.fillStyle(0x6c63ff);
    g.strokeCircle(x - 10, y - 2, 5);
    g.strokeCircle(x - 2, y - 2, 5);
    g.fillStyle(0x444444);
    g.fillRect(x - 13, y - 8, 16, 2);
    // Bike 2
    g.fillStyle(0xff6584);
    g.strokeCircle(x + 6, y - 2, 5);
    g.strokeCircle(x + 14, y - 2, 5);
    g.fillStyle(0x444444);
    g.fillRect(x + 3, y - 8, 16, 2);
    g.setDepth(depth + 0.5);
    this.tileLayer.add(g);
  }

  /**
   * Mostrador de recepción (tile 19) → voxel 136 (escritorio de cómputo):
   * escritorio con monitor, como el mostrador anterior. Aproximado: no
   * existe un mostrador en voxel/atlas.
   */
  private drawReceptionCounter(x: number, y: number, depth: number) {
    this.drawVoxelProp(x, y, depth, 136);
  }

  /**
   * Escritorio con monitor (tile 20) → voxel 136 (escritorio de cómputo).
   * Se conserva el glow del monitor, reposicionado a la geometría del voxel.
   */
  private drawMonitorDesk(x: number, y: number, depth: number) {
    this.drawVoxelProp(x, y, depth, 136);

    const glow = this.add.image(x, y - 6, 'monitor_glow');
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setAlpha(0.6);
    glow.setDepth(depth + 0.6);
    this.tileLayer.add(glow);
    this.tweens.add({ targets: glow, alpha: 0.3, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /**
   * Cafetera (tile 24) → voxel 133 (cafetera). Se conserva el vapor,
   * reposicionado a la parte superior del voxel.
   */
  private drawCoffeeMachine(x: number, y: number, depth: number) {
    this.drawVoxelProp(x, y, depth, 133);

    const steam = this.add.particles(x, y - 14, 'particle_steam', {
      speed: { min: 3, max: 10 }, angle: { min: 260, max: 280 },
      scale: { start: 0.3, end: 0 }, alpha: { start: 0.6, end: 0 },
      lifespan: 1000, frequency: 600,
    });
    steam.setDepth(depth + 0.8);
  }

  /**
   * Pantalla / TV (tile 25) → voxel 139 (pantalla / TV). Se conserva el
   * glow de la pantalla, reposicionado a la geometría del voxel.
   */
  private drawTVScreen(x: number, y: number, depth: number) {
    this.drawVoxelProp(x, y, depth, 139);

    const glow = this.add.image(x, y - 6, 'monitor_glow');
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setAlpha(0.5);
    glow.setScale(1.5, 1);
    glow.setDepth(depth + 0.7);
    this.tileLayer.add(glow);
    this.tweens.add({ targets: glow, alpha: 0.25, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /**
   * Dibuja un mueble voxel (IDs 100–149) con escala normalizada (Fase 3B).
   * Referencia: avatar visible 14×26 px = 1,0×. La altura objetivo depende
   * de la categoría del sprite (VOXEL_METRICS / VOXEL_TARGET_H en
   * voxelAssets.ts): bajo 21 px (~0,8×), escritorio 28 px (~1,1×),
   * medio 34 px (~1,3×), alto 42 px (~1,6×). La escala es objetivo /
   * altura real del contenido, así que cada sprite queda a su tamaño.
   * El punto de apoyo NO se desplaza: origen (0.5, 1) en la base y la
   * parte inferior del contenido cae siempre en y+16 (vértice inferior
   * del rombo del piso). Sombra de suelo en todos los muebles.
   * Depth: sombra +0,4, sprite +0,5 (igual que antes; avatar +0,9).
   */
  private drawVoxelProp(x: number, y: number, depth: number, type: number) {
    const metrics = VOXEL_METRICS[type];
    const targetH = metrics ? VOXEL_TARGET_H[metrics.cat] : 30;
    const contentH = metrics?.h ?? 64;
    const contentW = metrics?.w ?? 64;
    const contentBottom = metrics?.bottom ?? 64;
    const scale = targetH / contentH;

    // Sombra de suelo (debajo del sprite, encima del piso)
    const shadow = this.add.ellipse(
      x, y + 10, Math.max(14, contentW * scale * 0.9), 7, 0x000000, 0.2,
    );
    shadow.setDepth(depth + 0.4);
    this.tileLayer.add(shadow);

    // Base del contenido anclada en y+16: la parte transparente bajo el
    // contenido (64 - bottom) se compensa para que el apoyo no se mueva.
    const img = this.add.image(x, y + 16 + (64 - contentBottom) * scale, `voxel_${type}`);
    img.setOrigin(0.5, 1);
    img.setScale(scale);
    img.setDepth(depth + 0.5);
    this.tileLayer.add(img);
  }

  // ──────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────

  public getAvatarIsoPos(gridX: number, gridY: number) {
    return this.getIsoPos(gridX, gridY);
  }

  public isWalkable(gridX: number, gridY: number): boolean {
    const grid = this.getGrid();
    // Igual que isGridWalkable en map.ts (Math.round). ANTES usaba
    // Math.floor y ambas funciones podían discrepar en la misma casilla.
    const col = Math.round(gridX);
    const row = Math.round(gridY);
    if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) return false;
    return TILE_WALKABLE[grid[row][col]] ?? false;
  }
}
