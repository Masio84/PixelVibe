const fs = require('fs');

const path = 'src/game/scenes/IsometricScene.ts';
let code = fs.readFileSync(path, 'utf-8');

// Replace drawIsoDiamond and everything down to drawSofa
const startStr = '  private drawIsoDiamond(';
const endStr = '  // Public method to get isometric position for avatars';

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find boundaries');
  process.exit(1);
}

const replacement = `  private drawFloorTile(x: number, y: number, depth: number, floorType: number) {
    let key = 'floor_reception';
    if (floorType === 7) key = 'floor_open';
    else if (floorType === 8) key = 'floor_meet';
    else if (floorType === 9) key = 'floor_break';
    else if (floorType === 10) key = 'floor_quiet';
    else if (floorType === 11) key = 'floor_terr';

    const img = this.add.image(x, y, key);
    img.setDepth(depth);
    
    const isLight = (Math.floor(x / 10) + Math.floor(y / 10)) % 2 === 0;
    if (!isLight) img.setTint(0xdddddd);

    this.tileLayer.add(img);
  }

  private drawWallTile(x: number, y: number, depth: number) {
    const img = this.add.image(x, y - 16, 'wall');
    img.setDepth(depth);
    this.tileLayer.add(img);
  }

  private drawDesk(x: number, y: number, depth: number) {
    const img = this.add.image(x, y - 16, 'furniture', 'desk');
    img.setDepth(depth + 0.5);
    this.tileLayer.add(img);
  }

  private drawChair(x: number, y: number, depth: number) {
    const img = this.add.image(x, y - 16, 'furniture', 'chair');
    img.setDepth(depth + 0.5);
    this.tileLayer.add(img);
  }

  private drawPlant(x: number, y: number, depth: number) {
    const img = this.add.image(x, y - 16, 'furniture', 'plant');
    img.setDepth(depth + 0.5);
    this.tileLayer.add(img);
  }

  private drawLamp(x: number, y: number, depth: number) {
    const img = this.add.image(x, y - 16, 'furniture', 'lamp');
    img.setDepth(depth + 0.5);
    this.tileLayer.add(img);
  }

  private drawSofa(x: number, y: number, depth: number) {
    const img = this.add.image(x, y - 16, 'furniture', 'sofa');
    img.setDepth(depth + 0.5);
    this.tileLayer.add(img);
  }

`;

code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
fs.writeFileSync(path, code);
console.log('Replaced procedural code with sprite implementations');
