import Phaser from 'phaser';

// ============================================================
// Types & Interfaces
// ============================================================

export interface MapZone {
  name: string;
  type: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FurnitureItem {
  id: string;
  type: number;
  x: number;
  y: number;
  rotation?: 0 | 1 | 2 | 3;
}

export interface MapData {
  id: string;
  name: string;
  width: number;
  height: number;
  grid: number[][];
  zones: MapZone[];
  furniture: FurnitureItem[];
  spawn_x?: number;
  spawn_y?: number;
}

export interface TileData {
  x: number;
  y: number;
  type: 'floor' | 'wall' | 'furniture';
  furnitureType?: string;
  walkable: boolean;
}

// ============================================================
// Isometric conversion helpers
// ============================================================

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

// ============================================================
// Tile type legend
// ============================================================
// Floors (walkable):
//  0: Reception (gray/marble)
//  7: Open Office (gray/dark)
//  8: Meeting Room (purple)
//  9: Break Room (yellow)
// 10: Quiet Zone (blue)
// 11: Terrace (green)
// 12: Garden (grass)
// 13: Lobby (warm wood)
// 14: Private Office (carpet)
//
// Furniture / Objects (non-walkable):
//  1: Desk
//  2: Chair
//  3: Plant
//  4: Lamp
//  5: Sofa
//  6: Wall
// 15: Tree
// 16: Bush
// 17: Bike Rack
// 18: Vending Machine
// 19: Reception Counter
// 20: Monitor Desk
// 21: Conference Table
// 22: Whiteboard
// 23: Flower Pot
// 24: Coffee Machine
// 25: TV Screen

export const TILE_WALKABLE: Record<number, boolean> = {
  // Floors
  0: true,
  7: true,
  8: true,
  9: true,
  10: true,
  11: true,
  12: true, // Garden
  13: true, // Lobby
  14: true, // Private office
  // Furniture / walls
  1: false, // desk
  2: false, // chair
  3: false, // plant
  4: false, // lamp
  5: false, // sofa
  6: false, // wall
  15: false, // tree
  16: false, // bush
  17: false, // bike rack
  18: false, // vending machine
  19: false, // reception counter
  20: false, // monitor desk
  21: false, // conference table
  22: false, // whiteboard
  23: false, // flower pot
  24: false, // coffee machine
  25: false, // tv screen
};

// ============================================================
// Default map generator (32×32) — Fallback if no DB layout
// ============================================================

function generateDefaultMap(): number[][] {
  const map: number[][] = Array(32).fill(0).map(() => Array(32).fill(0));

  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      if (x <= 10 && y <= 10) map[y][x] = 0;           // Recepción
      else if (x >= 11 && x <= 20 && y <= 20) map[y][x] = 7; // Open Office
      else if (x <= 10 && y >= 11 && y <= 20) map[y][x] = 8; // Meeting Room
      else if (x >= 21 && y <= 15) map[y][x] = 9;       // Break Room
      else if (x >= 21 && y >= 16) map[y][x] = 10;      // Quiet Zone
      else if (x <= 20 && y >= 21) map[y][x] = 11;      // Terraza
    }
  }

  // Outer walls
  for (let i = 0; i < 32; i++) {
    map[0][i] = 6;
    map[31][i] = 6;
    map[i][0] = 6;
    map[i][31] = 6;
  }

  // Inner walls
  for (let x = 0; x <= 10; x++) map[11][x] = 6;
  for (let y = 0; y <= 20; y++) map[y][10] = 6;
  for (let y = 0; y <= 31; y++) map[y][20] = 6;
  for (let x = 0; x <= 20; x++) map[21][x] = 6;
  for (let x = 21; x < 32; x++) map[16][x] = 6;

  // Doors
  map[11][5] = 8;
  map[5][10] = 0;
  map[8][20] = 7;
  map[21][15] = 7;
  map[25][20] = 11;
  map[16][26] = 9;

  // Furniture
  map[3][3] = 1; map[4][3] = 2;
  map[8][2] = 5; map[8][3] = 5; map[7][2] = 3;
  map[4][14] = 1; map[5][14] = 2;
  map[4][16] = 1; map[5][16] = 2;
  map[8][14] = 1; map[9][14] = 2;
  map[8][16] = 1; map[9][16] = 2;
  map[12][15] = 3; map[12][16] = 4;
  map[15][5] = 1; map[16][5] = 2;
  map[15][4] = 1; map[16][4] = 2;
  map[15][6] = 1; map[16][6] = 2;
  map[4][25] = 5; map[4][26] = 5; map[5][25] = 3;
  map[8][28] = 1; map[9][28] = 2;
  map[24][4] = 3; map[24][8] = 3; map[24][12] = 3; map[24][16] = 3;

  return map;
}

// ============================================================
// Default MapData object (acts as fallback)
// ============================================================

export const DEFAULT_MAP_DATA: MapData = {
  id: 'default',
  name: 'Oficina Clásica',
  width: 32,
  height: 32,
  grid: generateDefaultMap(),
  zones: [
    { name: 'Recepción',     type: 0,  x: 1,  y: 1,  w: 9,  h: 9  },
    { name: 'Open Office',   type: 7,  x: 11, y: 1,  w: 9,  h: 19 },
    { name: 'Sala de Juntas',type: 8,  x: 1,  y: 12, w: 9,  h: 8  },
    { name: 'Break Room',    type: 9,  x: 21, y: 1,  w: 10, h: 14 },
    { name: 'Quiet Zone',    type: 10, x: 21, y: 17, w: 10, h: 14 },
    { name: 'Terraza',       type: 11, x: 1,  y: 22, w: 19, h: 9  },
  ],
  furniture: [],
  spawn_x: 5,
  spawn_y: 5,
};

// ============================================================
// Live map reference — updated when layout loads from DB
// ============================================================

let _activeMapData: MapData = DEFAULT_MAP_DATA;

export function setActiveMapData(data: MapData) {
  _activeMapData = data;
}

export function getActiveMapData(): MapData {
  return _activeMapData;
}

/** Convenience getter for the raw grid (used by legacy code) */
export function getActiveGrid(): number[][] {
  return _activeMapData.grid;
}

/** Check walkability against the live grid */
export function isGridWalkable(gridX: number, gridY: number): boolean {
  const grid = _activeMapData.grid;
  const col = Math.round(gridX);
  const row = Math.round(gridY);
  if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) return false;
  return TILE_WALKABLE[grid[row][col]] ?? false;
}

// Legacy export — kept for any remaining direct imports
export const MAP_LAYOUT: number[][] = generateDefaultMap();
