const fs = require('fs');
const path = 'src/game/scenes/IsometricScene.ts';
let code = fs.readFileSync(path, 'utf-8');

// 1. Add preloads
const preloadBlock = `  preload() {
    this.load.image('floor_reception', '/assets/tilesets/floor_reception.png');
    this.load.image('floor_open', '/assets/tilesets/floor_open.png');
    this.load.image('floor_meet', '/assets/tilesets/floor_meet.png');
    this.load.image('floor_break', '/assets/tilesets/floor_break.png');
    this.load.image('floor_quiet', '/assets/tilesets/floor_quiet.png');
    this.load.image('floor_terr', '/assets/tilesets/floor_terr.png');
    this.load.image('wall', '/assets/tilesets/wall.png');

    this.load.atlas('furniture', '/assets/furniture/furniture_atlas.png', '/assets/furniture/furniture_atlas.json');
`;

const newPreloadBlock = preloadBlock + `
    // FX
    this.load.image('light_mask', '/assets/fx/light_mask.png');
    this.load.image('monitor_glow', '/assets/fx/monitor_glow.png');
    this.load.image('particle_steam', '/assets/fx/particle_steam.png');
    this.load.image('particle_leaf', '/assets/fx/particle_leaf.png');
`;
code = code.replace(preloadBlock, newPreloadBlock);

// 2. Modify drawLamp
const drawLampOld = `  private drawLamp(x: number, y: number, depth: number) {
    const img = this.add.image(x, y - 16, 'furniture', 'lamp');
    img.setDepth(depth + 0.5);
    this.tileLayer.add(img);
  }`;

const drawLampNew = `  private drawLamp(x: number, y: number, depth: number) {
    const img = this.add.image(x, y - 16, 'furniture', 'lamp');
    img.setDepth(depth + 0.5);
    this.tileLayer.add(img);

    // Glowing light effect
    const light = this.add.image(x, y + 8, 'light_mask');
    light.setBlendMode(Phaser.BlendModes.ADD);
    light.setDepth(depth + 0.6);
    this.tileLayer.add(light);
    
    // Breathing tween for light
    this.tweens.add({
      targets: light,
      alpha: 0.6,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }`;
code = code.replace(drawLampOld, drawLampNew);

// 3. Modify drawDesk
const drawDeskOld = `  private drawDesk(x: number, y: number, depth: number) {
    const img = this.add.image(x, y - 16, 'furniture', 'desk');
    img.setDepth(depth + 0.5);
    this.tileLayer.add(img);
  }`;

const drawDeskNew = `  private drawDesk(x: number, y: number, depth: number) {
    const img = this.add.image(x, y - 16, 'furniture', 'desk');
    img.setDepth(depth + 0.5);
    this.tileLayer.add(img);

    // Monitor glow
    const glow = this.add.image(x - 8, y - 36, 'monitor_glow');
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setDepth(depth + 0.6);
    glow.setAlpha(0.8);
    this.tileLayer.add(glow);

    this.tweens.add({
      targets: glow,
      alpha: 0.4,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Coffee Steam Particle Emitter
    const emitter = this.add.particles(x - 12, y - 26, 'particle_steam', {
      speed: { min: 5, max: 15 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 1500,
      frequency: 400
    });
    emitter.setDepth(depth + 0.7);
  }`;
code = code.replace(drawDeskOld, drawDeskNew);

// 4. Modify Floor Tile to add leaves on terrace
const drawFloorOld = `  private drawFloorTile(x: number, y: number, depth: number, floorType: number) {
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
  }`;

const drawFloorNew = `  private drawFloorTile(x: number, y: number, depth: number, floorType: number) {
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

    // Falling leaves on Terrace
    if (floorType === 11 && Math.random() < 0.1) {
      const leafEmitter = this.add.particles(x, y - 60, 'particle_leaf', {
        speed: { min: 10, max: 30 },
        angle: { min: 45, max: 135 },
        scale: { start: 1, end: 0.5 },
        alpha: { start: 1, end: 0 },
        gravityY: 10,
        lifespan: 3000,
        frequency: 2000,
        rotate: { start: 0, end: 360 }
      });
      leafEmitter.setDepth(depth + 1);
    }
  }`;
code = code.replace(drawFloorOld, drawFloorNew);

fs.writeFileSync(path, code);
console.log('FX added to IsometricScene.ts');
