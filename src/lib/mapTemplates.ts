import type { MapData } from '@/game/map';
import { DEFAULT_MAP_DATA } from '@/game/map';

// ============================================================
// Plantilla 1: Startup Garden
// 36×32 — Jardín de entrada, recepción, oficina grupal,
// lobby con dispensadora, 2 oficinas privadas, sala de juntas.
// ============================================================

function buildStartupGarden(): number[][] {
  const W = 36;
  const H = 32;
  const map: number[][] = Array(H).fill(0).map(() => Array(W).fill(0));

  // ── Fill base zones ──
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // Garden strip (top 7 rows)
      if (y <= 7) map[y][x] = 12;
      // Reception (left col, rows 8–15)
      else if (x <= 9 && y >= 8 && y <= 15) map[y][x] = 0;
      // Group office (center, rows 8–15)
      else if (x >= 10 && x <= 24 && y >= 8 && y <= 15) map[y][x] = 7;
      // Meeting room (right, rows 8–15)
      else if (x >= 25 && y >= 8 && y <= 15) map[y][x] = 8;
      // Lobby (left, rows 16–25)
      else if (x <= 9 && y >= 16 && y <= 25) map[y][x] = 13;
      // Private office 1 (center-left, rows 16–25)
      else if (x >= 10 && x <= 19 && y >= 16 && y <= 25) map[y][x] = 14;
      // Private office 2 (center-right, rows 16–25)
      else if (x >= 20 && x <= 29 && y >= 16 && y <= 25) map[y][x] = 14;
      // Bottom area unused / hall
      else map[y][x] = 0;
    }
  }

  // ── Outer walls ──
  for (let i = 0; i < W; i++) { map[0][i] = 6; map[H - 1][i] = 6; }
  for (let i = 0; i < H; i++) { map[i][0] = 6; map[i][W - 1] = 6; }

  // ── Inner walls ──
  // Garden / interior separator
  for (let x = 1; x < W - 1; x++) map[8][x] = 6;
  // Reception / office separator
  for (let y = 8; y <= 15; y++) map[y][10] = 6;
  // Office / meeting separator
  for (let y = 8; y <= 15; y++) map[y][25] = 6;
  // Upper / lower floor
  for (let x = 1; x < W - 1; x++) map[16][x] = 6;
  // Private office 1 / 2 separator
  for (let y = 16; y <= 25; y++) map[y][20] = 6;
  // Lobby / private office separator
  for (let y = 16; y <= 25; y++) map[y][10] = 6;

  // ── Doors ──
  map[8][5] = 0;   // Garden → Reception
  map[8][15] = 7;  // Garden → Group Office
  map[8][28] = 8;  // Garden → Meeting
  map[16][5] = 13; // Reception → Lobby
  map[16][14] = 14; // Group Office → Private 1
  map[16][24] = 14; // Private 1 → Private 2
  map[12][25] = 8; // Group Office → Meeting

  // ── Garden furniture: trees, bushes, bike racks ──
  // Trees row
  map[2][4] = 15; map[2][10] = 15; map[2][16] = 15; map[2][22] = 15; map[2][28] = 15;
  map[5][2] = 15; map[5][8] = 15;  map[5][20] = 15; map[5][32] = 15;
  // Bushes
  map[3][2] = 16; map[3][6] = 16; map[3][12] = 16; map[3][18] = 16; map[3][24] = 16; map[3][30] = 16;
  map[6][3] = 16; map[6][7] = 16; map[6][14] = 16; map[6][26] = 16;
  // Bike racks
  map[4][14] = 17; map[4][15] = 17;
  // Flower pots
  map[4][20] = 23; map[4][22] = 23; map[4][24] = 23;

  // ── Reception furniture ──
  map[10][3] = 19; // Reception counter
  map[11][3] = 19;
  map[12][2] = 2; map[12][4] = 2; // waiting chairs
  map[13][2] = 2; map[13][4] = 2;
  map[11][7] = 23; // plant

  // ── Group office ──
  map[10][12] = 1; map[11][12] = 2;
  map[10][14] = 1; map[11][14] = 2;
  map[10][16] = 1; map[11][16] = 2;
  map[10][18] = 1; map[11][18] = 2;
  map[13][12] = 1; map[14][12] = 2;
  map[13][14] = 1; map[14][14] = 2;
  map[13][16] = 1; map[14][16] = 2;
  map[13][18] = 1; map[14][18] = 2;
  map[10][22] = 3; map[14][22] = 4;

  // ── Meeting room ──
  map[10][28] = 21; // conference table
  map[11][27] = 2;  map[11][29] = 2;
  map[12][27] = 2;  map[12][29] = 2;
  map[13][27] = 2;  map[13][29] = 2;
  map[9][30] = 25;  // TV screen

  // ── Lobby ──
  map[18][3] = 5;  // sofa
  map[18][4] = 5;
  map[20][2] = 18; // vending machine
  map[20][5] = 24; // coffee machine
  map[22][3] = 4;  // lamp

  // ── Private office 1 ──
  map[18][13] = 1; map[19][13] = 2; // desk + chair
  map[21][12] = 3; // plant

  // ── Private office 2 ──
  map[18][23] = 1; map[19][23] = 2;
  map[21][22] = 23; // flower pot

  return map;
}

