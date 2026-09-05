import Phaser from 'phaser';
import './style.css';
import { PHYSICS } from './core/balance';
import { seedFromString } from './core/rng';
import { computeLayout } from './core/screen';
import { Sfx } from './audio/Sfx';
import { Overlay } from './ui/Overlay';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { installDebugHooks } from './debug/hooks';

/**
 * 功能入口：创建 Phaser 游戏。按启动时的窗口朝向选择横屏/竖屏布局，Scale.FIT 等比缩放适配窗口。
 * 约束：Overlay 与 Sfx 全局唯一，通过 registry 交给场景；GameScene.restart 不会重建它们。
 */
const params = new URLSearchParams(location.search);
const forced = params.get('layout');
const portrait = forced ? forced === 'portrait' : window.innerHeight > window.innerWidth;
const layout = computeLayout(portrait);
const seedParam = params.get('seed');
const seed = seedParam ? (/^\d+$/.test(seedParam) ? Number(seedParam) >>> 0 : seedFromString(seedParam)) : undefined;

const uiRoot = document.getElementById('ui');
if (!uiRoot) throw new Error('#ui missing');
const overlay = new Overlay(uiRoot);
const sfx = new Sfx();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: layout.width,
  height: layout.height,
  transparent: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: PHYSICS.gravityY },
      enableSleeping: false,
      debug: params.has('physdebug'),
      // 帧率低于 60 时允许一帧内补多步（最多补 250ms），保证物理按真实时间走而不是慢动作
      runner: { maxFrameTime: 250 },
    },
  },
  input: { activePointers: 2 },
  disableContextMenu: true,
  scene: [BootScene, GameScene],
});

game.registry.set('layout', layout);
game.registry.set('overlay', overlay);
game.registry.set('sfx', sfx);
game.registry.set('seed', seed);

// 浏览器自动播放策略：任何一次手势都尝试解锁音频
const unlock = () => sfx.unlock();
window.addEventListener('pointerdown', unlock, { passive: true });
window.addEventListener('keydown', unlock);

installDebugHooks(game);
