import Phaser from 'phaser';
import './style.css';
import { IntroScene } from './scenes/IntroScene';
import { LevelOneScene } from './scenes/LevelOneScene';

type Orientation = 'landscape' | 'portrait';

const orientation = (): Orientation =>
  window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait';

const gameSize = (value: Orientation): { width: number; height: number } =>
  value === 'landscape' ? { width: 640, height: 360 } : { width: 360, height: 640 };

let currentOrientation = orientation();
const initialSize = gameSize(currentOrientation);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  width: initialSize.width,
  height: initialSize.height,
  backgroundColor: '#17251a',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  input: {
    activePointers: 4,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: initialSize.width,
    height: initialSize.height,
  },
  scene: [IntroScene, LevelOneScene],
});

let resizeTimer: number | undefined;
window.addEventListener('resize', () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    const nextOrientation = orientation();
    if (nextOrientation === currentOrientation) return;

    const scene = game.scene.getScenes(true)[0] as Phaser.Scene & {
      getRestartData?: () => object;
    };
    const restartData = scene?.getRestartData?.() ?? {};
    const nextSize = gameSize(nextOrientation);
    currentOrientation = nextOrientation;
    game.scale.setGameSize(nextSize.width, nextSize.height);
    scene?.scene.restart(restartData);
  }, 120);
});

window.addEventListener('pagehide', () => game.loop.sleep());
window.addEventListener('pageshow', () => game.loop.wake());