// ============================================================
// Plantilla 2: Corporate Suite
// 36×28 — Recepción formal, open office, 3 privadas, juntas, lobby
// ============================================================

function buildCorporateSuite(): number[][] {
  const W = 36;
  const H = 28;
  const map: number[][] = Array(H).fill(0).map(() => Array(W).fill(0));

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // Reception (left, rows 1–9)
      if (x <= 12 && y >= 1 && y <= 9) map[y][x] = 0;
      // Meeting room (right, rows 1–9)
      else if (x >= 13 && y >= 1 && y <= 9) map[y][x] = 8;
      // Group office (left, rows 10–18)
      else if (x <= 20 && y >= 10 && y <= 18) map[y][x] = 7;
      // Private 1 (right-top, rows 10–13)
      else if (x >= 21 && y >= 10 && y <= 13) map[y][x] = 14;
      // Private 2 (right-mid, rows 14–17)
      else if (x >= 21 && y >= 14 && y <= 17) map[y][x] = 14;
      // Private 3 (right-bot, rows 18–21)
      else if (x >= 21 && y >= 18 && y <= 21) map[y][x] = 14;
      // Lobby / break (full bottom, rows 19–27)
      else if (y >= 19 && y <= 27) map[y][x] = 13;
      else map[y][x] = 0;
    }
  }

  // Outer walls
  for (let i = 0; i < W; i++) { map[0][i] = 6; map[H - 1][i] = 6; }
  for (let i = 0; i < H; i++) { map[i][0] = 6; map[i][W - 1] = 6; }

  // Inner walls
  for (let y = 1; y <= 9; y++) map[y][13] = 6;   // Rec / meeting
  for (let x = 1; x < W - 1; x++) map[10][x] = 6; // top / mid floor
  for (let y = 10; y <= 21; y++) map[y][21] = 6;  // office / private
  for (let x = 1; x < W - 1; x++) map[19][x] = 6; // mid / lobby
  map[10][14] = 6; map[10][18] = 6;               // private office dividers horizontal
  for (let x = 21; x < W - 1; x++) { map[14][x] = 6; map[18][x] = 6; }

  // Doors
  map[10][6] = 7;  // Rec → Group Office
  map[5][13] = 0;  // Rec / Meeting door
  map[10][28] = 7; // Group → Private (right edge door placeholder)
  map[13][21] = 14;
  map[17][21] = 14;
  map[21][21] = 14;
  map[19][10] = 13; // Group → Lobby

  // Reception
  map[3][4] = 19; map[3][5] = 19; // counter
  map[5][2] = 2;  map[5][4] = 2;  map[5][6] = 2;  // chairs
  map[6][2] = 2;  map[6][4] = 2;  map[6][6] = 2;
  map[7][8] = 3;  // plant

  // Meeting room
  map[4][20] = 21; // conference table
  map[3][18] = 2;  map[3][20] = 2;  map[3][22] = 2;
  map[5][18] = 2;  map[5][20] = 2;  map[5][22] = 2;
  map[7][18] = 2;  map[7][20] = 2;  map[7][22] = 2;
  map[2][26] = 22; // whiteboard
  map[2][27] = 25; // TV

  // Group Office clusters
  map[12][4] = 1; map[13][4] = 2;
  map[12][7] = 1; map[13][7] = 2;
  map[12][10] = 1; map[13][10] = 2;
  map[12][13] = 1; map[13][13] = 2;
  map[15][4] = 1; map[16][4] = 2;
  map[15][7] = 1; map[16][7] = 2;
  map[15][10] = 1; map[16][10] = 2;
  map[15][13] = 1; map[16][13] = 2;
  map[17][17] = 3; map[13][19] = 4;

  // Privates
  map[11][24] = 1; map[12][24] = 2;
  map[15][24] = 1; map[16][24] = 2;
  map[19][24] = 1; map[20][24] = 2;
  map[11][28] = 23; map[15][28] = 23; map[19][28] = 23;

  // Lobby / Break
  map[22][4] = 5;  map[22][5] = 5;   // sofa
  map[22][8] = 5;  map[22][9] = 5;
  map[24][2] = 18; // vending
  map[24][4] = 24; // coffee
  map[24][14] = 4; // lamp
  map[24][20] = 3; // plant

  return map;
}

