const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

const spriteDir = path.join(__dirname, 'public', 'assets', 'sprites');

// 192x128 spritesheet (6 cols, 4 rows, 32x32 frames)
const W = 192;
const H = 128;
const FW = 32;
const FH = 32;

async function createPerfectSprite(filename, type) {
  const img = new Jimp(W, H, 0x00000000); // Transparent background

  // Helper to draw a filled rectangle
  const fillRect = (frameX, frameY, rx, ry, rw, rh, color) => {
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        const px = frameX * FW + x;
        const py = frameY * FH + y;
        img.setPixelColor(color, px, py);
      }
    }
  };

  const drawFrame = (col, row, isWalk) => {
    // Determine leg/arm swing based on frame column (1 to 5)
    let swing = 0;
    if (isWalk) {
      if (col === 1 || col === 5) swing = 1;
      if (col === 2 || col === 4) swing = 2;
      if (col === 3) swing = 3;
    }

    const cWhite = Jimp.rgbaToInt(255, 255, 255, 255);

    if (type.startsWith('body')) {
      // Head
      fillRect(col, row, 11, 4, 10, 10, cWhite);
      // Torso
      fillRect(col, row, 12, 14, 8, 10, cWhite);
      // Arms
      if (row === 0 || row === 3) { // Up/Down
        fillRect(col, row, 9, 14, 3, 8, cWhite); // Left arm
        fillRect(col, row, 20, 14, 3, 8, cWhite); // Right arm
      } else { // Left/Right
        fillRect(col, row, 14, 14, 4, 8, cWhite);
      }
      // Legs (swinging)
      const lY = 24;
      if (row === 0 || row === 3) { // Up/Down
        fillRect(col, row, 12, lY, 3, 6 + (col%2===0?0:-2), cWhite);
        fillRect(col, row, 17, lY, 3, 6 + (col%2===0?-2:0), cWhite);
      } else if (row === 1) { // Left
        fillRect(col, row, 13 - swing, lY, 3, 6, cWhite);
        fillRect(col, row, 15 + swing, lY, 3, 6, cWhite);
      } else { // Right
        fillRect(col, row, 13 + swing, lY, 3, 6, cWhite);
        fillRect(col, row, 15 - swing, lY, 3, 6, cWhite);
      }
    } 
    else if (type.startsWith('top')) {
      // Shirt torso
      fillRect(col, row, 12, 14, 8, 10, cWhite);
      if (row === 0 || row === 3) {
        fillRect(col, row, 9, 14, 3, 4, cWhite); // short sleeves
        fillRect(col, row, 20, 14, 3, 4, cWhite);
      } else {
        fillRect(col, row, 14, 14, 4, 4, cWhite);
      }
    }
    else if (type.startsWith('bottom')) {
      // Pants
      const lY = 24;
      if (row === 0 || row === 3) { // Up/Down
        fillRect(col, row, 12, lY, 3, 4 + (col%2===0?0:-1), cWhite);
        fillRect(col, row, 17, lY, 3, 4 + (col%2===0?-1:0), cWhite);
      } else if (row === 1) { // Left
        fillRect(col, row, 13 - swing, lY, 3, 4, cWhite);
        fillRect(col, row, 15 + swing, lY, 3, 4, cWhite);
      } else { // Right
        fillRect(col, row, 13 + swing, lY, 3, 4, cWhite);
        fillRect(col, row, 15 - swing, lY, 3, 4, cWhite);
      }
    }
    else if (type.startsWith('hair')) {
      fillRect(col, row, 10, 3, 12, 4, cWhite);
      fillRect(col, row, 10, 7, 2, 4, cWhite);
      fillRect(col, row, 20, 7, 2, 4, cWhite);
    }
    else if (type.startsWith('shoes')) {
      const lY = 28;
      if (row === 0 || row === 3) { // Up/Down
        fillRect(col, row, 11, lY + (col%2===0?0:-2), 4, 2, cWhite);
        fillRect(col, row, 17, lY + (col%2===0?-2:0), 4, 2, cWhite);
      } else if (row === 1) { // Left
        fillRect(col, row, 12 - swing, lY, 4, 2, cWhite);
        fillRect(col, row, 14 + swing, lY, 4, 2, cWhite);
      } else { // Right
        fillRect(col, row, 12 + swing, lY, 4, 2, cWhite);
        fillRect(col, row, 14 - swing, lY, 4, 2, cWhite);
      }
    }
    else {
      // Accessory (Generic)
      fillRect(col, row, 14, 10, 4, 2, cWhite);
    }
  };

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 6; col++) {
      drawFrame(col, row, col > 0);
    }
  }

  await img.writeAsync(path.join(spriteDir, filename));
}

async function run() {
  const files = fs.readdirSync(spriteDir).filter(f => f.endsWith('.png'));
  console.log(`Generating pixel-perfect grids for ${files.length} sprites...`);
  for (const file of files) {
    await createPerfectSprite(file, file);
  }
  console.log('Done generating perfect sprites!');
}

run();
