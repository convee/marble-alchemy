import { describe, expect, it } from 'vitest';
import { newWatchdog, tickWatchdog } from '../src/core/watchdog';
import { PHYSICS } from '../src/core/balance';

describe('弹珠卡住看门狗', () => {
  it('正常运动不触发', () => {
    const w = newWatchdog();
    for (let i = 0; i < 100; i++) expect(tickWatchdog(w, 5, 16.7)).toBe('none');
  });

  it('低速持续超过阈值就推一下，推满次数后回收', () => {
    const w = newWatchdog();
    const actions: string[] = [];
    let t = 0;
    while (t < PHYSICS.stuckMs * (PHYSICS.maxNudges + 2) && !actions.includes('remove')) {
      const a = tickWatchdog(w, 0, 100);
      if (a !== 'none') actions.push(a);
      t += 100;
    }
    expect(actions.filter((a) => a === 'nudge')).toHaveLength(PHYSICS.maxNudges);
    expect(actions[actions.length - 1]).toBe('remove');
  });

  it('中途恢复速度会重置低速计时', () => {
    const w = newWatchdog();
    tickWatchdog(w, 0, PHYSICS.stuckMs - 100);
    expect(tickWatchdog(w, 3, 16)).toBe('none');
    expect(w.lowSpeedMs).toBe(0);
  });

  it('存活超时强制回收', () => {
    const w = newWatchdog();
    expect(tickWatchdog(w, 5, PHYSICS.marbleMaxAgeMs + 1)).toBe('remove');
  });
});
