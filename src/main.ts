import Phaser from 'phaser';
import { GameController } from './game/GameController';
import { BootScene } from './phaser/scenes/BootScene';
import { GameScene } from './phaser/scenes/GameScene';
import { GameUi } from './ui/GameUi';
import './styles.css';

const controller = new GameController();
const ui = new GameUi(controller);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-canvas',
  backgroundColor: '#c5bcec',
  scene: [new BootScene(), new GameScene(controller)],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  render: {
    antialias: true,
    roundPixels: true,
  },
});

window.addEventListener('error', () => ui.announce('画面加载出现问题，请刷新页面再试一次。'));
