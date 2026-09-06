import { PHYSICS } from './balance';

/**
 * 核心函数：弹珠卡住看门狗（纯逻辑，便于单测）。
 * 约束：速度低于阈值持续 stuckMs 就推一下；推过 maxNudges 次或存活超时则强制回收，
 *       保证一轮一定能结束，不会因为弹珠停在钉子/墙角而永远不结算。
 */
export interface WatchdogState {
  lowSpeedMs: number;
  ageMs: number;
  nudges: number;
}

export type WatchdogAction = 'none' | 'nudge' | 'remove';

export function newWatchdog(): WatchdogState {
  return { lowSpeedMs: 0, ageMs: 0, nudges: 0 };
}

export function tickWatchdog(w: WatchdogState, speed: number, deltaMs: number): WatchdogAction {
  w.ageMs += deltaMs;
  if (w.ageMs > PHYSICS.marbleMaxAgeMs) return 'remove';
  if (speed < PHYSICS.stuckSpeed) {
    w.lowSpeedMs += deltaMs;
  } else {
    w.lowSpeedMs = 0;
  }
  if (w.lowSpeedMs >= PHYSICS.stuckMs) {
    w.lowSpeedMs = 0;
    w.nudges += 1;
    if (w.nudges > PHYSICS.maxNudges) return 'remove';
    return 'nudge';
  }
  return 'none';
}
