import Phaser from 'phaser';

export interface TileData {
  x: number;
  y: number;
  type: 'floor' | 'wall' | 'furniture';
  furnitureType?: string;
  walkable: boolean;
}

// Isometric conversion helpers
export function cartToIso(cartX: number, cartY: number) {
  return {
    x: (cartX - cartY) * 32,
    y: (cartX + cartY) * 16,
  };
}

export function isoToCart(isoX: number, isoY: number) {
  return {
    x: isoX / 64 + isoY / 32,
    y: isoY / 32 - isoX / 64,
  };
}

// ---- Map layout 32×32 ----
// Floor Zones:
// 0: Recepción
// 7: Open Office
// 8: Meeting Room
// 9: Break Room
// 10: Quiet Zone
// 11: Terraza
// Furniture/Walls:
// 1 = desk, 2 = chair, 3 = plant, 4 = lamp, 5 = sofa, 6 = wall

function generateMap(): number[][] {
  const map: number[][] = Array(32).fill(0).map(() => Array(32).fill(0));
  
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      if (x <= 10 && y <= 10) map[y][x] = 0; // Recepción
      else if (x >= 11 && x <= 20 && y <= 20) map[y][x] = 7; // Open Office
      else if (x <= 10 && y >= 11 && y <= 20) map[y][x] = 8; // Meeting Room
      else if (x >= 21 && y <= 15) map[y][x] = 9; // Break Room
      else if (x >= 21 && y >= 16) map[y][x] = 10; // Quiet Zone
      else if (x <= 20 && y >= 21) map[y][x] = 11; // Terraza
    }
  }

  // Add walls along the edges
  for (let i = 0; i < 32; i++) {
    map[0][i] = 6;
    map[31][i] = 6;
    map[i][0] = 6;
    map[i][31] = 6;
  }

  // Add inner walls
  for (let x = 0; x <= 10; x++) map[11][x] = 6; // Rec/Meeting
  for (let y = 0; y <= 20; y++) map[y][10] = 6; // Rec/Meeting to Open Office
  for (let y = 0; y <= 31; y++) map[y][20] = 6; // OpenOffice/Terraza to BreakRoom/QuietZone
  for (let x = 0; x <= 20; x++) map[21][x] = 6; // Meeting/OpenOffice to Terraza
  for (let x = 21; x < 32; x++) map[16][x] = 6; // Break room to Quiet Zone

  // Add doors
  map[11][5] = 8; // Door to Meeting Room
  map[5][10] = 0; // Door to Open Office
  map[8][20] = 7; // Door to Break Room
  map[21][15] = 7; // Door to Terraza
  map[25][20] = 11; // Door to Quiet Zone from Terraza
  map[16][26] = 9; // Door to Quiet Zone from Break Room

  // Add some random furniture
  map[3][3] = 1; map[4][3] = 2; // Reception desk
  map[8][2] = 5; map[8][3] = 5; map[7][2] = 3; // Reception waiting area
  
  // Open office
  map[4][14] = 1; map[5][14] = 2;
  map[4][16] = 1; map[5][16] = 2;
  map[8][14] = 1; map[9][14] = 2;
  map[8][16] = 1; map[9][16] = 2;
  map[12][15] = 3; map[12][16] = 4;

  // Meeting room
  map[15][5] = 1; map[16][5] = 2;
  map[15][4] = 1; map[16][4] = 2;
  map[15][6] = 1; map[16][6] = 2;

  // Break room
  map[4][25] = 5; map[4][26] = 5; map[5][25] = 3;
  map[8][28] = 1; map[9][28] = 2;

  // Terraza (plants)
  map[24][4] = 3; map[24][8] = 3; map[24][12] = 3; map[24][16] = 3;

  return map;
}

export const MAP_LAYOUT: number[][] = generateMap();

export const TILE_WALKABLE: Record<number, boolean> = {
  0: true, // floor
  7: true, // floor
  8: true, // floor
  9: true, // floor
  10: true, // floor
  11: true, // floor
  1: false, // desk
  2: false, // chair
  3: false, // plant
  4: false, // lamp
  5: false, // sofa
  6: false, // wall
};
