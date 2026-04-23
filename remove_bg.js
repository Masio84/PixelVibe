const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

const spriteDir = path.join(__dirname, 'public', 'assets', 'sprites');

async function processSprites() {
  const files = fs.readdirSync(spriteDir).filter(f => f.endsWith('.png'));
  console.log(`Processing ${files.length} sprites...`);
  
  for (const file of files) {
    const filePath = path.join(spriteDir, file);
    try {
      const img = await Jimp.read(filePath);
      
      // Target white color (can be slightly off-white due to compression)
      img.scan(0, 0, img.bitmap.width, img.bitmap.height, function(x, y, idx) {
        const r = this.bitmap.data[idx + 0];
        const g = this.bitmap.data[idx + 1];
        const b = this.bitmap.data[idx + 2];
        
        if (r > 250 && g > 250 && b > 250) {
          this.bitmap.data[idx + 3] = 0; // Make transparent
        }
      });
      
      await img.writeAsync(filePath);
      console.log(`[OK] ${file}`);
    } catch (e) {
      console.error(`[ERR] ${file}:`, e);
    }
  }
  console.log('--- Done processing all sprites! ---');
}

processSprites();
