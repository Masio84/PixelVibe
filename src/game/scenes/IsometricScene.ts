import Phaser from 'phaser';
import { getActiveGrid, TILE_WALKABLE } from '@/game/map';
import type { MapData } from '@/game/map';
import { VOXEL_ASSETS } from '@/game/voxelAssets';

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
  wallTop: 0x243e47,
  wallFront: 0x182a31,
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
    this.load.image('wall',            '/assets/tilesets/wall.png');

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

      // ── New furniture ──
      case 15: this.drawFloorTile(x, y, depth, 12); this.drawTree(x, y, depth);             break;
      case 16: this.drawFloorTile(x, y, depth, 12); this.drawBush(x, y, depth);             break;
      case 17: this.drawFloorTile(x, y, depth, 12); this.drawBikeRack(x, y, depth);         break;
      case 18: this.drawFloorTile(x, y, depth, 0);  this.drawVending(x, y, depth);          break;
      case 19: this.drawFloorTile(x, y, depth, 0);  this.drawReceptionCounter(x, y, depth); break;
      case 20: this.drawFloorTile(x, y, depth, 0);  this.drawMonitorDesk(x, y, depth);      break;
      case 21: this.drawFloorTile(x, y, depth, 0);  this.drawConferenceTable(x, y, depth);  break;
      case 22: this.drawFloorTile(x, y, depth, 0);  this.drawWhiteboard(x, y, depth);       break;
      case 23: this.drawFloorTile(x, y, depth, 0);  this.drawFlowerPot(x, y, depth);        break;
      case 24: this.drawFloorTile(x, y, depth, 0);  this.drawCoffeeMachine(x, y, depth);    break;
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
  private drawWallTile(x: number, y: number, depth: number) {
    const img = this.add.image(x, y - 16, 'wall');
    img.setDepth(depth);
    this.tileLayer.add(img);
  }

  private drawDesk(x: number, y: number, depth: number) {
    const img = this.add.image(x, y - 16, 'furniture', 'desk');
    img.setDepth(depth + 0.5);
    this.tileLayer.add(img);

    const glow = this.add.image(x - 8, y - 36, 'monitor_glow');
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setDepth(depth + 0.6);
    glow.setAlpha(0.8);
    this.tileLayer.add(glow);
    this.tweens.add({ targets: glow, alpha: 0.4, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const emitter = this.add.particles(x - 12, y - 26, 'particle_steam', {
      speed: { min: 5, max: 15 }, angle: { min: 250, max: 290 },
      scale: { start: 0.5, end: 0 }, alpha: { start: 0.5, end: 0 },
      lifespan: 1500, frequency: 400,
    });
    emitter.setDepth(depth + 0.7);
  }

  private drawChair(x: number, y: number, depth: number) {
    const img = this.add.image(x, y - 16, 'furniture', 'chair');
    img.setDepth(depth + 0.5);
    this.tileLayer.add(img);
  }

  private drawPlant(x: number, y: number, depth: number) {
    const img = this.add.image(x, y - 16, 'furniture', 'plant');
    img.setDepth(depth + 0.5);
    this.tileLayer.add(img);
  }

  private drawLamp(x: number, y: number, depth: number) {
    const img = this.add.image(x, y - 16, 'furniture', 'lamp');
    img.setDepth(depth + 0.5);
    this.tileLayer.add(img);

    const light = this.add.image(x, y + 8, 'light_mask');
    light.setBlendMode(Phaser.BlendModes.ADD);
    light.setDepth(depth + 0.6);
    this.tileLayer.add(light);
    this.tweens.add({ targets: light, alpha: 0.6, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private drawSofa(x: number, y: number, depth: number) {
    const img = this.add.image(x, y - 16, 'furniture', 'sofa');
    img.setDepth(depth + 0.5);
    this.tileLayer.add(img);
  }

  // ──────────────────────────────────────────────────────────────
  // NEW furniture drawers — procedural pixel art via Graphics
  // (Will be replaced by atlas sprites in Phase 2)
  // ──────────────────────────────────────────────────────────────

  /** Tree — tall isometric conifer with trunk */
  private drawTree(x: number, y: number, depth: number) {
    const g = this.add.graphics();
    // Shadow
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(x, y + 4, 28, 10);
    // Trunk
    g.fillStyle(0x6b4226);
    g.fillRect(x - 3, y - 10, 6, 16);
    // Canopy layers (dark to light green from bottom to top)
    g.fillStyle(0x1a6b2e);
    g.fillTriangle(x - 16, y - 4, x + 16, y - 4, x, y - 24);
    g.fillStyle(0x2e8c4a);
    g.fillTriangle(x - 13, y - 14, x + 13, y - 14, x, y - 34);
    g.fillStyle(0x43b97f);
    g.fillTriangle(x - 9, y - 24, x + 9, y - 24, x, y - 42);
    g.setDepth(depth + 0.8);
    this.tileLayer.add(g);
  }

  /** Bush — low rounded shrub with flowers */
  private drawBush(x: number, y: number, depth: number) {
    const g = this.add.graphics();
    // Shadow
    g.fillStyle(0x000000, 0.15);
    g.fillEllipse(x, y + 2, 22, 8);
    // Bush body
    g.fillStyle(0x2e8c4a);
    g.fillCircle(x, y - 8, 12);
    g.fillStyle(0x3ea05a);
    g.fillCircle(x - 6, y - 10, 8);
    g.fillCircle(x + 6, y - 10, 8);
    // Flowers
    g.fillStyle(0xff6584);
    g.fillCircle(x - 4, y - 14, 3);
    g.fillStyle(0xffd700);
    g.fillCircle(x + 5, y - 12, 2);
    g.fillStyle(0xffffff);
    g.fillCircle(x + 2, y - 16, 2);
    g.setDepth(depth + 0.6);
    this.tileLayer.add(g);
  }

  /** Bike rack with two bicycles */
  private drawBikeRack(x: number, y: number, depth: number) {
    const g = this.add.graphics();
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

  /** Vending machine — colorful with snacks */
  private drawVending(x: number, y: number, depth: number) {
    const g = this.add.graphics();
    // Body
    g.fillStyle(0x2a2a4a);
    g.fillRect(x - 14, y - 40, 28, 44);
    // Screen / display
    g.fillStyle(0x0d0d1a);
    g.fillRect(x - 10, y - 36, 20, 14);
    g.fillStyle(0x6c63ff, 0.8);
    g.fillRect(x - 9, y - 35, 18, 12);
    // Product slots
    g.fillStyle(0xff6584);
    g.fillRect(x - 10, y - 18, 8, 6);
    g.fillStyle(0xf9a826);
    g.fillRect(x + 2, y - 18, 8, 6);
    g.fillStyle(0x43b97f);
    g.fillRect(x - 10, y - 10, 8, 6);
    g.fillStyle(0x00b4d8);
    g.fillRect(x + 2, y - 10, 8, 6);
    // Coin slot
    g.fillStyle(0x888888);
    g.fillRect(x + 6, y - 26, 4, 2);
    // Glow
    const glow = this.add.image(x, y - 20, 'monitor_glow');
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setAlpha(0.3);
    glow.setDepth(depth + 0.7);
    this.tileLayer.add(glow);
    g.setDepth(depth + 0.6);
    this.tileLayer.add(g);
  }

  /** Reception counter — L-shaped desk */
  private drawReceptionCounter(x: number, y: number, depth: number) {
    const g = this.add.graphics();
    // Main counter surface (isometric)
    g.fillStyle(0xc8a96e);
    g.fillRect(x - 22, y - 12, 44, 8);
    // Counter front
    g.fillStyle(0x9c7a48);
    g.fillRect(x - 22, y - 4, 44, 6);
    // Counter side panel
    g.fillStyle(0xb08040);
    g.fillRect(x - 22, y - 16, 6, 16);
    // Computer on counter
    g.fillStyle(0x222222);
    g.fillRect(x + 4, y - 22, 12, 10);
    g.fillStyle(0x6c63ff, 0.9);
    g.fillRect(x + 5, y - 21, 10, 8);
    g.setDepth(depth + 0.5);
    this.tileLayer.add(g);
  }

  /** Monitor desk — office desk with large monitor */
  private drawMonitorDesk(x: number, y: number, depth: number) {
    const g = this.add.graphics();
    // Desk surface
    g.fillStyle(0xaf8b44);
    g.fillRect(x - 20, y - 10, 40, 8);
    // Desk front
    g.fillStyle(0x82642a);
    g.fillRect(x - 20, y - 2, 40, 6);
    // Monitor
    g.fillStyle(0x111111);
    g.fillRect(x - 10, y - 28, 20, 16);
    g.fillStyle(0x00d4ff, 0.9);
    g.fillRect(x - 9, y - 27, 18, 14);
    // Stand
    g.fillStyle(0x333333);
    g.fillRect(x - 2, y - 12, 4, 6);
    g.setDepth(depth + 0.5);
    this.tileLayer.add(g);

    const glow = this.add.image(x, y - 22, 'monitor_glow');
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setAlpha(0.6);
    glow.setDepth(depth + 0.6);
    this.tileLayer.add(glow);
    this.tweens.add({ targets: glow, alpha: 0.3, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Conference table — long rectangular table */
  private drawConferenceTable(x: number, y: number, depth: number) {
    const g = this.add.graphics();
    // Table surface
    g.fillStyle(0x8b6914);
    g.fillRect(x - 28, y - 10, 56, 10);
    // Table front
    g.fillStyle(0x6b5010);
    g.fillRect(x - 28, y, 56, 6);
    // Table legs
    g.fillStyle(0x444444);
    g.fillRect(x - 26, y, 4, 8);
    g.fillRect(x + 22, y, 4, 8);
    // Reflection on surface
    g.fillStyle(0xffffff, 0.08);
    g.fillRect(x - 24, y - 8, 48, 3);
    g.setDepth(depth + 0.5);
    this.tileLayer.add(g);
  }

  /** Whiteboard — wall-mounted board */
  private drawWhiteboard(x: number, y: number, depth: number) {
    const g = this.add.graphics();
    // Frame
    g.fillStyle(0x444444);
    g.fillRect(x - 18, y - 30, 36, 24);
    // Board surface
    g.fillStyle(0xf0f0f0);
    g.fillRect(x - 16, y - 28, 32, 20);
    // Marker lines
    g.fillStyle(0x3366cc);
    g.fillRect(x - 12, y - 24, 16, 2);
    g.fillRect(x - 8, y - 20, 12, 2);
    g.fillStyle(0xcc3333);
    g.fillRect(x + 2, y - 20, 8, 2);
    // Tray
    g.fillStyle(0x666666);
    g.fillRect(x - 16, y - 8, 32, 3);
    g.setDepth(depth + 0.5);
    this.tileLayer.add(g);
  }

  /** Flower pot — decorative plant in colored pot */
  private drawFlowerPot(x: number, y: number, depth: number) {
    const g = this.add.graphics();
    // Pot
    g.fillStyle(0xcc6633);
    g.fillRect(x - 6, y - 4, 12, 10);
    g.fillRect(x - 8, y - 6, 16, 4);
    // Soil
    g.fillStyle(0x3a2000);
    g.fillRect(x - 6, y - 4, 12, 3);
    // Stem
    g.fillStyle(0x2e8c4a);
    g.fillRect(x - 1, y - 16, 2, 14);
    // Flower
    g.fillStyle(0xff6584);
    g.fillCircle(x, y - 18, 4);
    g.fillStyle(0xffd700);
    g.fillCircle(x, y - 18, 2);
    g.setDepth(depth + 0.5);
    this.tileLayer.add(g);
  }

  /** Coffee machine — espresso maker */
  private drawCoffeeMachine(x: number, y: number, depth: number) {
    const g = this.add.graphics();
    // Body
    g.fillStyle(0x1a1a2e);
    g.fillRect(x - 12, y - 28, 24, 30);
    // Display panel
    g.fillStyle(0x333355);
    g.fillRect(x - 9, y - 25, 18, 8);
    g.fillStyle(0x6c63ff, 0.8);
    g.fillRect(x - 8, y - 24, 16, 6);
    // Brew head
    g.fillStyle(0x888888);
    g.fillCircle(x, y - 10, 5);
    // Cup area
    g.fillStyle(0x333333);
    g.fillRect(x - 8, y, 16, 4);
    // Drip tray
    g.fillStyle(0x555555);
    g.fillRect(x - 10, y + 2, 20, 3);
    // Steam
    const steam = this.add.particles(x, y - 30, 'particle_steam', {
      speed: { min: 3, max: 10 }, angle: { min: 260, max: 280 },
      scale: { start: 0.3, end: 0 }, alpha: { start: 0.6, end: 0 },
      lifespan: 1000, frequency: 600,
    });
    steam.setDepth(depth + 0.8);
    g.setDepth(depth + 0.6);
    this.tileLayer.add(g);
  }

  /** TV Screen — large mounted display */
  private drawTVScreen(x: number, y: number, depth: number) {
    const g = this.add.graphics();
    // Bezel
    g.fillStyle(0x111111);
    g.fillRect(x - 22, y - 34, 44, 28);
    // Screen
    g.fillStyle(0x1a3a5c);
    g.fillRect(x - 20, y - 32, 40, 24);
    // Content lines
    g.fillStyle(0x4488cc, 0.6);
    g.fillRect(x - 16, y - 28, 32, 3);
    g.fillRect(x - 16, y - 22, 24, 3);
    g.fillRect(x - 16, y - 16, 20, 3);
    // Stand
    g.fillStyle(0x333333);
    g.fillRect(x - 4, y - 6, 8, 8);
    g.fillRect(x - 10, y + 2, 20, 4);
    // Screen glow
    const glow = this.add.image(x, y - 20, 'monitor_glow');
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setAlpha(0.5);
    glow.setScale(1.5, 1);
    glow.setDepth(depth + 0.7);
    this.tileLayer.add(glow);
    this.tweens.add({ targets: glow, alpha: 0.25, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    g.setDepth(depth + 0.6);
    this.tileLayer.add(g);
  }

  private drawVoxelProp(x: number, y: number, depth: number, type: number) {
    const img = this.add.image(x, y - 16, `voxel_${type}`);
    img.setDepth(depth + 0.5);
    // Voxel renders are often larger, we may need to scale them
    // but we already resized them to 64x64. 
    // However, isometric height usually means we should offset Y more.
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
    const col = Math.floor(gridX);
    const row = Math.floor(gridY);
    if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) return false;
    return TILE_WALKABLE[grid[row][col]] ?? false;
  }
}
