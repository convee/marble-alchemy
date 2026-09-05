import Phaser from 'phaser';
import type { Pt } from '../core/screen';

export const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",system-ui,sans-serif';

interface Bolt {
  pts: Pt[];
  life: number;
  max: number;
  color: number;
}

export interface FloatTextOpts {
  color?: string;
  size?: number;
  rise?: number;
  duration?: number;
  stroke?: string;
  delay?: number;
  scaleFrom?: number;
  depth?: number;
}

/**
 * 文件模块：视觉反馈集合（碰撞粒子、弹珠拖尾、火焰尾迹、浮动伤害数字、闪电、冲击环、震屏）。
 * 职责：只做表现，不改任何游戏状态。
 */
export class Effects {
  private scene: Phaser.Scene;
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private trail: Phaser.GameObjects.Particles.ParticleEmitter;
  private fire: Phaser.GameObjects.Particles.ParticleEmitter;
  private boltGfx: Phaser.GameObjects.Graphics;
  private bolts: Bolt[] = [];
  private boltsDirty = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.sparks = scene.add
      .particles(0, 0, 'spark', {
        lifespan: { min: 220, max: 480 },
        speed: { min: 60, max: 240 },
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(25);
    this.trail = scene.add
      .particles(0, 0, 'spark', {
        lifespan: 280,
        speed: 0,
        scale: { start: 0.9, end: 0.1 },
        alpha: { start: 0.6, end: 0 },
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(18);
    this.fire = scene.add
      .particles(0, 0, 'spark', {
        lifespan: { min: 260, max: 520 },
        speedY: { min: -90, max: -30 },
        speedX: { min: -25, max: 25 },
        scale: { start: 1.1, end: 0 },
        alpha: { start: 0.9, end: 0 },
        tint: [0xff8a3d, 0xffd36b, 0xff4d4d],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(19);
    this.boltGfx = scene.add.graphics().setDepth(30);
  }

  burst(x: number, y: number, tint: number, count = 10): void {
    this.sparks.setParticleTint(tint);
    this.sparks.explode(count, x, y);
  }

  trailAt(x: number, y: number, tint: number): void {
    this.trail.setParticleTint(tint);
    this.trail.emitParticleAt(x, y, 1);
  }

  fireAt(x: number, y: number, count = 1): void {
    this.fire.emitParticleAt(x, y, count);
  }

  floatText(x: number, y: number, text: string, o: FloatTextOpts = {}): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, text, {
        fontFamily: FONT,
        fontSize: `${o.size ?? 20}px`,
        fontStyle: 'bold',
        color: o.color ?? '#ffffff',
        stroke: o.stroke ?? '#06101f',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(o.depth ?? 40)
      .setScale(o.scaleFrom ?? 0.6);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 130, ease: 'Back.Out' });
    this.scene.tweens.add({
      targets: t,
      y: y - (o.rise ?? 46),
      alpha: 0,
      duration: o.duration ?? 720,
      delay: 140 + (o.delay ?? 0),
      ease: 'Cubic.Out',
      onComplete: () => t.destroy(),
    });
    return t;
  }

  bolt(from: Pt, to: Pt, color = 0xc58bff): void {
    const pts: Pt[] = [from];
    const n = 5;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const off = (Math.random() - 0.5) * 16;
      pts.push({ x: from.x + dx * t + nx * off, y: from.y + dy * t + ny * off });
    }
    pts.push(to);
    this.bolts.push({ pts, life: 0, max: 170, color });
    this.boltsDirty = true;
  }

  ring(x: number, y: number, color: number, radius = 70, duration = 360): void {
    const g = this.scene.add.graphics().setDepth(35);
    g.lineStyle(5, color, 1);
    g.strokeCircle(0, 0, 20);
    g.setPosition(x, y);
    this.scene.tweens.add({
      targets: g,
      scale: radius / 20,
      alpha: 0,
      duration,
      ease: 'Cubic.Out',
      onComplete: () => g.destroy(),
    });
  }

  shake(intensity = 0.004, duration = 120): void {
    this.scene.cameras.main.shake(duration, intensity);
  }

  flash(r: number, g: number, b: number, duration = 160): void {
    this.scene.cameras.main.flash(duration, r, g, b);
  }

  update(delta: number): void {
    if (this.bolts.length === 0) {
      if (this.boltsDirty) {
        this.boltGfx.clear();
        this.boltsDirty = false;
      }
      return;
    }
    this.boltGfx.clear();
    this.boltsDirty = true;
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.life += delta;
      const a = 1 - b.life / b.max;
      if (a <= 0) {
        this.bolts.splice(i, 1);
        continue;
      }
      this.boltGfx.lineStyle(7, b.color, a * 0.3);
      this.boltGfx.strokePoints(b.pts, false, false);
      this.boltGfx.lineStyle(2, 0xffffff, a);
      this.boltGfx.strokePoints(b.pts, false, false);
    }
  }
}
