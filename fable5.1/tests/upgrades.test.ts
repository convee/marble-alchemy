import { describe, expect, it } from 'vitest';
import { availableUpgrades, emptyOwned, rollUpgrades, type UpgradeId } from '../src/core/upgrades';
import { mulberry32 } from '../src/core/rng';

describe('升级池规则', () => {
  it('初始池包含全部六种', () => {
    const pool = availableUpgrades(emptyOwned(), 3);
    expect(new Set(pool)).toEqual(new Set<UpgradeId>(['strengthen', 'fire', 'lightning', 'split', 'crit', 'heal']));
  });

  it('生命已满且其它选项够 3 个时不出治疗', () => {
    const pool = availableUpgrades(emptyOwned(), 5);
    expect(pool).not.toContain('heal');
    expect(pool.length).toBeGreaterThanOrEqual(3);
  });

  it('闪电/分裂/暴击获得后不再出现，强化/火焰始终可重复', () => {
    const owned = { strengthen: 3, fire: 2, lightning: true, split: true, crit: true };
    const pool = availableUpgrades(owned, 2);
    expect(pool).toEqual(['strengthen', 'fire', 'heal']);
  });

  it('全被动已拥有且生命满时，用治疗补足 3 个选项', () => {
    const owned = { strengthen: 0, fire: 0, lightning: true, split: true, crit: true };
    const pool = availableUpgrades(owned, 5);
    expect(pool.sort()).toEqual(['fire', 'heal', 'strengthen']);
  });

  it('每次抽 3 个互不相同', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 200; i++) {
      const picks = rollUpgrades(emptyOwned(), 4, rng);
      expect(picks).toHaveLength(3);
      expect(new Set(picks).size).toBe(3);
    }
  });
});
