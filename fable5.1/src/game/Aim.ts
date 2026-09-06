import Phaser from 'phaser';
import { BOARD, PHYSICS } from '../core/balance';
import type { Board, Peg } from './Board';

/** Matter 每个物理步的重力增量：gravity.y * scale(0.001) * dt^2（dt=1000/60）。 */
export const GRAVITY_PER_STEP = PHYSICS.gravityY * 0.001 * (1000 / 60) ** 2;

/**
 * 文件模块：瞄准线。把指针位置转成受限角度，并按与 Matter 一致的积分方式预演轨迹到第一次撞钉为止。
 * 约束：只允许向下发射（角度限制在 PHYSICS.minAimDeg 到 maxAimDeg 之间）。
 */
export class Aim {
  private gfx: Phaser.GameObjects.Graphics;
  private board: Board;
  angle: number;
  visible = false;

  constructor(scene: Phaser.Scene, board: Board) {
    this.board = board;
    this.gfx = scene.add.graphics().setDepth(15);
    this.angle = Math.PI / 2;
  }

  setTarget(px: number, py: number): void {
    const dx = px - this.board.launcher.x;
    const dy = py - this.board.launcher.y;
    let a = Math.atan2(dy, dx);
    const min = Phaser.Math.DegToRad(PHYSICS.minAimDeg);
    const max = Phaser.Math.DegToRad(PHYSICS.maxAimDeg);
    if (a < 0) a = dx < 0 ? max : min;
    this.angle = Phaser.Math.Clamp(a, min, max);
  }

  setAngleDeg(deg: number): void {
    this.angle = Phaser.Math.DegToRad(Phaser.Math.Clamp(deg, PHYSICS.minAimDeg, PHYSICS.maxAimDeg));
  }

  velocity(): { vx: number; vy: number } {
    return { vx: Math.cos(this.angle) * PHYSICS.launchSpeed, vy: Math.sin(this.angle) * PHYSICS.launchSpeed };
  }

  clear(): void {
    this.gfx.clear();
    this.visible = false;
  }

  draw(pegs: Peg[]): void {
    const g = this.gfx;
    g.clear();
    this.visible = true;
    const rect = this.board.rect;
    const R = BOARD.marbleRadius;
    let { vx, vy } = this.velocity();
    let x = this.board.launcher.x;
    let y = this.board.launcher.y;
    const hitR = BOARD.pegRadius + R;
    const active = pegs.filter((p) => p.active);
    let hitPeg: Peg | null = null;
    const dots: Array<{ x: number; y: number }> = [];
    for (let step = 0; step < 150; step++) {
      vy += GRAVITY_PER_STEP;
      x += vx;
      y += vy;
      if (x < rect.left + R) {
        x = rect.left + R;
        vx = -vx * PHYSICS.restitution;
      } else if (x > rect.right - R) {
        x = rect.right - R;
        vx = -vx * PHYSICS.restitution;
      }
      if (y > rect.bottom) break;
      for (const p of active) {
        if (Math.hypot(p.x - x, p.y - y) <= hitR) {
          hitPeg = p;
          break;
        }
      }
      if (hitPeg) break;
      if (step % 2 === 0) dots.push({ x, y });
    }
    dots.forEach((d, i) => {
      const t = i / Math.max(1, dots.length - 1);
      g.fillStyle(0x9df7ff, 0.95 - t * 0.7);
      g.fillCircle(d.x, d.y, 4.2 - t * 2);
    });
    if (hitPeg) {
      g.lineStyle(2, 0xff3fd8, 0.95);
      g.strokeCircle(hitPeg.x, hitPeg.y, BOARD.pegRadius + 7);
      g.lineStyle(1, 0xff3fd8, 0.4);
      g.strokeCircle(hitPeg.x, hitPeg.y, BOARD.pegRadius + 13);
    }
  }
}
