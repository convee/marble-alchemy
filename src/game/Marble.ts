import Phaser from 'phaser';
import { BOARD, PHYSICS } from '../core/balance';
import type { Rng } from '../core/rng';
import { newWatchdog, tickWatchdog, type WatchdogAction, type WatchdogState } from '../core/watchdog';

/**
 * 核心函数：一颗弹珠 = Matter 圆形刚体 + 贴图 + 卡住看门狗。
 * 约束：canSplit 只有玩家亲手发射的那颗为 true，分裂出来的一律 false（不递归分裂）。
 */
export class Marble {
  readonly go: Phaser.Physics.Matter.Image;
  readonly body: MatterJS.BodyType;
  readonly watchdog: WatchdogState = newWatchdog();
  canSplit: boolean;
  hasHit = false;
  removed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, vx: number, vy: number, canSplit: boolean) {
    this.go = scene.matter.add.image(x, y, 'marble', undefined, {
      shape: { type: 'circle', radius: BOARD.marbleRadius },
      restitution: PHYSICS.restitution,
      friction: 0,
      frictionAir: 0,
      frictionStatic: 0,
      density: 0.0015,
      label: 'marble',
    });
    this.go.setDepth(20);
    this.body = this.go.body as MatterJS.BodyType;
    this.go.setVelocity(vx, vy);
    this.canSplit = canSplit;
  }

  get x(): number {
    return this.go.x;
  }

  get y(): number {
    return this.go.y;
  }

  get speed(): number {
    return this.body.speed;
  }

  /** 每帧调用；返回看门狗动作，'nudge' 已在内部执行。 */
  tick(delta: number, rng: Rng): WatchdogAction {
    const action = tickWatchdog(this.watchdog, this.body.speed, delta);
    if (action === 'nudge') {
      this.go.setVelocity((rng() - 0.5) * 6, -(2.5 + rng() * 3));
    }
    return action;
  }

  destroy(): void {
    if (this.removed) return;
    this.removed = true;
    this.go.destroy();
  }
}
