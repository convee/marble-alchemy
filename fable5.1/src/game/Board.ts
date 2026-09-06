import Phaser from 'phaser';
import { BOARD, RULES } from '../core/balance';
import { generateLayout } from '../core/layout';
import { pickIndex, type Rng } from '../core/rng';
import type { Pt } from '../core/screen';

export interface Peg {
  index: number;
  x: number;
  y: number;
  body: MatterJS.BodyType;
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  active: boolean;
  refresh: boolean;
}

export const PEG_TINT = 0x35f2ff;
export const REFRESH_TINT = 0x5dff9a;
/** 每关钉子配色，与回充石的绿色都拉开距离 */
export const LEVEL_PEG_TINT: Record<number, number> = { 1: 0x35f2ff, 2: 0x6aa8ff, 3: 0xb388ff, 4: 0xff5fd2, 5: 0xffb347 };
const FULL_MASK = 0xffffffff;

/**
 * 文件模块：弹盘。负责墙体、钉子刚体与贴图、钉子熄灭/点亮、回充石。
 * 约束：钉子熄灭 = 关闭碰撞掩码而不是删刚体，下一次发射前全部恢复；
 *       回充时与弹珠重叠的钉子不恢复，避免把弹珠顶飞。
 */
export class Board {
  readonly scene: Phaser.Scene;
  readonly origin: Pt;
  readonly rect: Phaser.Geom.Rectangle;
  readonly launcher: Pt;
  readonly bodyToPeg = new Map<MatterJS.BodyType, Peg>();
  pegs: Peg[] = [];
  level = 0;
  pegTint: number = PEG_TINT;
  private frame: Phaser.GameObjects.Graphics;
  private launcherGlow: Phaser.GameObjects.Image;
  private readyMarble: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, origin: Pt) {
    this.scene = scene;
    this.origin = origin;
    this.rect = new Phaser.Geom.Rectangle(origin.x, origin.y, BOARD.width, BOARD.height);
    this.launcher = { x: origin.x + BOARD.width / 2, y: origin.y + BOARD.launcherY };
    this.frame = scene.add.graphics().setDepth(1);
    this.drawFrame();
    this.createWalls();
    this.launcherGlow = scene.add.image(this.launcher.x, this.launcher.y, 'glow').setScale(0.9).setTint(0x35f2ff).setAlpha(0.35).setDepth(2);
    this.readyMarble = scene.add.image(this.launcher.x, this.launcher.y, 'marble').setDepth(21);
    scene.tweens.add({ targets: this.launcherGlow, alpha: 0.6, scale: 1.05, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  setReadyMarbleVisible(v: boolean): void {
    this.readyMarble.setVisible(v);
  }

  private createWalls(): void {
    const t = BOARD.wallThickness;
    const { x, y } = this.origin;
    const W = BOARD.width;
    const H = BOARD.height;
    const opts = { isStatic: true, label: 'wall', restitution: 0.5, friction: 0, frictionStatic: 0 };
    this.scene.matter.add.rectangle(x - t / 2, y + H / 2 + 100, t, H + 400, opts);
    this.scene.matter.add.rectangle(x + W + t / 2, y + H / 2 + 100, t, H + 400, opts);
    this.scene.matter.add.rectangle(x + W / 2, y - t / 2, W + t * 2, t, opts);
  }

  private drawFrame(): void {
    const g = this.frame;
    const { x, y } = this.origin;
    const W = BOARD.width;
    const H = BOARD.height;
    g.fillStyle(0x0a1226, 0.88);
    g.fillRoundedRect(x, y, W, H, 18);
    // 底部收集区渐变
    g.fillGradientStyle(0xff3fd8, 0xff3fd8, 0xff3fd8, 0xff3fd8, 0, 0, 0.28, 0.28);
    g.fillRect(x + 6, y + H - 70, W - 12, 64);
    // 网格
    g.lineStyle(1, 0x35f2ff, 0.06);
    for (let gx = x + 60; gx < x + W; gx += 60) g.lineBetween(gx, y + 8, gx, y + H - 8);
    for (let gy = y + 60; gy < y + H; gy += 60) g.lineBetween(x + 8, gy, x + W - 8, gy);
    // 外发光边框
    g.lineStyle(10, 0x35f2ff, 0.08);
    g.strokeRoundedRect(x - 3, y - 3, W + 6, H + 6, 20);
    g.lineStyle(5, 0x35f2ff, 0.18);
    g.strokeRoundedRect(x - 1, y - 1, W + 2, H + 2, 19);
    g.lineStyle(2, 0x9df7ff, 0.9);
    g.strokeRoundedRect(x, y, W, H, 18);
    // 底边收集线
    g.lineStyle(3, 0xff3fd8, 0.9);
    g.lineBetween(x + 24, y + H - 6, x + W - 24, y + H - 6);
    // 发射口：坩埚
    const lx = this.launcher.x;
    const ly = this.launcher.y;
    g.fillStyle(0x141d3a, 1);
    g.fillRoundedRect(lx - 46, y + 2, 92, 30, { tl: 0, tr: 0, bl: 16, br: 16 });
    g.lineStyle(2, 0xff3fd8, 0.8);
    g.beginPath();
    g.arc(lx, ly - 6, 34, Math.PI * 0.08, Math.PI * 0.92, false);
    g.strokePath();
    g.lineStyle(2, 0x35f2ff, 0.5);
    g.beginPath();
    g.arc(lx, ly - 6, 40, Math.PI * 0.12, Math.PI * 0.88, false);
    g.strokePath();
  }

  buildLevel(level: number): void {
    this.clearPegs();
    this.level = level;
    this.pegTint = LEVEL_PEG_TINT[level] ?? PEG_TINT;
    const specs = generateLayout(level);
    specs.forEach((s, i) => {
      const wx = this.origin.x + s.x;
      const wy = this.origin.y + s.y;
      const body = this.scene.matter.add.circle(wx, wy, BOARD.pegRadius, { isStatic: true, label: 'peg', restitution: 0.4, friction: 0 });
      const glow = this.scene.add.image(wx, wy, 'glow').setScale(0.42).setTint(this.pegTint).setAlpha(0.45).setDepth(5);
      const sprite = this.scene.add.image(wx, wy, 'peg').setTint(this.pegTint).setDepth(10);
      const peg: Peg = { index: i, x: wx, y: wy, body, sprite, glow, active: true, refresh: false };
      this.pegs.push(peg);
      this.bodyToPeg.set(body, peg);
      sprite.setScale(0).setAlpha(0);
      glow.setAlpha(0);
      this.scene.tweens.add({ targets: sprite, scale: 1, alpha: 1, duration: 260, delay: 12 * i, ease: 'Back.Out' });
      this.scene.tweens.add({ targets: glow, alpha: 0.45, duration: 260, delay: 12 * i });
    });
  }

  private clearPegs(): void {
    for (const p of this.pegs) {
      this.scene.tweens.killTweensOf([p.sprite, p.glow]);
      this.scene.matter.world.remove(p.body);
      p.sprite.destroy();
      p.glow.destroy();
    }
    this.pegs = [];
    this.bodyToPeg.clear();
  }

  /** 每次发射前：全部点亮，重新随机 N 颗回充石。 */
  resetForLaunch(rng: Rng): void {
    for (const p of this.pegs) {
      p.refresh = false;
      if (!p.active) this.activate(p, false);
      else this.paint(p);
    }
    const candidates = this.pegs.filter((p) => p.y - this.origin.y > BOARD.height * 0.4);
    for (let n = 0; n < RULES.refreshPegs && candidates.length > 0; n++) {
      const i = pickIndex(rng, candidates.length);
      const p = candidates.splice(i, 1)[0];
      p.refresh = true;
      this.paint(p);
    }
  }

  private paint(p: Peg): void {
    this.scene.tweens.killTweensOf(p.glow);
    const tint = p.refresh ? REFRESH_TINT : this.pegTint;
    p.sprite.setTint(tint);
    p.glow.setTint(tint);
    p.sprite.setScale(p.refresh ? 1.15 : 1).setAlpha(1);
    p.glow.setAlpha(p.refresh ? 0.7 : 0.45).setScale(p.refresh ? 0.6 : 0.42);
    if (p.refresh) {
      this.scene.tweens.add({ targets: p.glow, alpha: 0.35, scale: 0.5, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
  }

  activate(p: Peg, animate: boolean): void {
    p.active = true;
    p.body.collisionFilter.mask = FULL_MASK;
    this.scene.tweens.killTweensOf([p.sprite, p.glow]);
    p.sprite.setVisible(true);
    p.glow.setVisible(true);
    this.paint(p);
    if (animate) {
      p.sprite.setScale(0.2).setAlpha(0.2);
      this.scene.tweens.add({ targets: p.sprite, scale: p.refresh ? 1.15 : 1, alpha: 1, duration: 220, ease: 'Back.Out' });
    }
  }

  consume(p: Peg): void {
    if (!p.active) return;
    p.active = false;
    p.body.collisionFilter.mask = 0;
    p.refresh = false;
    this.scene.tweens.killTweensOf([p.sprite, p.glow]);
    p.sprite.setTintFill(0xffffff);
    this.scene.tweens.add({
      targets: p.sprite,
      scale: 1.6,
      alpha: 0,
      duration: 160,
      ease: 'Cubic.Out',
      onComplete: () => {
        p.sprite.clearTint();
        p.sprite.setTint(this.pegTint);
        p.sprite.setVisible(false);
      },
    });
    this.scene.tweens.add({ targets: p.glow, alpha: 0, duration: 160 });
  }

  /** 闪电命中时的闪白，不改变 active。 */
  flash(p: Peg): void {
    if (!p.active) return;
    p.sprite.setTintFill(0xffffff);
    this.scene.tweens.add({
      targets: p.sprite,
      scale: p.refresh ? 1.5 : 1.35,
      duration: 90,
      yoyo: true,
      onComplete: () => {
        p.sprite.clearTint();
        p.sprite.setTint(p.refresh ? REFRESH_TINT : this.pegTint);
      },
    });
  }

  /** 回充：点亮所有熄灭的钉子，跳过与弹珠重叠的位置。返回点亮数量。 */
  restoreAll(avoid: Pt[]): number {
    const minDist = BOARD.pegRadius + BOARD.marbleRadius + 6;
    let n = 0;
    for (const p of this.pegs) {
      if (p.active) continue;
      if (avoid.some((a) => Math.hypot(a.x - p.x, a.y - p.y) < minDist)) continue;
      this.activate(p, true);
      n++;
    }
    return n;
  }

  activeCount(): number {
    return this.pegs.reduce((n, p) => n + (p.active ? 1 : 0), 0);
  }

  activeOthers(exclude: Peg): Peg[] {
    return this.pegs.filter((p) => p.active && p !== exclude);
  }

  nearestActive(x: number, y: number, exclude: Peg, n: number): Peg[] {
    return this.activeOthers(exclude)
      .map((p) => ({ p, d: Math.hypot(p.x - x, p.y - y) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, n)
      .map((e) => e.p);
  }
}