// ============================================================
// Plantilla 3: Creative Loft
// 36×36 — Terraza grande, coworking abierto, lobby, 2 privadas, juntas
// ============================================================

function buildCreativeLoft(): number[][] {
  const W = 36;
  const H = 36;
  const map: number[][] = Array(H).fill(0).map(() => Array(W).fill(0));

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // Terraza (top, rows 1–8)
      if (y >= 1 && y <= 8) map[y][x] = 11;
      // Reception (left, rows 9–16)
      else if (x <= 9 && y >= 9 && y <= 16) map[y][x] = 0;
      // Open coworking (center, rows 9–16)
      else if (x >= 10 && x <= 27 && y >= 9 && y <= 16) map[y][x] = 7;
      // Lobby (left, rows 17–26)
      else if (x <= 9 && y >= 17 && y <= 26) map[y][x] = 13;
      // Private 1 (center-left, rows 17–26)
      else if (x >= 10 && x <= 19 && y >= 17 && y <= 26) map[y][x] = 14;
      // Private 2 (center-right, rows 17–26)
      else if (x >= 20 && x <= 27 && y >= 17 && y <= 26) map[y][x] = 14;
      // Meeting room (right, rows 9–26)
      else if (x >= 28 && y >= 9 && y <= 26) map[y][x] = 8;
      else map[y][x] = 0;
    }
  }

  // Outer walls
  for (let i = 0; i < W; i++) { map[0][i] = 6; map[H - 1][i] = 6; }
  for (let i = 0; i < H; i++) { map[i][0] = 6; map[i][W - 1] = 6; }

  // Inner walls
  for (let x = 1; x < W - 1; x++) map[9][x] = 6;    // terrace/interior
  for (let y = 9; y <= 26; y++) map[y][10] = 6;       // reception/lobby vs cowork
  for (let x = 1; x < W - 1; x++) map[17][x] = 6;    // upper/lower interior
  for (let y = 17; y <= 26; y++) map[y][20] = 6;      // private 1/2 divider
  for (let y = 9; y <= 26; y++) map[y][28] = 6;       // cowork/meeting

  // Doors
  map[9][5] = 0;   // Terrace → Reception
  map[9][17] = 7;  // Terrace → Cowork
  map[17][5] = 13; // Reception → Lobby
  map[17][14] = 14; // Cowork → Private 1
  map[17][23] = 14; // Cowork → Private 2
  map[12][28] = 8;  // Cowork → Meeting

  // ── Terraza ──
  map[3][4] = 15; map[3][10] = 15; map[3][16] = 15; map[3][22] = 15; map[3][28] = 15;
  map[6][2] = 15; map[6][8] = 15;  map[6][14] = 15; map[6][20] = 15; map[6][26] = 15;
  map[4][2] = 16; map[4][6] = 16;  map[4][12] = 16; map[4][18] = 16; map[4][24] = 16; map[4][30] = 16;
  map[7][4] = 16; map[7][9] = 16;  map[7][16] = 16; map[7][22] = 16; map[7][28] = 16;
  // Terrace seating
  map[5][6] = 5; map[5][18] = 5;
  map[6][6] = 2; map[6][18] = 2;

  // ── Reception ──
  map[11][3] = 19; map[11][4] = 19; // counter
  map[12][6] = 3;  // plant
  map[13][2] = 2;  map[14][2] = 2;  // chairs

  // ── Open Coworking ──
  // Long shared tables
  map[11][12] = 1; map[11][13] = 1; map[11][14] = 1; map[11][15] = 1;
  map[12][12] = 2; map[12][13] = 2; map[12][14] = 2; map[12][15] = 2;
  map[11][18] = 1; map[11][19] = 1; map[11][20] = 1; map[11][21] = 1;
  map[12][18] = 2; map[12][19] = 2; map[12][20] = 2; map[12][21] = 2;
  map[14][12] = 1; map[14][13] = 1; map[14][14] = 1; map[14][15] = 1;
  map[15][12] = 2; map[15][13] = 2; map[15][14] = 2; map[15][15] = 2;
  map[14][18] = 1; map[14][19] = 1; map[14][20] = 1; map[14][21] = 1;
  map[15][18] = 2; map[15][19] = 2; map[15][20] = 2; map[15][21] = 2;
  map[13][25] = 4; // lamp
  map[10][24] = 3; // plant

  // ── Lobby ──
  map[19][3] = 5;  map[19][4] = 5;  // sofa
  map[22][3] = 5;  map[22][4] = 5;
  map[21][2] = 18; // vending machine
  map[23][6] = 24; // coffee machine
  map[20][7] = 4;  // lamp

  // ── Private 1 ──
  map[19][13] = 1; map[20][13] = 2;
  map[22][11] = 3;

  // ── Private 2 ──
  map[19][23] = 1; map[20][23] = 2;
  map[22][21] = 23; // flower pot

  // ── Meeting room ──
  map[12][31] = 21; // round conference table
  map[11][30] = 2;  map[11][32] = 2;
  map[13][30] = 2;  map[13][32] = 2;
  map[15][30] = 2;  map[15][32] = 2;
  map[17][30] = 2;  map[17][32] = 2;
  map[10][33] = 25; // TV screen
  map[18][33] = 22; // whiteboard

  return map;
}

