import { describe, expect, it } from 'vitest';
import {
  advanceLevel,
  applyUpgrade,
  beginVolley,
  enemyCounterattack,
  newRun,
  recordHit,
  rollHit,
  settleVolley,
  tallyTotal,
} from '../src/core/runState';
import { LEVELS, RULES } from '../src/core/balance';
import { mulberry32 } from '../src/core/rng';

describe('伤害计算', () => {
  it('无升级时每次碰撞 1 点，不暴击、无火焰、无闪电', () => {
    const s = newRun();
    const r = rollHit(s, () => 0, 10);
    expect(r).toEqual({ base: 1, crit: false, hitDamage: 1, fireDamage: 0, lightningTargets: 0 });
  });

  it('强化叠两层后基础伤害为 3，暴击翻倍基础伤害而不翻倍火焰', () => {
    const s = newRun();
    applyUpgrade(s, 'strengthen');
    applyUpgrade(s, 'strengthen');
    applyUpgrade(s, 'fire');
    applyUpgrade(s, 'crit');
    const r = rollHit(s, () => 0.05, 10);
    expect(r.base).toBe(3);
    expect(r.crit).toBe(true);
    expect(r.hitDamage).toBe(6);
    expect(r.fireDamage).toBe(1);
  });

  it('暴击概率约 20%', () => {
    const s = newRun();
    applyUpgrade(s, 'crit');
    const rng = mulberry32(42);
    let crits = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) if (rollHit(s, rng, 5).crit) crits++;
    expect(crits / n).toBeGreaterThan(0.18);
    expect(crits / n).toBeLessThan(0.22);
  });

  it('闪电目标数受可用钉子数限制', () => {
    const s = newRun();
    applyUpgrade(s, 'lightning');
    expect(rollHit(s, () => 0.9, 10).lightningTargets).toBe(2);
    expect(rollHit(s, () => 0.9, 1).lightningTargets).toBe(1);
    expect(rollHit(s, () => 0.9, 0).lightningTargets).toBe(0);
  });

  it('本轮累计后一次性结算，结算后累计清零（不会重复结算）', () => {
    const s = newRun();
    applyUpgrade(s, 'fire');
    applyUpgrade(s, 'lightning');
    beginVolley(s);
    for (let i = 0; i < 5; i++) recordHit(s, rollHit(s, () => 0.9, 10), 2);
    expect(tallyTotal(s.volley)).toBe(5 + 5 + 10);
    const before = s.enemyHp;
    const res = settleVolley(s);
    expect(res.damage).toBe(20);
    expect(s.enemyHp).toBe(before - 20);
    expect(tallyTotal(s.volley)).toBe(0);
    const again = settleVolley(s);
    expect(again.damage).toBe(0);
    expect(s.enemyHp).toBe(before - 20);
  });
});

describe('回合与关卡流程', () => {
  it('敌人反击按关卡攻击力扣血，扣到 0 判负', () => {
    const s = newRun();
    s.level = 4;
    s.playerHp = 3;
    const a = enemyCounterattack(s);
    expect(a.damage).toBe(LEVELS[3].atk);
    expect(s.playerHp).toBe(3 - LEVELS[3].atk);
    s.playerHp = 1;
    expect(enemyCounterattack(s).playerDead).toBe(true);
    expect(s.playerHp).toBe(0);
  });

  it('治疗恢复 2 点且不超过上限', () => {
    const s = newRun();
    s.playerHp = 2;
    applyUpgrade(s, 'heal');
    expect(s.playerHp).toBe(4);
    applyUpgrade(s, 'heal');
    expect(s.playerHp).toBe(RULES.maxHp);
  });

  it('五关递进，最后一关后返回 false 进入胜利', () => {
    const s = newRun();
    for (let i = 1; i < RULES.levelCount; i++) {
      expect(advanceLevel(s)).toBe(true);
      expect(s.level).toBe(i + 1);
      expect(s.enemyHp).toBe(LEVELS[i].hp);
    }
    expect(advanceLevel(s)).toBe(false);
    expect(s.level).toBe(RULES.levelCount);
  });

  it('关卡数值单调递增', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].hp).toBeGreaterThan(LEVELS[i - 1].hp);
      expect(LEVELS[i].atk).toBeGreaterThanOrEqual(LEVELS[i - 1].atk);
    }
  });
});
