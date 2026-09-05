import Phaser from 'phaser';
import { Run } from './game';
import { Synth } from './audio';

export const WIDTH = 520, HEIGHT = 660;
interface Peg { body: MatterJS.BodyType; x: number; y: number; flash: number; color: number }
interface Ball { body: MatterJS.BodyType; trail: { x: number; y: number }[]; age: number; stuck: number; lastX: number; lastY: number; child: boolean }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: number }
interface Arc { from: Peg; to: Peg; life: number }
export interface SceneHooks { change: () => void; notice: (message: string) => void; settled: (killed: boolean) => void }
export class AlchemyScene extends Phaser.Scene {
  run: Run;
  private ink!: Phaser.GameObjects.Graphics;
  private effects!: Phaser.GameObjects.Graphics;
  private pegs: Peg[] = [];
  private balls = new Map<number, Ball>();
  private particles: Particle[] = [];
  private arcs: Arc[] = [];
  private splitQueue: { x: number; y: number }[] = [];
  private elapsed = 0;
  private aim = 0.3;
  private pressed = false;
  private lastUi = 0;
  private nudgeCount = 0;
  private floating = new Set<Phaser.GameObjects.Text>();
  private settlement?: Phaser.Time.TimerEvent;
  ready = false;
  constructor(private hooks: SceneHooks, public synth: Synth) { super('workshop'); this.run = new Run(); }
  create() {
    this.ink = this.add.graphics(); this.effects = this.add.graphics().setDepth(3);
    this.matter.world.setBounds(18, -80, WIDTH - 36, HEIGHT + 200, 36, true, true, true, false);
    for (let row = 0; row < 9; row++) {
      const count = row % 2 === 0 ? 7 : 6;
      for (let col = 0; col < count; col++) {
        const x = 65 + col * 65 + (row % 2) * 32.5;
        const y = 170 + row * 46;
        const body = this.matter.add.circle(x, y, 10, { isStatic: true, restitution: 0.88, friction: 0, label: `peg:${this.pegs.length}` });
        this.pegs.push({ body, x, y, flash: 0, color: [0xbca2ff, 0x8ee7cf, 0xd5bbff][(col + row) % 3] });
      }
    }
    this.matter.world.on('collisionstart', (event: { pairs: MatterJS.ICollisionPair[] }) => {
      if (this.run.phase !== 'flying') return;
      for (const pair of event.pairs) {
        const a = pair.bodyA as unknown as MatterJS.BodyType; const b = pair.bodyB as unknown as MatterJS.BodyType;
        const ball = this.balls.get(a.id) ?? this.balls.get(b.id);
        const other = this.balls.has(a.id) ? b : a;
        if (!ball || !other.label.startsWith('peg:')) continue;
        const peg = this.pegs[Number(other.label.slice(4))];
        this.hitPeg(ball, peg);
      }
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.x < 20 || p.x > 500 || p.y < 100 || p.y > 630 || this.run.phase !== 'aiming') return;
      this.pressed = true; this.setAimFromPoint(p.x, p.y); this.synth.unlock();
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.run.phase === 'aiming' && p.y > 100) this.setAimFromPoint(p.x, p.y);
    });
    this.input.on('pointerup', () => { if (this.pressed) this.launch(); this.pressed = false; });
    this.input.on('pointerupoutside', () => { this.pressed = false; });
    this.ready = true; this.hooks.change();
  }
  setAimFromPoint(x: number, y: number) { this.aim = Phaser.Math.Clamp(Math.atan2(x - 260, Math.max(35, y - 76)), -1.1, 1.1); }
  adjustAim(delta: number) { if (this.run.phase === 'aiming') this.aim = Phaser.Math.Clamp(this.aim + delta, -1.1, 1.1); }
  launch() {
    if (!this.ready || this.scene.isPaused() || !this.run.launch()) return;
    this.synth.unlock(); this.synth.tone('launch');
    this.spawn(260, 76, Math.sin(this.aim) * 9, Math.cos(this.aim) * 9, false);
    this.hooks.notice('炼成中 · 碰撞伤害将在所有弹珠回收后结算'); this.hooks.change();
  }
  private spawn(x: number, y: number, vx: number, vy: number, child: boolean) {
    const body = this.matter.add.circle(x, y, 6, { label: 'marble', restitution: 0.88, friction: 0, frictionAir: 0.001, frictionStatic: 0, density: 0.01, collisionFilter: { category: 2, mask: 1 } });
    this.matter.body.setVelocity(body, { x: vx, y: vy });
    this.balls.set(body.id, { body, child, trail: [], age: 0, stuck: 0, lastX: x, lastY: y });
  }
  private hitPeg(ball: Ball, peg: Peg) {
    const result = this.run.hit(this.pegs.length - 1);
    if (!result) return;
    peg.flash = 1;
    const color = result.critical ? 0xff93bb : this.run.build.fire ? 0xffb47c : 0xbba5ff;
    this.burst(peg.x, peg.y, color, result.critical ? 16 : 8);
    this.float(peg.x, peg.y - 14, `${result.critical ? '暴击 ' : '+'}${result.direct}`, result.critical ? '#ff93bb' : this.run.build.fire ? '#ffb47c' : '#e4d8ff');
    if (result.chain) {
      const nearest = this.pegs.filter(p => p !== peg).sort((a, b) => (a.x - peg.x) ** 2 + (a.y - peg.y) ** 2 - ((b.x - peg.x) ** 2 + (b.y - peg.y) ** 2)).slice(0, 2);
      for (const target of nearest) { target.flash = 1; this.arcs.push({ from: peg, to: target, life: 220 }); this.float(target.x, target.y - 12, '+1', '#f4d884'); }
    }
    // Only the first physical hit in this shot can enqueue two children.
    if (result.split) this.splitQueue.push({ x: ball.body.position.x, y: ball.body.position.y });
    this.synth.tone('hit', this.run.hits); this.hooks.change();
  }
  private burst(x: number, y: number, color: number, count = 10) {
    for (let i = 0; i < count; i++) { const angle = Math.random() * Math.PI * 2; const speed = 0.4 + Math.random() * 2.3; this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 450, max: 450, color }); }
    if (this.particles.length > 500) this.particles.splice(0, this.particles.length - 500);
  }
  private float(x: number, y: number, value: string, color: string) {
    const text = this.add.text(x, y, value, { fontFamily: 'system-ui, sans-serif', fontSize: '16px', fontStyle: 'bold', color, stroke: '#161326', strokeThickness: 4 }).setOrigin(0.5).setDepth(5);
    this.floating.add(text);
    this.tweens.add({ targets: text, y: y - 30, alpha: 0, duration: 750, onComplete: () => { this.floating.delete(text); text.destroy(); } });
  }
  private removeBall(id: number, ball: Ball) {
    this.burst(Phaser.Math.Clamp(ball.body.position.x, 24, 496), 609, 0x96eed8, 14);
    this.matter.world.remove(ball.body); this.balls.delete(id);
  }
  update(_time: number, rawDelta: number) {
    const dt = Math.min(rawDelta, 50); this.elapsed += dt;
    for (const point of this.splitQueue.splice(0)) {
      this.spawn(Phaser.Math.Clamp(point.x - 15, 27, 493), point.y - 15, -4.5, -3.5, true);
      this.spawn(Phaser.Math.Clamp(point.x + 15, 27, 493), point.y - 15, 4.5, -3.5, true);
      this.float(point.x, point.y - 36, '分裂 +2', '#8df0cd');
    }
    for (const [id, ball] of this.balls) {
      ball.age += dt;
      const { x, y } = ball.body.position;
      if (!Number.isFinite(x + y) || y > 607 || x < -30 || x > WIDTH + 30 || y < -90 || ball.age > 16000) {
        if (ball.age > 16000) this.hooks.notice('回收装置已接回滞留弹珠 · 已累计伤害保留');
        this.removeBall(id, ball); continue;
      }
      ball.trail.push({ x, y }); if (ball.trail.length > 15) ball.trail.shift();
      ball.stuck = Math.hypot(x - ball.lastX, y - ball.lastY) < 0.7 ? ball.stuck + dt : 0;
      ball.lastX = x; ball.lastY = y;
      if (ball.stuck > 850) { this.nudgeCount++; this.matter.body.setVelocity(ball.body, { x: (x < 260 ? 1 : -1) * 3.5, y: -4 }); ball.stuck = 0; this.float(x, y - 15, '轻推', '#8df0cd'); }
      const speed = Math.hypot(ball.body.velocity.x, ball.body.velocity.y);
      if (speed > 13) this.matter.body.setVelocity(ball.body, { x: ball.body.velocity.x * 13 / speed, y: ball.body.velocity.y * 13 / speed });
    }
    if (this.run.phase === 'flying' && this.balls.size === 0 && this.splitQueue.length === 0 && this.run.beginSettlement()) {
      this.hooks.notice(`炼成完毕 · ${this.run.damage} 点伤害即将释放`); this.hooks.change();
      this.settlement = this.time.delayedCall(650, () => {
        this.settlement = undefined;
        if (!this.run.settle()) return;
        const killed = this.run.enemyHp === 0;
        this.synth.tone(killed ? 'win' : 'hurt'); this.hooks.settled(killed); this.hooks.change();
      });
    }
    for (const p of this.pegs) p.flash = Math.max(0, p.flash - dt / 350);
    for (const p of this.particles) { p.life -= dt; p.x += p.vx * dt / 16.67; p.y += p.vy * dt / 16.67; p.vy += 0.035 * dt / 16.67; }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const arc of this.arcs) arc.life -= dt; this.arcs = this.arcs.filter(a => a.life > 0);
    this.draw();
    if (this.elapsed - this.lastUi > 150 && this.run.phase === 'flying') { this.lastUi = this.elapsed; this.hooks.change(); }
  }
  private draw() {
    const g = this.ink.clear(), fx = this.effects.clear();
    // Etched brass frame, a restrained grid, and a procedural transmutation circle.
    g.lineStyle(1, 0x71628a, 0.16);
    for (let x = 32; x < WIDTH; x += 24) for (let y = 26; y < HEIGHT; y += 24) g.strokeCircle(x, y, 0.5);
    g.lineStyle(1, 0x9679b7, 0.12); g.strokeCircle(260, 355, 182); g.strokeCircle(260, 355, 168);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.lineBetween(260 + Math.cos(a) * 172, 355 + Math.sin(a) * 172, 260 + Math.cos(a) * 181, 355 + Math.sin(a) * 181); }
    g.lineStyle(1, 0xba94ec, 0.06); g.strokeTriangle(260, 178, 107, 443, 413, 443); g.strokeTriangle(260, 532, 107, 267, 413, 267);
    g.lineStyle(2, 0xa794c9, 0.24); g.strokeRoundedRect(18, 14, 484, 623, 18);
    g.lineStyle(2, 0xdcc395, 0.7);
    for (const x of [18, 502]) for (const y of [32, 619]) { g.lineBetween(x, y, x, y + (y < 100 ? 20 : -20)); g.lineBetween(x, y, x + (x < 100 ? 10 : -10), y); }
    // Launcher.
    const pulse = (Math.sin(this.elapsed / 450) + 1) / 2;
    g.lineStyle(1, 0xc1a5f5, 0.3); g.strokeCircle(260, 76, 31); g.strokeCircle(260, 76, 25);
    g.fillStyle(0xa786ed, 0.05 + pulse * 0.04); g.fillCircle(260, 76, 25);
    g.lineStyle(2, 0xd4bcff, 0.8); g.lineBetween(260, 76, 260 + Math.sin(this.aim) * 24, 76 + Math.cos(this.aim) * 24);
    if (this.run.phase === 'aiming') {
      // First ballistic segment only; the marker stops at the first peg/wall.
      let x = 260, y = 76, vx = Math.sin(this.aim) * 9, vy = Math.cos(this.aim) * 9;
      for (let i = 0; i < 42; i++) {
        x += vx; y += vy; vy += 0.22;
        if (x < 27 || x > 493 || this.pegs.some(p => Math.hypot(p.x - x, p.y - y) < 16) || y > 570) {
          g.lineStyle(1, 0xddd0ff, 0.65); g.strokeCircle(x, y, 10); break;
        }
        if (i % 3 === 0) { g.fillStyle(0xdac8ff, 0.65 - i / 85); g.fillCircle(x, y, 2); }
      }
      g.fillStyle(0xb59aff, 0.16); g.fillCircle(260, 76, 17); g.fillStyle(0xf5eeff); g.fillCircle(260, 76, 6); g.fillStyle(0xffffff); g.fillCircle(258, 74, 2);
    }
    for (const peg of this.pegs) {
      g.fillStyle(peg.color, 0.04 + peg.flash * 0.15); g.fillCircle(peg.x, peg.y, 15 + peg.flash * 7);
      g.lineStyle(1, peg.color, 0.3 + peg.flash * 0.7); g.strokeCircle(peg.x, peg.y, 10);
      g.fillStyle(peg.color, 0.7 + peg.flash * 0.3); g.fillCircle(peg.x, peg.y, 6);
      g.fillStyle(0xffffff, 0.65); g.fillCircle(peg.x - 1.3, peg.y - 1.3, 1.4);
    }
    g.fillStyle(0x94e9d2, 0.025); g.fillRoundedRect(29, 586, 462, 40, 10);
    g.lineStyle(1, 0x8de8cf, 0.25); g.lineBetween(38, 608, 482, 608);
    for (let i = 0; i < 9; i++) { const x = 60 + i * 50; g.lineStyle(1, 0x9eedda, 0.2 + pulse * 0.2); g.lineBetween(x - 4, 616, x, 620); g.lineBetween(x, 620, x + 4, 616); }
    for (const ball of this.balls.values()) {
      const c = ball.child ? 0x8df0cd : this.run.build.fire ? 0xffbd83 : 0xcfb6ff;
      ball.trail.forEach((point, i) => { fx.fillStyle(c, i / ball.trail.length * 0.36); fx.fillCircle(point.x, point.y, i / ball.trail.length * 5); });
      fx.fillStyle(c, 0.13); fx.fillCircle(ball.body.position.x, ball.body.position.y, 14);
      fx.fillStyle(0xffffff); fx.fillCircle(ball.body.position.x, ball.body.position.y, 5.5);
    }
    for (const p of this.particles) { fx.fillStyle(p.color, p.life / p.max); fx.fillCircle(p.x, p.y, p.life / p.max * 2.5); }
    for (const arc of this.arcs) {
      fx.lineStyle(2, 0xf4d884, arc.life / 220); fx.beginPath(); fx.moveTo(arc.from.x, arc.from.y);
      fx.lineTo((arc.from.x + arc.to.x) / 2 + 8, (arc.from.y + arc.to.y) / 2 - 6); fx.lineTo(arc.to.x, arc.to.y); fx.strokePath();
    }
  }
  pauseGame() { this.pressed = false; if (this.ready && !this.sys.isPaused()) this.sys.pause(); }
  resumeGame() { if (this.ready) this.sys.resume(); }
  resetRun() {
    this.settlement?.remove(false); this.settlement = undefined;
    for (const ball of this.balls.values()) this.matter.world.remove(ball.body);
    this.balls.clear(); this.splitQueue = []; this.particles = []; this.arcs = [];
    this.tweens.killAll(); for (const text of this.floating) text.destroy(); this.floating.clear();
    this.pegs.forEach(p => p.flash = 0); this.run = new Run(); this.elapsed = 0; this.lastUi = 0; this.nudgeCount = 0; this.pressed = false; this.aim = 0.3;
    this.resumeGame(); this.hooks.notice('新的实验开始了 · 瞄准钉子，炼成你的第一击'); this.hooks.change();
  }
  snapshot() { return { phase: this.run.phase, hp: this.run.hp, level: this.run.level, enemyHp: this.run.enemyHp, damage: this.run.damage, hits: this.run.hits, shots: this.run.shots, totalDamage: this.run.totalDamage, build: { ...this.run.build }, offers: [...this.run.offers], balls: [...this.balls.values()].map(b => ({ x: b.body.position.x, y: b.body.position.y, age: b.age, child: b.child })), elapsed: this.elapsed, paused: this.scene.isPaused(), pendingSplit: this.splitQueue.length, nudgeCount: this.nudgeCount }; }
  // Boundary controls are reachable only through the opt-in development test bridge.
  testHit(index: number) { const ball = this.balls.values().next().value; if (ball) this.hitPeg(ball, this.pegs[index]); }
  testRecall() { for (const [id, ball] of this.balls) this.removeBall(id, ball); }
  testRest() { for (const ball of this.balls.values()) { ball.body.ignoreGravity = true; this.matter.body.setPosition(ball.body, { x: 260, y: 130 }); this.matter.body.setVelocity(ball.body, { x: 0, y: 0 }); } }
  testRelease() { for (const ball of this.balls.values()) ball.body.ignoreGravity = false; }
  testStall() { for (const ball of this.balls.values()) { this.matter.body.setPosition(ball.body, { x: 260, y: 130 }); this.matter.body.setVelocity(ball.body, { x: 0, y: 0 }); ball.age = 15990; } }
}
