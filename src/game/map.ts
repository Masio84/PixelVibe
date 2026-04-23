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

// ---- Map layout 16×16 ----
// 0 = floor, 1 = desk, 2 = chair, 3 = plant, 4 = lamp, 5 = sofa, 6 = wall
export const MAP_LAYOUT: number[][] = [
  [6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6],
  [6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6],
  [6,0,1,2,0,0,0,0,0,0,0,0,0,0,0,6],
  [6,0,1,2,0,0,0,0,0,0,0,0,0,0,0,6],
  [6,0,3,0,0,0,0,0,0,0,0,0,0,0,0,6],
  [6,0,0,0,0,0,5,5,0,0,0,0,0,0,0,6],
  [6,0,0,0,0,0,5,5,0,0,0,0,0,0,0,6],
  [6,0,0,0,0,0,0,0,0,0,0,0,1,2,0,6],
  [6,0,0,0,0,0,0,0,0,0,0,0,1,2,0,6],
  [6,0,0,0,0,0,0,0,0,0,0,0,3,0,0,6],
  [6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6],
  [6,0,4,0,0,0,0,0,0,0,0,0,0,4,0,6],
  [6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6],
  [6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6],
  [6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6],
  [6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6],
];

export const TILE_WALKABLE: Record<number, boolean> = {
  0: true,
  1: false, // desk
  2: false, // chair
  3: false, // plant
  4: false, // lamp
  5: false, // sofa
  6: false, // wall
};
