const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

const fxDir = path.join(__dirname, 'public', 'assets', 'fx');
if (!fs.existsSync(fxDir)) fs.mkdirSync(fxDir, { recursive: true });

async function createLightMask() {
  const size = 128;
  const img = new Jimp(size, size, 0x00000000);
  const cx = size / 2;
  const cy = size / 2;
  
  img.scan(0, 0, size, size, function(x, y, idx) {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const maxDist = size / 2;
    
    if (dist < maxDist) {
      // smooth falloff
      const alpha = Math.max(0, 1 - Math.pow(dist / maxDist, 1.5));
      this.bitmap.data[idx+0] = 255;
      this.bitmap.data[idx+1] = 249;
      this.bitmap.data[idx+2] = 204;
      this.bitmap.data[idx+3] = Math.round(alpha * 255);
    }
  });
  await img.writeAsync(path.join(fxDir, 'light_mask.png'));
}

async function createMonitorGlow() {
  const size = 32;
  const img = new Jimp(size, size, 0x00000000);
  const cx = size / 2;
  const cy = size / 2;
  
  img.scan(0, 0, size, size, function(x, y, idx) {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const maxDist = size / 2;
    
    if (dist < maxDist) {
      const alpha = Math.max(0, 1 - (dist / maxDist));
      this.bitmap.data[idx+0] = 100;
      this.bitmap.data[idx+1] = 180;
      this.bitmap.data[idx+2] = 255;
      this.bitmap.data[idx+3] = Math.round(alpha * 150);
    }
  });
  await img.writeAsync(path.join(fxDir, 'monitor_glow.png'));
}

async function createSteamParticle() {
  const size = 8;
  const img = new Jimp(size, size, 0x00000000);
  img.scan(0, 0, size, size, function(x, y, idx) {
    const dist = Math.sqrt(Math.pow(x-4, 2) + Math.pow(y-4, 2));
    if (dist < 4) {
      this.bitmap.data[idx+0] = 255;
      this.bitmap.data[idx+1] = 255;
      this.bitmap.data[idx+2] = 255;
      this.bitmap.data[idx+3] = Math.round((1 - dist/4) * 150);
    }
  });
  await img.writeAsync(path.join(fxDir, 'particle_steam.png'));
}

async function createLeafParticle() {
  const w = 6;
  const h = 4;
  const img = new Jimp(w, h, 0x00000000);
  img.scan(0, 0, w, h, function(x, y, idx) {
    // just a small green shape
    if (x > 0 && x < w-1 && y > 0 && y < h-1) {
      this.bitmap.data[idx+0] = 46;
      this.bitmap.data[idx+1] = 140;
      this.bitmap.data[idx+2] = 74;
      this.bitmap.data[idx+3] = 255;
    }
  });
  await img.writeAsync(path.join(fxDir, 'particle_leaf.png'));
}

async function run() {
  await createLightMask();
  await createMonitorGlow();
  await createSteamParticle();
  await createLeafParticle();
  console.log('FX Assets generated.');
}

run();
