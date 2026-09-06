import type Phaser from 'phaser';

import type { UpgradeId } from '../core/upgrades';
import type { GameScene } from '../scenes/GameScene';

/**
 * 文件模块：window.__marble 调试/自动化钩子，供 Playwright 端到端测试驱动游戏（发射、授予升级、改血量、跳关）。
 * 约束：只读写 GameScene 暴露的方法，不绕过状态机；对玩家无害（不改变正常玩法）。
 */
export interface DebugState {
  phase: string;
  level: number;
  playerHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  upgrades: { strengthen: number; fire: number; lightning: boolean; split: boolean; crit: boolean };
  volley: { hit: number; fire: number; lightning: number; hits: number; crits: number; total: number };
  marbles: number;
  marblePositions: Array<{ x: number; y: number }>;
  maxMarblesThisVolley: number;
  stats: { totalDamage: number; launches: number; hits: number; crits: number; bestVolley: number; damageTaken: number };
  overlay: string | null;
  paused: boolean;
  activePegs: number;
  totalPegs: number;
  muted: boolean;
  seed: number;
  layout: 'portrait' | 'landscape';
}

export interface DebugApi {
  version: string;
  getState(): DebugState | null;
  startGame(): boolean;
  fire(angleDeg: number): boolean;
  grant(id: UpgradeId): boolean;
  setPlayerHp(n: number): boolean;
  setEnemyHp(n: number): boolean;
  jumpToLevel(level: number): boolean;
  pickUpgrade(idOrIndex: UpgradeId | number): boolean;
  pause(): boolean;
  resume(): boolean;
  restart(): boolean;
  setMuted(m: boolean): boolean;
  /** 只画瞄准线不发射（录屏用） */
  aim(angleDeg: number): boolean;
  /** 停掉 requestAnimationFrame 主循环，之后用 stepFrames / simulate 手动推进（录屏与快速自动对局用） */
  stopLoop(): boolean;
  startLoop(): boolean;
  /** 手动推进 n 帧（含渲染），返回合成时钟（ms） */
  stepFrames(n: number, dtMs?: number): number;
  /** 只推进逻辑与物理不渲染，速度快得多；返回合成时钟（ms） */
  simulate(steps: number, dtMs?: number): number;
  /** 诊断：场景/补间/计时器内部状态 */
  dump(): unknown;
}

declare global {
  interface Window {
    __marble?: DebugApi;
  }
}

let current: GameScene | null = null;

export function registerScene(scene: GameScene): void {
  current = scene;
}

export function installDebugHooks(game: Phaser.Game): void {
  const withScene = (fn: (s: GameScene) => boolean): boolean => {
    if (!current || !current.sys || !current.sys.isActive()) return false;
    return fn(current);
  };
  let clock = 0;
  let loopStopped = false;
  let stepDt = 1000 / 60;
  const ensureClock = () => {
    if (clock === 0) clock = performance.now();
  };
  /**
   * Phaser 3.60+ 的 TweenManager 用 Date.now() 自己算 delta（含 lag 追赶），不吃场景 update 传入的 delta。
   * 手动步进时把它换成合成步长，否则补间要么按墙钟乱跑（录屏里动画快 3 倍），要么在快进时完全冻住（结算飞球永不到达）。
   */
  const patchTweenClock = () => {
    const s = current;
    if (!s) return;
    const tm = s.tweens as unknown as { getDelta: () => number; __marblePatched?: boolean };
    if (!tm.__marblePatched) {
      tm.getDelta = () => stepDt;
      tm.__marblePatched = true;
    }
  };
  const api: DebugApi = {
    version: '1.0.0',
    getState: () => (current ? current.debugState() : null),
    startGame: () => withScene((s) => s.startFromOverlay()),
    fire: (deg) =>
      withScene((s) => {
        s.aim.setAngleDeg(deg);
        return s.launch();
      }),
    grant: (id) => withScene((s) => s.debugGrant(id)),
    setPlayerHp: (n) => withScene((s) => s.debugSetPlayerHp(n)),
    setEnemyHp: (n) => withScene((s) => s.debugSetEnemyHp(n)),
    jumpToLevel: (level) => withScene((s) => s.debugJumpToLevel(level)),
    pickUpgrade: (idOrIndex) => withScene((s) => s.debugPickUpgrade(idOrIndex)),
    pause: () =>
      withScene((s) => {
        s.pause();
        return s.paused;
      }),
    resume: () =>
      withScene((s) => {
        s.resume();
        return !s.paused;
      }),
    restart: () =>
      withScene((s) => {
        s.restart();
        return true;
      }),
    setMuted: (m) =>
      withScene((s) => {
        s.setMuted(m);
        return s.sfx.muted === m;
      }),
    aim: (deg) =>
      withScene((s) => {
        if (s.phase !== 'ready') return false;
        s.aim.setAngleDeg(deg);
        s.aim.draw(s.board.pegs);
        return true;
      }),
    stopLoop: () => {
      if (!loopStopped) {
        game.loop.stop();
        loopStopped = true;
        ensureClock();
      }
      return true;
    },
    startLoop: () => {
      if (loopStopped) {
        loopStopped = false;
        game.loop.start(game.step.bind(game));
      }
      return true;
    },
    stepFrames: (n, dtMs = 1000 / 60) => {
      ensureClock();
      stepDt = dtMs;
      patchTweenClock();
      for (let i = 0; i < n; i++) {
        clock += dtMs;
        game.step(clock, dtMs);
      }
      return clock;
    },
    simulate: (steps, dtMs = 1000 / 60) => {
      ensureClock();
      stepDt = dtMs;
      patchTweenClock();
      for (let i = 0; i < steps; i++) {
        clock += dtMs;
        game.scene.update(clock, dtMs);
      }
      return clock;
    },
    dump: () => {
      const s = current;
      if (!s) return null;
      const tweens = s.tweens.getTweens().map((t) => ({
        state: t.state,
        progress: Math.round(t.progress * 100) / 100,
        paused: t.paused,
        hasStarted: t.hasStarted,
        startDelay: t.startDelay,
        targets: t.targets.map((o) => (o as { type?: string; texture?: { key?: string } }).type ?? typeof o),
        textureKeys: t.targets.map((o) => (o as { texture?: { key?: string } }).texture?.key ?? ''),
      }));
      const clockEvents = (s.time as unknown as { _active: unknown[]; _pendingInsertion: unknown[] });
      return {
        phase: s.phase,
        paused: s.paused,
        sceneStatus: s.sys.settings.status,
        sceneActive: s.sys.isActive(),
        scenePaused: s.sys.isPaused(),
        loopRunning: game.loop.running,
        tweenCount: tweens.length,
        tweens,
        timers: clockEvents._active.length,
        pendingTimers: clockEvents._pendingInsertion.length,
        matterEnabled: s.matter.world.enabled,
        clock,
      };
    },
  };
  window.__marble = api;
}
