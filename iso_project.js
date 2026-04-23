const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

const inputPath = '/home/cuellar/.gemini/antigravity/brain/1834cc56-68b5-4175-8c66-afa9d5651602/floor_wood_pixel_1776920013308.png';
const outPath = path.join(__dirname, 'public', 'assets', 'tilesets', 'floor_reception.png');

async function projectIso() {
  const img = await Jimp.read(inputPath);
  
  // Resize to 64x64 for the top-down source
  img.resize(64, 64, Jimp.RESIZE_NEAREST_NEIGHBOR);
  
  const w = 64;
  const h = 32;
  const isoImg = new Jimp(w, h, 0x00000000);
  
  // Project top-down 64x64 into 64x32 isometric diamond
  // isometric mapping: 
  // screenX = (x - y) * (w/2) / 64 + (w/2)
  // screenY = (x + y) * (h/2) / 64
  
  for (let sy = 0; sy < h; sy++) {
    for (let sx = 0; sx < w; sx++) {
      // inverse mapping
      // x = (screenX - w/2) / (w/2) * 64
      // y = screenY / (h/2) * 64
      const dx = (sx - w/2) / (w/2);
      const dy = sy / (h/2);
      
      const px = Math.round((dx + dy) * 32);
      const py = Math.round((dy - dx) * 32);
      
      if (px >= 0 && px < 64 && py >= 0 && py < 64) {
        const color = img.getPixelColor(px, py);
        isoImg.setPixelColor(color, sx, sy);
      }
    }
  }

  await isoImg.writeAsync(outPath);
  console.log('Isometric texture applied!');
}

projectIso().catch(console.error);
