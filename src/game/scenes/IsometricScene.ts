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

// Fase 5: altura del muro procedural (vértice superior sobre el centro
// de la casilla). El avatar al doble mide ~52 px (cabeza en ~-47), así
// que 44 px lo dejaba por debajo de la cabeza. Con 68 px el muro supera
// la cabeza en 21 px y su cara frontal vertical mide 52 px, igual que el
// avatar — la misma proporción que en Fase 4 (cara 28 px, avatar 26 px).
// El punto de apoyo no cambia: la base sigue en el rombo del tile.
const WALL_H = 68;

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
        // Fase 5: 9 → 12 px. Junto a sprites al doble, 9 px se veía
        // diminuto; 12 px se lee bien sin dominar la sala (una zona
        // abarca varias casillas de 64 px, la etiqueta no tapa el mapa).
        fontSize: '12px',
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
        // Puerta: hueco de piso en una fila de muros → umbral visible.
        const door = this.getDoorOrientation(col, row);
        if (door) this.drawDoorThreshold(x, y, depth, door);
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

    // Fase 4: ANTES la mitad de las casillas llevaba un tint 0xdddddd
    // pseudoaleatorio (damero por posición en pantalla) que moteaba los
    // pisos como sucios; los PNG de piso ya tienen su textura. Sin tint.
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
   * Muro isométrico con volumen (Fase 3B, continuo en Fase 4, más alto
   * en Fase 5: WALL_H = 68). ANTES cada casilla de muro era un cubo de
   * 32 px de ancho centrado en el tile: entre cubos vecinos quedaban
   * huecos por los que se veía el fondo (negro) y la fila no se leía
   * como pared. Ahora el muro cubre el rombo COMPLETO del tile (64×32):
   * la cara superior es el rombo entero con el vértice más alto a
   * WALL_H px sobre el centro y las dos caras visibles bajan hasta el
   * rombo base. Dos muros vecinos comparten arista exacta, así que una
   * fila se lee como pared continua, y un hueco (puerta) queda como
   * abertura sobre el piso, no como negro. Mismo punto de apoyo (base
   * en `y` / vértice inferior en `y+16`) y misma depth que antes; solo
   * crece hacia arriba, así que la oclusión (muro delante tapa avatar
   * detrás) sigue funcionando igual.
   */
  private drawWallTile(x: number, y: number, depth: number) {
    const g = this.add.graphics();
    // Vértices en Y: superior (y-WALL_H), medios (rombo superior
    // desplazado) e inferior del rombo superior (y-WALL_H+32). La cara
    // frontal vertical mide WALL_H-16 = 52 px, igual que el avatar.
    const top = y - WALL_H;
    const mid = y - WALL_H + 16;
    const low = y - WALL_H + 32;
    // Cara superior (más clara, legible): rombo completo del tile.
    g.fillStyle(COLORS.wallTop);
    g.fillPoints([
      { x, y: top }, { x: x + 32, y: mid },
      { x, y: low }, { x: x - 32, y: mid },
    ], true);
    // Cara izquierda / suroeste (sombra media): del rombo superior al
    // rombo base (vértices L y B del tile).
    g.fillStyle(COLORS.wallSide);
    g.fillPoints([
      { x: x - 32, y: mid }, { x, y: low },
      { x, y: y + 16 }, { x: x - 32, y },
    ], true);
    // Cara derecha / sureste (más oscura).
    g.fillStyle(COLORS.wallFront);
    g.fillPoints([
      { x, y: low }, { x: x + 32, y: mid },
      { x: x + 32, y }, { x, y: y + 16 },
    ], true);
    // Juntas de hilada a media altura en ambas caras (textura mínima):
    // de punto medio de arista vertical a punto medio de arista vertical.
    // Arista lateral: de (mid) a (y) → punto medio (mid+y)/2 = y-26;
    // arista frontal: de (low) a (y+16) → punto medio y-10.
    const midSide = (mid + y) / 2;
    const midFront = (low + y + 16) / 2;
    g.lineStyle(1, 0x000000, 0.15);
    g.lineBetween(x - 32, midSide, x, midFront);
    g.lineBetween(x + 32, midSide, x, midFront);
    // Borde superior claro
    g.lineStyle(1, 0x7fb3c4, 0.5);
    g.lineBetween(x, top, x + 32, mid);
    g.lineBetween(x, top, x - 32, mid);
    g.setDepth(depth);
    this.tileLayer.add(g);
  }

  /**
   * Orientación de la puerta en la casilla (col, row), o null si no es
   * puerta. Una puerta es una casilla de piso con muro a ambos lados en
   * la misma fila ('row': el muro corre variando la columna) o en la
   * misma columna ('col': el muro corre variando la fila). Sirve para
   * cualquier layout (también los que edita el admin), no solo el mapa
   * por defecto.
   */
  private getDoorOrientation(col: number, row: number): 'row' | 'col' | null {
    const grid = this.getGrid();
    const isWall = (c: number, r: number) =>
      r >= 0 && r < grid.length && c >= 0 && c < grid[0].length && grid[r][c] === 6;
    if (isWall(col - 1, row) && isWall(col + 1, row)) return 'row';
    if (isWall(col, row - 1) && isWall(col, row + 1)) return 'col';
    return null;
  }

  /**
   * Umbral de puerta (Fase 4): banda de madera sobre el piso de la
   * casilla, siguiendo la dirección del muro. Sin marca, el hueco en la
   * fila de muros se leía como un hueco negro más; con el umbral la
   * abertura se lee como paso entre salas. Depth +0,1: sobre el piso,
   * por debajo de avatares y muebles.
   */
  private drawDoorThreshold(x: number, y: number, depth: number, orientation: 'row' | 'col') {
    const g = this.add.graphics();
    // Dirección del muro en pantalla: por columna (+32,+16) o por fila
    // (-32,+16). La banda mide 60 px de largo (casi todo el tile, para
    // conectar visualmente con los muros vecinos) y 12 px de ancho.
    const dir = orientation === 'row' ? { x: 32, y: 16 } : { x: -32, y: 16 };
    const len = Math.hypot(dir.x, dir.y);
    const ax = (dir.x / len) * 30;
    const ay = (dir.y / len) * 30;
    const bx = (dir.y / len) * 6;
    const by = (-dir.x / len) * 6;
    const pts = [
      { x: x + ax + bx, y: y + ay + by },
      { x: x + ax - bx, y: y + ay - by },
      { x: x - ax - bx, y: y - ay - by },
      { x: x - ax + bx, y: y - ay + by },
    ];
    g.fillStyle(0x9a7b4f, 0.95);
    g.fillPoints(pts, true);
    g.lineStyle(1, 0x6b5636, 0.9);
    g.strokePoints(pts, true);
    g.setDepth(depth + 0.1);
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

    // Fase 5: el escritorio voxel ahora mide 56 px (parte superior en
    // y-40); el glow y el vapor suben con él para seguir sobre el
    // monitor / la taza en vez de quedar a media altura del mueble.
    const glow = this.add.image(x, y - 30, 'monitor_glow');
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setDepth(depth + 0.6);
    glow.setAlpha(0.8);
    this.tileLayer.add(glow);
    this.tweens.add({ targets: glow, alpha: 0.4, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const emitter = this.add.particles(x - 10, y - 32, 'particle_steam', {
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

    // Fase 5: glow en la zona del monitor (ver drawDesk).
    const glow = this.add.image(x, y - 30, 'monitor_glow');
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

    // Fase 5: la cafetera voxel ahora mide 56 px (parte superior en
    // y-40); el vapor sube a su parte superior.
    const steam = this.add.particles(x, y - 38, 'particle_steam', {
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

    // Fase 5: la TV voxel ahora mide 56 px (parte superior en y-40);
    // el glow sube a la zona de la pantalla.
    const glow = this.add.image(x, y - 30, 'monitor_glow');
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setAlpha(0.5);
    glow.setScale(1.5, 1);
    glow.setDepth(depth + 0.7);
    this.tileLayer.add(glow);
    this.tweens.add({ targets: glow, alpha: 0.25, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /**
   * Dibuja un mueble voxel (IDs 100–149) con escala normalizada (Fase 3B).
   * Referencia: avatar visible 28×52 px = 1,0× (Fase 5, doble que en
   * Fase 4). La altura objetivo depende de la categoría del sprite
   * (VOXEL_METRICS / VOXEL_TARGET_H en voxelAssets.ts): bajo 42 px
   * (~0,8×), escritorio 56 px (~1,1×), medio 68 px (~1,3×), alto 84 px
   * (~1,6×). La escala es objetivo / altura real del contenido, así que
   * cada sprite queda a su tamaño. El punto de apoyo NO se desplaza:
   * origen (0.5, 1) en la base y la parte inferior del contenido cae
   * siempre en y+16 (vértice inferior del rombo del piso). Sombra de
   * suelo en todos los muebles. Depth: sombra +0,4, sprite +0,5 (igual
   * que antes; avatar +0,9). Fase 5: el canvas voxel es 128×128 (antes
   * 64×64), así que el anclaje usa 128: con 64 los muebles flotaban
   * ~64 px sobre el piso.
   */
  private drawVoxelProp(x: number, y: number, depth: number, type: number) {
    const metrics = VOXEL_METRICS[type];
    const targetH = metrics ? VOXEL_TARGET_H[metrics.cat] : 30;
    const contentH = metrics?.h ?? 128;
    const contentW = metrics?.w ?? 128;
    const contentBottom = metrics?.bottom ?? 128;
    const scale = targetH / contentH;

    // Sombra de suelo (debajo del sprite, encima del piso)
    const shadow = this.add.ellipse(
      x, y + 10, Math.max(14, contentW * scale * 0.9), 7, 0x000000, 0.2,
    );
    shadow.setDepth(depth + 0.4);
    this.tileLayer.add(shadow);

    // Base del contenido anclada en y+16: la parte transparente bajo el
    // contenido (128 - bottom) se compensa para que el apoyo no se mueva.
    const img = this.add.image(x, y + 16 + (128 - contentBottom) * scale, `voxel_${type}`);
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
