const fs = require('fs');
const path = 'src/game/scenes/GameScene.ts';
let code = fs.readFileSync(path, 'utf-8');

const targetStr = `    this.avatarManager = new AvatarManager(this, this.getIsoPos.bind(this));`;

const replacement = `    this.avatarManager = new AvatarManager(this, this.getIsoPos.bind(this));

    // Ambient Lighting Overlay (Night/Cozy mode)
    const ambient = this.add.rectangle(0, 0, this.scale.width * 2, this.scale.height * 2, 0x1a2b4c, 0.4);
    ambient.setOrigin(0, 0);
    ambient.setScrollFactor(0);
    ambient.setBlendMode(Phaser.BlendModes.MULTIPLY);
    ambient.setDepth(1000); // Above avatars
    
    // Add resize listener to keep overlay full screen
    this.scale.on('resize', (gameSize: any) => {
      ambient.setSize(gameSize.width * 2, gameSize.height * 2);
    });
`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync(path, code);
  console.log('Ambient overlay added to GameScene');
} else {
  console.error('Target string not found in GameScene.ts');
}
