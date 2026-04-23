import Phaser from 'phaser';
import { cartToIso, MAP_LAYOUT, TILE_WALKABLE } from '@/game/map';

// ---- Color palette ----
const COLORS = {
  floorLight: 0x7ecac3,
  floorDark: 0x5ba8a0,
  wallTop: 0x2d4a52,
  wallFront: 0x1e3038,
  deskTop: 0x8b6914,
  deskFront: 0x6b5010,
  chairBack: 0xc45c2a,
  chairSeat: 0xe07840,
  plantPot: 0xb5651d,
  plantLeaf: 0x228b22,
  lampPole: 0x888888,
  lampHead: 0xffee88,
  sofaBody: 0x7b5ea7,
  sofaBack: 0x5a3d8a,
};

const TILE_W = 64;
const TILE_H = 32;

export class IsometricScene extends Phaser.Scene {
  private tileLayer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'IsometricScene' });
  }

  preload() {
    // We'll generate all graphics procedurally
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
      case 0: this.drawFloorTile(x, y, depth); break;
      case 1: this.drawFloorTile(x, y, depth); this.drawDesk(x, y, depth); break;
      case 2: this.drawFloorTile(x, y, depth); this.drawChair(x, y, depth); break;
      case 3: this.drawFloorTile(x, y, depth); this.drawPlant(x, y, depth); break;
      case 4: this.drawFloorTile(x, y, depth); this.drawLamp(x, y, depth); break;
      case 5: this.drawFloorTile(x, y, depth); this.drawSofa(x, y, depth); break;
      case 6: this.drawWallTile(x, y, depth); break;
    }
  }

  private drawIsoDiamond(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, w: number, h: number) {
    gfx.fillPoints([
      { x: cx, y: cy - h / 2 },
      { x: cx + w / 2, y: cy },
      { x: cx, y: cy + h / 2 },
      { x: cx - w / 2, y: cy },
    ], true);
  }

  private drawFloorTile(x: number, y: number, depth: number) {
    const g = this.add.graphics();
    g.setDepth(depth);

    // Alternating floor colors for checkerboard effect
    const isLight = (Math.floor(x / 10) + Math.floor(y / 10)) % 2 === 0;
    g.fillStyle(isLight ? COLORS.floorLight : COLORS.floorDark, 1);
    this.drawIsoDiamond(g, x, y, TILE_W, TILE_H);

    // Subtle border
    g.lineStyle(1, 0x000000, 0.08);
    g.strokePoints([
      { x, y: y - TILE_H / 2 },
      { x: x + TILE_W / 2, y },
      { x, y: y + TILE_H / 2 },
      { x: x - TILE_W / 2, y },
    ], true);

    this.tileLayer.add(g);
  }

  private drawWallTile(x: number, y: number, depth: number) {
    const g = this.add.graphics();
    g.setDepth(depth);
    const wallH = 28;

    // Wall top face
    g.fillStyle(COLORS.wallTop, 1);
    this.drawIsoDiamond(g, x, y - wallH, TILE_W, TILE_H);

    // Wall left face
    g.fillStyle(COLORS.wallFront, 1);
    g.fillPoints([
      { x: x - TILE_W / 2, y: y - wallH },
      { x, y: y - wallH + TILE_H / 2 },
      { x, y: y + TILE_H / 2 },
      { x: x - TILE_W / 2, y },
    ], true);

    // Wall right face
    g.fillStyle(0x253a42, 1);
    g.fillPoints([
      { x, y: y - wallH + TILE_H / 2 },
      { x: x + TILE_W / 2, y: y - wallH },
      { x: x + TILE_W / 2, y },
      { x, y: y + TILE_H / 2 },
    ], true);

    this.tileLayer.add(g);
  }

  private drawDesk(x: number, y: number, depth: number) {
    const g = this.add.graphics();
    g.setDepth(depth + 0.5);
    const h = 18;
    const w = 44, th = 22;

    // Desk top
    g.fillStyle(COLORS.deskTop, 1);
    g.fillPoints([
      { x, y: y - h - th / 2 },
      { x: x + w / 2, y: y - h },
      { x, y: y - h + th / 2 },
      { x: x - w / 2, y: y - h },
    ], true);

    // Left side
    g.fillStyle(COLORS.deskFront, 1);
    g.fillPoints([
      { x: x - w / 2, y: y - h },
      { x, y: y - h + th / 2 },
      { x, y: y + th / 2 - 4 },
      { x: x - w / 2, y },
    ], true);

    // Right side
    g.fillStyle(0x4a3808, 1);
    g.fillPoints([
      { x, y: y - h + th / 2 },
      { x: x + w / 2, y: y - h },
      { x: x + w / 2, y },
      { x, y: y + th / 2 - 4 },
    ], true);

    // Monitor
    g.fillStyle(0x111111, 1);
    g.fillRect(x - 8, y - h - 20, 16, 12);
    g.fillStyle(0x4488ff, 0.7);
    g.fillRect(x - 6, y - h - 18, 12, 8);

    this.tileLayer.add(g);
  }

  private drawChair(x: number, y: number, depth: number) {
    const g = this.add.graphics();
    g.setDepth(depth + 0.5);

    // Chair seat (isometric)
    g.fillStyle(COLORS.chairSeat, 1);
    g.fillPoints([
      { x, y: y - 10 },
      { x: x + 16, y: y - 2 },
      { x, y: y + 6 },
      { x: x - 16, y: y - 2 },
    ], true);

    // Chair back
    g.fillStyle(COLORS.chairBack, 1);
    g.fillRect(x - 5, y - 24, 10, 14);

    this.tileLayer.add(g);
  }

  private drawPlant(x: number, y: number, depth: number) {
    const g = this.add.graphics();
    g.setDepth(depth + 0.5);

    // Pot
    g.fillStyle(COLORS.plantPot, 1);
    g.fillTriangle(x - 8, y - 2, x + 8, y - 2, x, y + 10);
    g.fillStyle(0x8b4513, 1);
    g.fillRect(x - 8, y - 6, 16, 4);

    // Leaves
    g.fillStyle(COLORS.plantLeaf, 1);
    g.fillCircle(x, y - 18, 10);
    g.fillCircle(x - 8, y - 14, 7);
    g.fillCircle(x + 8, y - 14, 7);

    this.tileLayer.add(g);
  }

  private drawLamp(x: number, y: number, depth: number) {
    const g = this.add.graphics();
    g.setDepth(depth + 0.5);

    // Pole
    g.fillStyle(COLORS.lampPole, 1);
    g.fillRect(x - 2, y - 36, 4, 30);

    // Base
    g.fillStyle(0x666666, 1);
    g.fillEllipse(x, y - 4, 16, 8);

    // Head (shade)
    g.fillStyle(COLORS.lampHead, 1);
    g.fillTriangle(x - 12, y - 36, x + 12, y - 36, x, y - 50);
    g.fillStyle(0xffa040, 0.4);
    g.fillCircle(x, y - 38, 8);

    this.tileLayer.add(g);
  }

  private drawSofa(x: number, y: number, depth: number) {
    const g = this.add.graphics();
    g.setDepth(depth + 0.5);
    const w = 40, sh = 14, backH = 20;

    // Seat top
    g.fillStyle(COLORS.sofaBody, 1);
    g.fillPoints([
      { x, y: y - sh },
      { x: x + w / 2, y: y - sh / 2 },
      { x, y: y },
      { x: x - w / 2, y: y - sh / 2 },
    ], true);

    // Left front
    g.fillStyle(0x5a3d8a, 1);
    g.fillPoints([
      { x: x - w / 2, y: y - sh / 2 },
      { x, y },
      { x, y: y + 8 },
      { x: x - w / 2, y: y + 4 },
    ], true);

    // Right front
    g.fillStyle(0x3d2860, 1);
    g.fillPoints([
      { x, y },
      { x: x + w / 2, y: y - sh / 2 },
      { x: x + w / 2, y: y + 4 },
      { x, y: y + 8 },
    ], true);

    // Backrest
    g.fillStyle(COLORS.sofaBack, 1);
    g.fillPoints([
      { x: x - w / 2, y: y - sh / 2 - backH },
      { x, y: y - sh - backH },
      { x, y: y - sh },
      { x: x - w / 2, y: y - sh / 2 },
    ], true);

    this.tileLayer.add(g);
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
