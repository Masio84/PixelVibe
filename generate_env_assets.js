const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

const tilesetDir = path.join(__dirname, 'public', 'assets', 'tilesets');
const furnDir = path.join(__dirname, 'public', 'assets', 'furniture');

const cTrans = 0x00000000;

function isInsideIsoDiamond(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = Math.abs(x - cx);
  const dy = Math.abs(y - cy);
  return (dx / (w / 2) + dy / (h / 2)) <= 1;
}

async function createFloorTile(filename, r, g, b) {
  const w = 64;
  const h = 32;
  const img = new Jimp(w, h, cTrans);
  const color = Jimp.rgbaToInt(r, g, b, 255);
  const colorEdge = Jimp.rgbaToInt(r - 30, g - 30, b - 30, 255);

  img.scan(0, 0, w, h, function(x, y, idx) {
    if (isInsideIsoDiamond(x, y, w, h)) {
      // Add a slight border effect
      const dx = Math.abs(x - w/2);
      const dy = Math.abs(y - h/2);
      const dist = (dx / (w / 2) + dy / (h / 2));
      if (dist > 0.85) {
        this.bitmap.data[idx+0] = r - 30;
        this.bitmap.data[idx+1] = g - 30;
        this.bitmap.data[idx+2] = b - 30;
      } else {
        this.bitmap.data[idx+0] = r;
        this.bitmap.data[idx+1] = g;
        this.bitmap.data[idx+2] = b;
      }
      this.bitmap.data[idx+3] = 255;
    }
  });

  await img.writeAsync(path.join(tilesetDir, filename));
}

async function createWall(filename, r, g, b) {
  const w = 64;
  const h = 64; // Taller for wall
  const img = new Jimp(w, h, cTrans);
  
  img.scan(0, 0, w, h, function(x, y, idx) {
    // Wall occupies the top-left to bottom-right of the iso space
    // Let's just make it a simple block for now
    if (x >= 16 && x < 48 && y >= 0 && y < 48) {
       this.bitmap.data[idx+0] = r;
       this.bitmap.data[idx+1] = g;
       this.bitmap.data[idx+2] = b;
       this.bitmap.data[idx+3] = 255;
    }
  });
  await img.writeAsync(path.join(tilesetDir, filename));
}

async function createFurnitureAtlas() {
  const w = 512;
  const h = 256;
  const img = new Jimp(w, h, cTrans);

  // We will just draw a bunch of colored squares to represent furniture on the atlas
  // desk: 0,0 (64x64)
  // chair: 64,0
  // plant: 128,0
  // lamp: 192,0
  // sofa: 256,0
  
  const drawRect = (sx, sy, sw, sh, r, g, b) => {
    for (let y = sy; y < sy+sh; y++) {
      for (let x = sx; x < sx+sw; x++) {
        img.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
      }
    }
  };

  // desk (brown)
  drawRect(16, 16, 32, 32, 175, 139, 68);
  // chair (dark gray)
  drawRect(64+16, 16, 32, 32, 68, 68, 68);
  // plant (green)
  drawRect(128+16, 16, 32, 32, 46, 140, 74);
  // lamp (yellow)
  drawRect(192+16, 16, 32, 32, 255, 249, 204);
  // sofa (pink)
  drawRect(256+16, 16, 32, 32, 224, 96, 126);

  await img.writeAsync(path.join(furnDir, 'furniture_atlas.png'));

  // Write simple JSON atlas
  const atlas = {
    frames: {
      "desk": { frame: { x: 0, y: 0, w: 64, h: 64 } },
      "chair": { frame: { x: 64, y: 0, w: 64, h: 64 } },
      "plant": { frame: { x: 128, y: 0, w: 64, h: 64 } },
      "lamp": { frame: { x: 192, y: 0, w: 64, h: 64 } },
      "sofa": { frame: { x: 256, y: 0, w: 64, h: 64 } }
    }
  };
  fs.writeFileSync(path.join(furnDir, 'furniture_atlas.json'), JSON.stringify(atlas, null, 2));
}

async function run() {
  await createFloorTile('floor_reception.png', 140, 204, 208);
  await createFloorTile('floor_open.png', 161, 161, 170);
  await createFloorTile('floor_meet.png', 196, 181, 253);
  await createFloorTile('floor_break.png', 254, 240, 138);
  await createFloorTile('floor_quiet.png', 147, 197, 253);
  await createFloorTile('floor_terr.png', 134, 239, 172);
  
  await createWall('wall.png', 36, 62, 71);

  await createFurnitureAtlas();
  console.log('Assets generated.');
}

run();