// ============================================================
// Export templates as MapData objects
// ============================================================

export const TEMPLATE_STARTUP_GARDEN: MapData = {
  id: 'template_startup_garden',
  name: 'Startup Garden',
  width: 36,
  height: 32,
  grid: buildStartupGarden(),
  zones: [
    { name: 'Jardín de Entrada', type: 12, x: 1,  y: 1,  w: 34, h: 6  },
    { name: 'Recepción',         type: 0,  x: 1,  y: 9,  w: 8,  h: 6  },
    { name: 'Oficina Grupal',    type: 7,  x: 11, y: 9,  w: 13, h: 6  },
    { name: 'Sala de Juntas',    type: 8,  x: 26, y: 9,  w: 8,  h: 6  },
    { name: 'Lobby',             type: 13, x: 1,  y: 17, w: 8,  h: 8  },
    { name: 'Oficina Privada 1', type: 14, x: 11, y: 17, w: 8,  h: 8  },
    { name: 'Oficina Privada 2', type: 14, x: 21, y: 17, w: 8,  h: 8  },
  ],
  furniture: [],
};

export const TEMPLATE_CORPORATE_SUITE: MapData = {
  id: 'template_corporate_suite',
  name: 'Corporate Suite',
  width: 36,
  height: 28,
  grid: buildCorporateSuite(),
  zones: [
    { name: 'Recepción',         type: 0,  x: 1,  y: 1,  w: 11, h: 8  },
    { name: 'Sala de Juntas',    type: 8,  x: 14, y: 1,  w: 20, h: 8  },
    { name: 'Oficina Grupal',    type: 7,  x: 1,  y: 11, w: 19, h: 7  },
    { name: 'Oficina Privada 1', type: 14, x: 22, y: 11, w: 12, h: 2  },
    { name: 'Oficina Privada 2', type: 14, x: 22, y: 15, w: 12, h: 2  },
    { name: 'Oficina Privada 3', type: 14, x: 22, y: 19, w: 12, h: 2  },
    { name: 'Lobby / Break Room',type: 13, x: 1,  y: 20, w: 34, h: 6  },
  ],
  furniture: [],
};

export const TEMPLATE_CREATIVE_LOFT: MapData = {
  id: 'template_creative_loft',
  name: 'Creative Loft',
  width: 36,
  height: 36,
  grid: buildCreativeLoft(),
  zones: [
    { name: 'Terraza',           type: 11, x: 1,  y: 1,  w: 34, h: 7  },
    { name: 'Recepción',         type: 0,  x: 1,  y: 10, w: 8,  h: 6  },
    { name: 'Open Coworking',    type: 7,  x: 11, y: 10, w: 16, h: 6  },
    { name: 'Lobby',             type: 13, x: 1,  y: 18, w: 8,  h: 8  },
    { name: 'Oficina Privada 1', type: 14, x: 11, y: 18, w: 8,  h: 8  },
    { name: 'Oficina Privada 2', type: 14, x: 21, y: 18, w: 6,  h: 8  },
    { name: 'Sala de Juntas',    type: 8,  x: 29, y: 10, w: 5,  h: 16 },
  ],
  furniture: [],
};

export const ALL_TEMPLATES: MapData[] = [
  TEMPLATE_STARTUP_GARDEN,
  TEMPLATE_CORPORATE_SUITE,
  TEMPLATE_CREATIVE_LOFT,
];
