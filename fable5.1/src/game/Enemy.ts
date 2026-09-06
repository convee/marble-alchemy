import Phaser from 'phaser';
import type { LevelDef } from '../core/balance';

const GLOW: Record<LevelDef['enemyKey'], number> = {
  slime: 0x5fe36b,
  goblin: 0xffd36b,
  gargoyle: 0x35f2ff,
  warlock: 0xff3fd8,
  golem: 0xff8a3d,
};

/**
 * 文件模块：敌人表现层（贴图、地面阴影、背光、待机/受击/反击/死亡动画）。
 * 职责：只做表现；血量与攻击数值在 RunState。
 */
export class Enemy {
  readonly scene: Phaser.Scene;
  readonly x: number;
  readonly y: number;
  readonly key: LevelDef['enemyKey'];
  readonly tint: number;
  readonly sprite: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;
  private idle?: Phaser.Tweens.Tween;
  private baseScale: number;
  dead = false;

  constructor(scene: Phaser.Scene, x: number, y: number, key: LevelDef['enemyKey'], scale: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.key = key;
    this.tint = GLOW[key];
    this.baseScale = scale;
    this.shadow = scene.add.ellipse(x, y + 100 * scale, 190 * scale, 40 * scale, 0x000000, 0.45).setDepth(3);
    this.glow = scene.add.image(x, y, 'glow').setScale(2.6 * scale).setTint(this.tint).setAlpha(0.28).setDepth(4);
    this.sprite = scene.add.image(x, y, `enemy-${key}`).setScale(scale).setDepth(6).setAlpha(0);
  }

  enter(onDone?: () => void): void {
    this.sprite.setAlpha(0).setScale(this.baseScale * 0.6).setY(this.y - 30);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 1,
      scale: this.baseScale,
      y: this.y,
      duration: 520,
      ease: 'Back.Out',
      onComplete: () => {
        this.startIdle();
        onDone?.();
      },
    });
    this.scene.tweens.add({ targets: this.glow, alpha: 0.45, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private startIdle(): void {
    this.idle?.remove();
    this.idle = this.scene.tweens.add({
      targets: this.sprite,
      y: this.y - 10,
      scaleY: this.baseScale * 1.03,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  hurt(): void {
    if (this.dead) return;
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => {
      if (!this.dead) this.sprite.clearTint();
    });
    const startX = this.x;
    this.scene.tweens.add({
      targets: this.sprite,
      x: startX + 14,
      duration: 50,
      yoyo: true,
      repeat: 3,
      onComplete: () => this.sprite.setX(startX),
    });
  }

  /** 反击：向弹盘方向猛冲，冲到最远点时触发 onHit，回位后触发 onDone。 */
  lunge(dirX: number, dirY: number, onHit: () => void, onDone: () => void): void {
    if (this.dead) return;
    this.idle?.pause();
    this.scene.tweens.add({
      targets: this.sprite,
      x: this.x + dirX * 70,
      y: this.y + dirY * 70,
      scaleX: this.baseScale * 1.12,
      scaleY: this.baseScale * 0.94,
      duration: 180,
      ease: 'Quad.In',
      onComplete: () => {
        onHit();
        this.scene.tweens.add({
          targets: this.sprite,
          x: this.x,
          y: this.y,
          scaleX: this.baseScale,
          scaleY: this.baseScale,
          duration: 320,
          ease: 'Back.Out',
          onComplete: () => {
            this.idle?.resume();
            onDone();
          },
        });
      },
    });
  }

  die(onDone: () => void): void {
    if (this.dead) return;
    this.dead = true;
    this.idle?.remove();
    this.scene.tweens.killTweensOf(this.glow);
    this.sprite.clearTint();
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scale: this.baseScale * 1.35,
      angle: 12,
      y: this.y - 40,
      duration: 620,
      ease: 'Cubic.In',
    });
    this.scene.tweens.add({ targets: [this.glow, this.shadow], alpha: 0, duration: 620 });
    this.scene.tweens.add({
      targets: this.glow,
      scale: this.glow.scale * 1.8,
      duration: 620,
      onComplete: () => {
        this.destroy();
        onDone();
      },
    });
  }

  destroy(): void {
    this.idle?.remove();
    this.scene.tweens.killTweensOf([this.sprite, this.glow, this.shadow]);
    this.sprite.destroy();
    this.glow.destroy();
    this.shadow.destroy();
  }
}
