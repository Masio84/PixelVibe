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
  
  img.scan(0, 0, w, h, function(x, y, idx) {
    if (isInsideIsoDiamond(x, y, w, h)) {
      const dx = Math.abs(x - w/2);
      const dy = Math.abs(y - h/2);
      const dist = (dx / (w / 2) + dy / (h / 2));
      if (dist > 0.85) {
        this.bitmap.data[idx+0] = Math.max(0, r - 30);
        this.bitmap.data[idx+1] = Math.max(0, g - 30);
        this.bitmap.data[idx+2] = Math.max(0, b - 30);
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

async function createFurnitureAtlas2() {
  const w = 512;
  const h = 256;
  const img = new Jimp(w, h, cTrans);
  
  // Just a transparent image for now, as we draw them with Graphics
  // but we need the atlas to exist to avoid 404s
  await img.writeAsync(path.join(furnDir, 'furniture_atlas2.png'));

  const atlas = {
    frames: {
      "dummy": { frame: { x: 0, y: 0, w: 64, h: 64 } }
    }
  };
  fs.writeFileSync(path.join(furnDir, 'furniture_atlas2.json'), JSON.stringify(atlas, null, 2));
}

async function run() {
  console.log('Generating Phase 2 assets...');
  
  // floor_garden.png (Grass Green #7ec850) -> RGB: 126, 200, 80
  await createFloorTile('floor_garden.png', 126, 200, 80);
  
  // floor_lobby.png (Warm Wood #c9a06c) -> RGB: 201, 160, 108
  await createFloorTile('floor_lobby.png', 201, 160, 108);
  
  // floor_private.png (Elegant Carpet #4a4063) -> RGB: 74, 64, 99
  await createFloorTile('floor_private.png', 74, 64, 99);
  
  await createFurnitureAtlas2();
  
  console.log('Phase 2 assets generated successfully!');
}

run();
