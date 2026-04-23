import Phaser from 'phaser';
import { cartToIso, MAP_LAYOUT, TILE_WALKABLE } from '@/game/map';

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

  constructor() {
    super({ key: 'IsometricScene' });
  }

  preload() {
    this.load.image('floor_reception', '/assets/tilesets/floor_reception.png');
    this.load.image('floor_open', '/assets/tilesets/floor_open.png');
    this.load.image('floor_meet', '/assets/tilesets/floor_meet.png');
    this.load.image('floor_break', '/assets/tilesets/floor_break.png');
    this.load.image('floor_quiet', '/assets/tilesets/floor_quiet.png');
    this.load.image('floor_terr', '/assets/tilesets/floor_terr.png');
    this.load.image('wall', '/assets/tilesets/wall.png');

    this.load.atlas('furniture', '/assets/furniture/furniture_atlas.png', '/assets/furniture/furniture_atlas.json');

    // FX
    this.load.image('light_mask', '/assets/fx/light_mask.png');
    this.load.image('monitor_glow', '/assets/fx/monitor_glow.png');
    this.load.image('particle_steam', '/assets/fx/particle_steam.png');
    this.load.image('particle_leaf', '/assets/fx/particle_leaf.png');
  }

  create() {
    this.tileLayer = this.add.container(0, 0);
    this.drawMap();
  }

  private getIsoPos(col: number, row: number) {
    const screenX = (this.scale.width / 2) + (col - row) * (TILE_W / 2);
    const screenY = 80 + (col + row) * (TILE_H / 2);
    return { x: screenX, y: screenY };
  }

  drawMap() {
    const rows = MAP_LAYOUT.length;
    const cols = MAP_LAYOUT[0].length;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tile = MAP_LAYOUT[row][col];
        const { x, y } = this.getIsoPos(col, row);
        this.drawTile(tile, x, y, col, row);
      }
    }
  }

  private drawTile(type: number, x: number, y: number, col: number, row: number) {
    const depth = col + row;

    switch (type) {
      case 0:
      case 7:
      case 8:
      case 9:
      case 10:
      case 11:
        this.drawFloorTile(x, y, depth, type);
        break;
      case 1: this.drawFloorTile(x, y, depth, 0); this.drawDesk(x, y, depth); break;
      case 2: this.drawFloorTile(x, y, depth, 0); this.drawChair(x, y, depth); break;
      case 3: this.drawFloorTile(x, y, depth, 0); this.drawPlant(x, y, depth); break;
      case 4: this.drawFloorTile(x, y, depth, 0); this.drawLamp(x, y, depth); break;
      case 5: this.drawFloorTile(x, y, depth, 0); this.drawSofa(x, y, depth); break;
      case 6: this.drawWallTile(x, y, depth); break;
    }
  }

  private drawFloorTile(x: number, y: number, depth: number, floorType: number) {
    let key = 'floor_reception';
    if (floorType === 7) key = 'floor_open';
    else if (floorType === 8) key = 'floor_meet';
    else if (floorType === 9) key = 'floor_break';
    else if (floorType === 10) key = 'floor_quiet';
    else if (floorType === 11) key = 'floor_terr';

    const img = this.add.image(x, y, key);
    img.setDepth(depth);
    
    const isLight = (Math.floor(x / 10) + Math.floor(y / 10)) % 2 === 0;
    if (!isLight) img.setTint(0xdddddd);

    this.tileLayer.add(img);

    // Falling leaves on Terrace
    if (floorType === 11 && Math.random() < 0.1) {
      const leafEmitter = this.add.particles(x, y - 60, 'particle_leaf', {
        speed: { min: 10, max: 30 },
        angle: { min: 45, max: 135 },
        scale: { start: 1, end: 0.5 },
        alpha: { start: 1, end: 0 },
        gravityY: 10,
        lifespan: 3000,
        frequency: 2000,
        rotate: { start: 0, end: 360 }
      });
      leafEmitter.setDepth(depth + 1);
    }
  }

  private drawWallTile(x: number, y: number, depth: number) {
    const img = this.add.image(x, y - 16, 'wall');
    img.setDepth(depth);
    this.tileLayer.add(img);
  }

  private drawDesk(x: number, y: number, depth: number) {
    const img = this.add.image(x, y - 16, 'furniture', 'desk');
    img.setDepth(depth + 0.5);
    this.tileLayer.add(img);

    // Monitor glow
    const glow = this.add.image(x - 8, y - 36, 'monitor_glow');
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setDepth(depth + 0.6);
    glow.setAlpha(0.8);
    this.tileLayer.add(glow);

    this.tweens.add({
      targets: glow,
      alpha: 0.4,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Coffee Steam Particle Emitter
    const emitter = this.add.particles(x - 12, y - 26, 'particle_steam', {
      speed: { min: 5, max: 15 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 1500,
      frequency: 400
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

    // Glowing light effect
    const light = this.add.image(x, y + 8, 'light_mask');
    light.setBlendMode(Phaser.BlendModes.ADD);
    light.setDepth(depth + 0.6);
    this.tileLayer.add(light);
    
    // Breathing tween for light
    this.tweens.add({
      targets: light,
      alpha: 0.6,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private drawSofa(x: number, y: number, depth: number) {
    const img = this.add.image(x, y - 16, 'furniture', 'sofa');
    img.setDepth(depth + 0.5);
    this.tileLayer.add(img);
  }

  // Public method to get isometric position for avatars
  public getAvatarIsoPos(gridX: number, gridY: number) {
    return this.getIsoPos(gridX, gridY);
  }

  // Check if a grid position is walkable
  public isWalkable(gridX: number, gridY: number): boolean {
    const col = Math.floor(gridX);
    const row = Math.floor(gridY);
    if (row < 0 || row >= MAP_LAYOUT.length || col < 0 || col >= MAP_LAYOUT[0].length) return false;
    return TILE_WALKABLE[MAP_LAYOUT[row][col]] ?? false;
  }
}
