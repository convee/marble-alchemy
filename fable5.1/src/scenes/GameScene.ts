import Phaser from 'phaser';
import { BOARD, PHYSICS, RULES } from '../core/balance';
import { mulberry32, type Rng } from '../core/rng';
import {
  advanceLevel,
  applyUpgrade,
  beginVolley,
  enemyCounterattack,
  isFinalLevel,
  levelDef,
  newRun,
  recordHit,
  rollHit,
  settleVolley,
  tallyTotal,
  type RunState,
} from '../core/runState';
import type { ScreenLayout } from '../core/screen';
import { ownedCount, rollUpgrades, UPGRADES, type UpgradeId } from '../core/upgrades';
import type { Overlay, RunSummary } from '../ui/Overlay';
import type { Sfx } from '../audio/Sfx';
import { Board, REFRESH_TINT, type Peg } from '../game/Board';
import { Marble } from '../game/Marble';
import { Effects } from '../game/Effects';
import { Aim } from '../game/Aim';
import { Enemy } from '../game/Enemy';
import { Hud } from '../game/Hud';
import { registerScene, type DebugState } from '../debug/hooks';

/**
 * 回合阶段。
 * intro：开始菜单；ready：可瞄准发射；flying：弹珠在盘中；settle：结算动画；enemyTurn：敌人反击；
 * upgrading：三选一；transition：关卡横幅/敌人登场或死亡；gameover / victory：终局。
 */
export type Phase = 'intro' | 'ready' | 'flying' | 'settle' | 'enemyTurn' | 'upgrading' | 'transition' | 'gameover' | 'victory';

export interface GameSceneData {
  seed?: number;
  skipStart?: boolean;
}

const PAUSABLE: Phase[] = ['ready', 'flying', 'settle', 'enemyTurn', 'transition'];

/**
 * 功能入口：主场景，串起 瞄准 -> 发射 -> 碰撞累计 -> 全部落底 -> 一次结算 -> 反击/升级 -> 下一关 的状态机。
 * 约束：
 *  - 每轮只结算一次：beginSettle 只在 phase==='flying' 且弹珠数为 0 时进入，并立刻切到 'settle'。
 *  - 暂停走 scene.pause()，物理、计时器、补间一起停；恢复后从停下的那一帧继续。
 *  - 重开走 scene.restart()，init 重建 RunState，所有游戏对象/刚体/监听随场景 shutdown 一并销毁。
 */
export class GameScene extends Phaser.Scene {
  state!: RunState;
  rng!: Rng;
  seed = 0;
  layout!: ScreenLayout;
  overlay!: Overlay;
  sfx!: Sfx;
  board!: Board;
  effects!: Effects;
  aim!: Aim;
  hud!: Hud;
  enemy: Enemy | null = null;
  marbles: Marble[] = [];
  phase: Phase = 'intro';
  paused = false;

  private bodyToMarble = new Map<MatterJS.BodyType, Marble>();
  private pendingSplits: Marble[] = [];
  private hitThisStep = new Set<Marble>();
  private volleyMs = 0;
  private combo = 0;
  private maxMarblesThisVolley = 0;
  private pointerAiming = false;
  private skipStart = false;
  private lastWallSfx = 0;
  private frame = 0;
  private visibilityHandler: (() => void) | null = null;

  constructor() {
    super('Game');
  }

  init(data: GameSceneData): void {
    this.seed = data.seed ?? Math.floor(Math.random() * 2 ** 31);
    this.skipStart = !!data.skipStart;
    this.rng = mulberry32(this.seed);
    this.state = newRun();
    this.marbles = [];
    this.bodyToMarble = new Map();
    this.pendingSplits = [];
    this.hitThisStep = new Set();
    this.enemy = null;
    this.phase = 'intro';
    this.paused = false;
    this.pointerAiming = false;
    this.volleyMs = 0;
    this.combo = 0;
    this.maxMarblesThisVolley = 0;
    this.frame = 0;
  }

  create(): void {
    this.layout = this.registry.get('layout') as ScreenLayout;
    this.overlay = this.registry.get('overlay') as Overlay;
    this.sfx = this.registry.get('sfx') as Sfx;
    this.overlay.hide();

    this.drawBackground();
    this.effects = new Effects(this);
    this.board = new Board(this, this.layout.board);
    this.aim = new Aim(this, this.board);
    this.hud = new Hud(
      this,
      this.layout,
      {
        onPause: () => this.togglePause(),
        onToggleSound: () => this.toggleSound(),
        onHelp: () => this.showHelp(),
      },
      this.sfx.muted,
    );
    this.hud.setPlayerHp(this.state.playerHp, this.state.maxHp, false);
    this.hud.setUpgrades(this.state.upgrades);
    this.hud.setCharge(this.state.volley, false);
    this.board.buildLevel(this.state.level);
    this.board.setReadyMarbleVisible(false);

    this.setupInput();
    this.matter.world.on('collisionstart', this.onCollision, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    registerScene(this);

    const def = levelDef(this.state.level);
    this.hud.setLevel(def.level, RULES.levelCount, def.name);
    this.hud.setEnemyHp(this.state.enemyHp, this.state.enemyMaxHp, false);
    this.hud.setIntent(def.atk, true);

    if (this.skipStart) {
      this.startLevelIntro();
    } else {
      this.overlay.showStart({
        onStart: () => this.startFromOverlay(),
        muted: this.sfx.muted,
        onToggleSound: () => this.toggleSound(),
      });
    }
  }

  private drawBackground(): void {
    const L = this.layout;
    this.add
      .particles(0, 0, 'glow', {
        x: { min: 0, max: L.width },
        y: { min: 0, max: L.height },
        lifespan: 7000,
        speedY: { min: -10, max: -3 },
        speedX: { min: -3, max: 3 },
        scale: { start: 0.2, end: 0.7 },
        alpha: { start: 0, end: 0.12, ease: 'Sine.InOut' },
        tint: [0x35f2ff, 0xff3fd8, 0x8b5cff],
        frequency: 420,
        blendMode: 'ADD',
      })
      .setDepth(0);
  }

  /* ------------------------------ 输入 ------------------------------ */

  private setupInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      if (this.overlay.isOpen || this.phase !== 'ready') return;
      if (!this.board.rect.contains(p.x, p.y)) return;
      this.pointerAiming = true;
      this.aim.setTarget(p.x, p.y);
      this.aim.draw(this.board.pegs);
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (this.overlay.isOpen || this.phase !== 'ready') return;
      if (p.isDown && !this.pointerAiming) return;
      if (!p.isDown && !this.board.rect.contains(p.x, p.y)) return;
      this.aim.setTarget(p.x, p.y);
      this.aim.draw(this.board.pegs);
    });
    const release = (p: Phaser.Input.Pointer) => {
      if (!this.pointerAiming) return;
      this.pointerAiming = false;
      if (this.overlay.isOpen || this.phase !== 'ready') return;
      this.aim.setTarget(p.x, p.y);
      this.launch();
    };
    this.input.on(Phaser.Input.Events.POINTER_UP, release);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, release);

    const kb = this.input.keyboard;
    if (kb) {
      kb.on('keydown-ESC', () => this.togglePause());
      kb.on('keydown-P', () => this.togglePause());
      kb.on('keydown-M', () => {
        this.toggleSound();
        this.hud.setMuted(this.sfx.muted);
      });
      kb.on('keydown-H', () => this.showHelp());
      kb.on('keydown-SPACE', () => {
        if (this.overlay.isOpen || this.phase !== 'ready') return;
        this.launch();
      });
    }

    this.visibilityHandler = () => {
      if (document.visibilityState === 'hidden' && this.canPause()) this.pause();
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private cleanup(): void {
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    this.input.keyboard?.removeAllListeners();
    this.enemy = null;
    this.marbles = [];
    this.bodyToMarble.clear();
    this.pendingSplits = [];
    this.hitThisStep.clear();
  }

  startFromOverlay(): boolean {
    if (this.phase !== 'intro') return false;
    this.sfx.unlock();
    this.sfx.play('click');
    this.overlay.hide();
    this.startLevelIntro();
    return true;
  }

  toggleSound(): boolean {
    const muted = this.sfx.toggle();
    this.hud.setMuted(muted);
    if (!muted) this.sfx.play('click');
    return muted;
  }

  setMuted(m: boolean): void {
    this.sfx.setMuted(m);
    this.hud.setMuted(m);
  }

  /* ------------------------------ 关卡流程 ------------------------------ */

  private startLevelIntro(): void {
    this.phase = 'transition';
    const def = levelDef(this.state.level);
    this.hud.setLevel(def.level, RULES.levelCount, def.name);
    this.hud.setEnemyHp(this.state.enemyHp, this.state.enemyMaxHp, false);
    this.hud.setIntent(def.atk, true);
    this.hud.setFlavor(def.flavor);
    this.hud.setHint('');
    this.enemy?.destroy();
    this.enemy = new Enemy(this, this.layout.enemy.x, this.layout.enemy.y, def.enemyKey, this.layout.enemyScale);
    this.hud.banner(`第 ${def.level} 关`, def.name);
    this.time.delayedCall(300, () => this.enemy?.enter());
    this.time.delayedCall(1250, () => {
      if (this.phase === 'transition') this.readyForLaunch();
    });
  }

  private readyForLaunch(): void {
    this.phase = 'ready';
    this.board.resetForLaunch(this.rng);
    this.board.setReadyMarbleVisible(true);
    this.hud.setCharge(this.state.volley, false);
    this.hud.setHint(this.state.stats.launches === 0 ? '在弹盘内按住拖动瞄准，松开发射' : '');
    this.aim.draw(this.board.pegs);
  }

  /** 发射一颗弹珠；只有 ready 阶段有效。返回是否发射成功。 */
  launch(): boolean {
    if (this.phase !== 'ready' || this.overlay.isOpen) return false;
    this.phase = 'flying';
    this.volleyMs = 0;
    this.combo = 0;
    this.maxMarblesThisVolley = 0;
    beginVolley(this.state);
    this.hud.setCharge(this.state.volley, false);
    this.hud.setHint('');
    this.aim.clear();
    this.board.setReadyMarbleVisible(false);
    const { vx, vy } = this.aim.velocity();
    this.spawnMarble(this.board.launcher.x, this.board.launcher.y, vx, vy, true);
    this.sfx.play('launch');
    this.effects.burst(this.board.launcher.x, this.board.launcher.y, 0x9df7ff, 6);
    return true;
  }

  private spawnMarble(x: number, y: number, vx: number, vy: number, canSplit: boolean): Marble {
    const m = new Marble(this, x, y, vx, vy, canSplit);
    this.marbles.push(m);
    this.bodyToMarble.set(m.body, m);
    this.maxMarblesThisVolley = Math.max(this.maxMarblesThisVolley, this.marbles.length);
    return m;
  }

  private removeMarble(m: Marble, fell: boolean): void {
    const x = Phaser.Math.Clamp(m.x, this.board.rect.left + 10, this.board.rect.right - 10);
    m.destroy();
    this.bodyToMarble.delete(m.body);
    this.marbles = this.marbles.filter((o) => o !== m);
    if (fell) {
      this.sfx.play('drop');
      this.effects.burst(x, this.board.rect.bottom - 6, 0xff3fd8, 8);
    }
  }

  /* ------------------------------ 碰撞 ------------------------------ */

  private onCollision(event: Phaser.Physics.Matter.Events.CollisionStartEvent): void {
    if (this.phase !== 'flying') return;
    for (const pair of event.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      let marble = this.bodyToMarble.get(a);
      let other = b;
      if (!marble) {
        marble = this.bodyToMarble.get(b);
        other = a;
      }
      if (!marble || marble.removed) continue;
      const peg = this.board.bodyToPeg.get(other);
      if (peg) {
        if (peg.active) this.onPegHit(marble, peg);
        continue;
      }
      if (other.label === 'wall') this.onWallHit(marble);
    }
  }

  private onWallHit(m: Marble): void {
    this.effects.burst(m.x, m.y, 0x9df7ff, 3);
    if (this.time.now - this.lastWallSfx > 90) {
      this.lastWallSfx = this.time.now;
      this.sfx.play('wall');
    }
  }

  /**
   * 核心函数：一次撞钉。顺序：判定 -> 熄灭钉子 -> 回充 -> 闪电 -> 记账 -> 表现 -> 登记分裂。
   * 约束：闪电目标在钉子熄灭/回充之后选取，且目标只闪白、不熄灭、不再触发任何效果。
   */
  private onPegHit(marble: Marble, peg: Peg): void {
    const s = this.state;
    const r = rollHit(s, this.rng, this.board.activeOthers(peg).length);
    const wasRefresh = peg.refresh;
    this.board.consume(peg);
    this.combo += 1;

    if (wasRefresh) {
      const avoid = this.marbles.filter((m) => !m.removed).map((m) => ({ x: m.x, y: m.y }));
      const n = this.board.restoreAll(avoid);
      this.sfx.play('refresh');
      this.effects.ring(peg.x, peg.y, REFRESH_TINT, 100, 420);
      this.effects.floatText(peg.x, peg.y - 30, n > 0 ? `回充 ${n} 钉` : '回充', { color: '#5dff9a', size: 18, rise: 42, delay: 120 });
    }

    let lightningHits = 0;
    if (r.lightningTargets > 0) {
      const targets = this.board.nearestActive(peg.x, peg.y, peg, r.lightningTargets);
      for (const t of targets) {
        this.effects.bolt({ x: peg.x, y: peg.y }, { x: t.x, y: t.y });
        this.board.flash(t);
        this.effects.floatText(t.x, t.y - 16, '+1', { color: '#c58bff', size: 15, rise: 30, delay: 60 });
        lightningHits += 1;
      }
      if (targets.length > 0) this.sfx.play('zap');
    }

    recordHit(s, r, lightningHits);

    const tint = r.crit ? 0xffd36b : wasRefresh ? REFRESH_TINT : this.board.pegTint;
    this.effects.burst(peg.x, peg.y, tint, r.crit ? 18 : 9);
    this.effects.floatText(peg.x, peg.y - 10, r.crit ? `${r.hitDamage} 暴击` : `${r.hitDamage}`, {
      color: r.crit ? '#ffd36b' : '#ffffff',
      size: r.crit ? 26 : 19,
      rise: r.crit ? 58 : 44,
    });
    if (r.fireDamage > 0) {
      this.effects.floatText(peg.x + 20, peg.y + 8, `+${r.fireDamage}`, { color: '#ff8a3d', size: 15, rise: 36, delay: 90 });
      this.effects.fireAt(peg.x, peg.y, 4);
      this.sfx.play('fire');
    }
    this.sfx.play(r.crit ? 'crit' : 'hit', this.combo);
    this.hud.setCharge(s.volley, true);

    if (!marble.hasHit && marble.canSplit && s.upgrades.split) {
      marble.canSplit = false;
      this.pendingSplits.push(marble);
    }
    marble.hasHit = true;
    this.hitThisStep.add(marble);
  }

  /** 分裂在物理步之后执行，用的是反弹后的速度方向。 */
  private doSplit(m: Marble): void {
    if (m.removed || this.phase !== 'flying') return;
    const v = m.body.velocity;
    const sp = Math.max(6, Math.hypot(v.x, v.y));
    const base = Math.atan2(v.y, v.x);
    for (const k of [-1, 1]) {
      const a = base + k * 0.55;
      const d = BOARD.marbleRadius * 2.4;
      this.spawnMarble(m.x + Math.cos(a) * d, m.y + Math.sin(a) * d, Math.cos(a) * sp, Math.sin(a) * sp, false);
    }
    this.sfx.play('split');
    this.effects.ring(m.x, m.y, 0x5dff9a, 54, 260);
    this.effects.floatText(m.x, m.y - 30, '分裂', { color: '#5dff9a', size: 18, rise: 40 });
  }

  /* ------------------------------ 主循环 ------------------------------ */

  update(_time: number, delta: number): void {
    this.frame += 1;
    this.effects.update(delta);
    if (this.phase !== 'flying') return;

    this.volleyMs += delta;
    if (this.hitThisStep.size > 0) {
      // 物理步之后给刚撞过钉子的弹珠一点水平扰动，避免在同一列上无限竖直往返
      for (const m of this.hitThisStep) {
        if (m.removed) continue;
        const v = m.body.velocity;
        m.go.setVelocity(v.x + (this.rng() - 0.5) * 2 * PHYSICS.hitJitter, v.y);
      }
      this.hitThisStep.clear();
    }
    if (this.pendingSplits.length > 0) {
      const list = this.pendingSplits;
      this.pendingSplits = [];
      for (const m of list) this.doSplit(m);
    }

    const fire = this.state.upgrades.fire > 0;
    const trailTint = fire ? 0xffb27a : 0x9df7ff;
    const rect = this.board.rect;
    for (const m of this.marbles.slice()) {
      if (m.removed) continue;
      const out = m.y > rect.bottom + BOARD.fallMargin || m.x < rect.left - 80 || m.x > rect.right + 80 || m.y < rect.top - 140;
      const action = m.tick(delta, this.rng);
      if (out || action === 'remove') {
        this.removeMarble(m, out && m.y > rect.bottom);
        continue;
      }
      if (action === 'nudge') this.effects.burst(m.x, m.y, 0xffffff, 4);
      this.effects.trailAt(m.x, m.y, trailTint);
      if (fire && this.frame % 3 === 0) this.effects.fireAt(m.x, m.y, 1);
    }

    if (this.marbles.length === 0) {
      this.beginSettle();
    } else if (this.volleyMs > PHYSICS.volleyMaxMs) {
      for (const m of this.marbles.slice()) this.removeMarble(m, false);
      this.beginSettle();
    }
  }

  /* ------------------------------ 结算 ------------------------------ */

  private beginSettle(): void {
    if (this.phase !== 'flying') return;
    this.phase = 'settle';
    this.aim.clear();
    const total = tallyTotal(this.state.volley);
    if (total <= 0) {
      const p = this.hud.chargePos;
      this.effects.floatText(p.x, p.y - 44, '本轮没有命中', { color: '#8ea2c8', size: 16, rise: 30 });
      this.time.delayedCall(500, () => this.enemyTurn());
      return;
    }
    const from = this.hud.chargePos;
    const to = this.enemy ? { x: this.enemy.x, y: this.enemy.y } : from;
    const orb = this.add.image(from.x, from.y, 'orb').setDepth(45).setScale(0.6);
    this.tweens.add({
      targets: orb,
      x: to.x,
      y: to.y,
      scale: 1.5,
      duration: 380,
      delay: 260,
      ease: 'Quad.In',
      onComplete: () => {
        orb.destroy();
        this.applySettle();
      },
    });
  }

  private applySettle(): void {
    if (this.phase !== 'settle') return;
    const res = settleVolley(this.state);
    this.hud.setCharge(this.state.volley, false);
    this.hud.setEnemyHp(res.enemyHp, this.state.enemyMaxHp, true);
    const e = this.enemy;
    if (e) {
      e.hurt();
      this.effects.burst(e.x, e.y, 0xffd36b, 26);
      this.effects.ring(e.x, e.y, 0xffd36b, 130, 420);
      this.effects.floatText(e.x, e.y - 70, `-${res.damage}`, { color: '#ffd36b', size: 46, rise: 70, duration: 900 });
    }
    this.sfx.play('settle');
    this.sfx.play('enemyHurt');
    this.effects.shake(0.006, 160);
    if (res.enemyDead) {
      this.time.delayedCall(380, () => this.onEnemyDead());
    } else {
      this.time.delayedCall(700, () => this.enemyTurn());
    }
  }

  private enemyTurn(): void {
    if (this.phase !== 'settle') return;
    this.phase = 'enemyTurn';
    const e = this.enemy;
    if (!e || e.dead) {
      this.readyForLaunch();
      return;
    }
    const dirX = this.layout.portrait ? 0 : -1;
    const dirY = this.layout.portrait ? 1 : 0;
    e.lunge(
      dirX,
      dirY,
      () => {
        const res = enemyCounterattack(this.state);
        this.hud.setPlayerHp(res.playerHp, this.state.maxHp, true);
        this.sfx.play('playerHurt');
        this.effects.shake(0.012, 260);
        this.effects.flash(255, 40, 90, 240);
        const hx = this.layout.playerHp.x + 62 + Math.min(4, res.playerHp) * 36;
        this.effects.floatText(hx, this.layout.playerHp.y - 26, `-${res.damage}`, { color: '#ff5fa2', size: 26, rise: 40 });
        if (res.playerDead) this.gameOver();
      },
      () => {
        if (this.phase === 'enemyTurn') this.readyForLaunch();
      },
    );
  }

  private onEnemyDead(): void {
    if (this.phase !== 'settle') return;
    this.phase = 'transition';
    this.hud.setIntent(0, false);
    this.sfx.play('enemyDie');
    const e = this.enemy;
    if (!e) {
      this.afterEnemyDead();
      return;
    }
    this.effects.burst(e.x, e.y, e.tint, 40);
    this.effects.ring(e.x, e.y, e.tint, 180, 600);
    e.die(() => this.afterEnemyDead());
  }

  private afterEnemyDead(): void {
    this.enemy = null;
    if (isFinalLevel(this.state)) this.victory();
    else this.showUpgrades();
  }

  private showUpgrades(): void {
    this.phase = 'upgrading';
    const ids = rollUpgrades(this.state.upgrades, this.state.playerHp, this.rng);
    this.overlay.showUpgrades(
      ids.map((id) => ({ id, owned: ownedCount(this.state.upgrades, id) })),
      this.state.playerHp,
      (id) => this.pickUpgrade(id),
    );
  }

  private pickUpgrade(id: UpgradeId): void {
    if (this.phase !== 'upgrading') return;
    this.overlay.hide();
    applyUpgrade(this.state, id);
    this.sfx.play(id === 'heal' ? 'heal' : 'upgrade');
    this.hud.setUpgrades(this.state.upgrades);
    this.hud.setPlayerHp(this.state.playerHp, this.state.maxHp, false);
    this.overlay.toast(`炼成「${UPGRADES[id].name}」`);
    advanceLevel(this.state);
    this.board.buildLevel(this.state.level);
    this.startLevelIntro();
  }

  private summary(): RunSummary {
    const st = this.state.stats;
    return { level: this.state.level, totalDamage: st.totalDamage, launches: st.launches, bestVolley: st.bestVolley, hits: st.hits, crits: st.crits };
  }

  private gameOver(): void {
    this.phase = 'gameover';
    this.sfx.play('lose');
    this.aim.clear();
    this.time.delayedCall(800, () => this.overlay.showGameOver(this.summary(), () => this.restart()));
  }

  private victory(): void {
    this.phase = 'victory';
    this.sfx.play('win');
    this.effects.flash(255, 211, 107, 420);
    this.time.delayedCall(900, () => this.overlay.showVictory(this.summary(), () => this.restart()));
  }

  /* ------------------------------ 暂停 / 帮助 / 重开 ------------------------------ */

  canPause(): boolean {
    return PAUSABLE.includes(this.phase) && !this.overlay.isOpen && !this.paused;
  }

  pause(): void {
    if (!this.canPause()) return;
    this.paused = true;
    this.pointerAiming = false;
    this.sfx.play('pause');
    this.aim.clear();
    this.scene.pause();
    this.showPauseMenu();
  }

  private showPauseMenu(): void {
    this.overlay.showPause({
      onResume: () => this.resume(),
      onRestart: () => this.restart(),
      onHelp: () => this.overlay.showHelp(() => this.showPauseMenu()),
      muted: this.sfx.muted,
      onToggleSound: () => this.toggleSound(),
    });
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.overlay.hide();
    this.scene.resume();
    this.sfx.play('click');
    if (this.phase === 'ready') this.aim.draw(this.board.pegs);
  }

  togglePause(): void {
    if (this.paused) this.resume();
    else this.pause();
  }

  showHelp(): void {
    if (this.paused) {
      this.overlay.showHelp(() => this.showPauseMenu());
      return;
    }
    if (!this.canPause()) return;
    this.pause();
    this.overlay.showHelp(() => this.showPauseMenu());
  }

  /** 重开：新种子、跳过开始菜单，所有状态在 init/create 中重建。 */
  restart(): void {
    this.overlay.hide();
    this.sfx.play('click');
    const seed = Math.floor(this.rng() * 2 ** 31);
    if (this.paused) {
      this.paused = false;
      this.scene.resume();
    }
    this.scene.restart({ seed, skipStart: true } satisfies GameSceneData);
  }

  /* ------------------------------ 调试钩子 ------------------------------ */

  debugState(): DebugState {
    const s = this.state;
    const live = this.marbles.filter((m) => !m.removed);
    return {
      phase: this.phase,
      level: s.level,
      playerHp: s.playerHp,
      enemyHp: s.enemyHp,
      enemyMaxHp: s.enemyMaxHp,
      upgrades: { ...s.upgrades },
      volley: { ...s.volley, total: tallyTotal(s.volley) },
      marbles: live.length,
      marblePositions: live.map((m) => ({ x: Math.round(m.x * 10) / 10, y: Math.round(m.y * 10) / 10 })),
      maxMarblesThisVolley: this.maxMarblesThisVolley,
      stats: { ...s.stats },
      overlay: this.overlay.current,
      paused: this.paused,
      activePegs: this.board.activeCount(),
      totalPegs: this.board.pegs.length,
      muted: this.sfx.muted,
      seed: this.seed,
      layout: this.layout.portrait ? 'portrait' : 'landscape',
    };
  }

  debugGrant(id: UpgradeId): boolean {
    applyUpgrade(this.state, id);
    this.hud.setUpgrades(this.state.upgrades);
    this.hud.setPlayerHp(this.state.playerHp, this.state.maxHp, false);
    return true;
  }

  debugSetPlayerHp(n: number): boolean {
    this.state.playerHp = Phaser.Math.Clamp(Math.floor(n), 0, this.state.maxHp);
    this.hud.setPlayerHp(this.state.playerHp, this.state.maxHp, false);
    return true;
  }

  debugSetEnemyHp(n: number): boolean {
    this.state.enemyHp = Math.max(0, Math.floor(n));
    this.state.enemyMaxHp = Math.max(this.state.enemyMaxHp, this.state.enemyHp);
    this.hud.setEnemyHp(this.state.enemyHp, this.state.enemyMaxHp, false);
    return true;
  }

  debugJumpToLevel(level: number): boolean {
    if (this.phase !== 'ready') return false;
    if (level < 1 || level > RULES.levelCount) return false;
    this.state.level = level;
    const def = levelDef(level);
    this.state.enemyHp = def.hp;
    this.state.enemyMaxHp = def.hp;
    this.board.buildLevel(level);
    this.enemy?.destroy();
    this.enemy = new Enemy(this, this.layout.enemy.x, this.layout.enemy.y, def.enemyKey, this.layout.enemyScale);
    this.enemy.enter();
    this.hud.setLevel(def.level, RULES.levelCount, def.name);
    this.hud.setEnemyHp(def.hp, def.hp, false);
    this.hud.setIntent(def.atk, true);
    this.hud.setFlavor(def.flavor);
    this.board.resetForLaunch(this.rng);
    this.aim.draw(this.board.pegs);
    return true;
  }

  debugPickUpgrade(idOrIndex: UpgradeId | number): boolean {
    if (this.phase !== 'upgrading') return false;
    const cards = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-overlay="upgrade"] .card'));
    const btn = typeof idOrIndex === 'number' ? cards[idOrIndex] : cards.find((c) => c.dataset.id === idOrIndex);
    if (!btn) return false;
    btn.click();
    return true;
  }
}
