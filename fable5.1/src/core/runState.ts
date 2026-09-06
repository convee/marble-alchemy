import { LEVELS, RULES, type LevelDef } from './balance';
import { emptyOwned, type Owned, type UpgradeId } from './upgrades';
import type { Rng } from './rng';

/**
 * 数据模型：一局游戏的全部可结算状态（不含任何 Phaser 对象），便于单测与重开时整体丢弃。
 * 约束：伤害只在 settleVolley 时一次性作用到敌人；碰撞阶段只累计到 VolleyTally。
 */
export interface VolleyTally {
  /** 直接碰撞伤害（含强化与暴击） */
  hit: number;
  /** 火焰累计 */
  fire: number;
  /** 闪电连锁 */
  lightning: number;
  /** 碰撞次数 / 暴击次数（用于反馈与统计） */
  hits: number;
  crits: number;
}

export interface RunStats {
  totalDamage: number;
  launches: number;
  hits: number;
  crits: number;
  bestVolley: number;
  damageTaken: number;
}

export interface RunState {
  level: number;
  playerHp: number;
  maxHp: number;
  upgrades: Owned;
  enemyHp: number;
  enemyMaxHp: number;
  volley: VolleyTally;
  stats: RunStats;
}

export function emptyTally(): VolleyTally {
  return { hit: 0, fire: 0, lightning: 0, hits: 0, crits: 0 };
}

export function tallyTotal(t: VolleyTally): number {
  return t.hit + t.fire + t.lightning;
}

export function levelDef(level: number): LevelDef {
  const def = LEVELS[level - 1];
  if (!def) throw new Error(`no level ${level}`);
  return def;
}

export function newRun(): RunState {
  const def = levelDef(1);
  return {
    level: 1,
    playerHp: RULES.maxHp,
    maxHp: RULES.maxHp,
    upgrades: emptyOwned(),
    enemyHp: def.hp,
    enemyMaxHp: def.hp,
    volley: emptyTally(),
    stats: { totalDamage: 0, launches: 0, hits: 0, crits: 0, bestVolley: 0, damageTaken: 0 },
  };
}

export interface HitResult {
  base: number;
  crit: boolean;
  hitDamage: number;
  fireDamage: number;
  /** 本次碰撞应触发的闪电目标数（0 到 2，受可用钉子数限制） */
  lightningTargets: number;
}

/**
 * 核心函数：结算一次「弹珠撞钉子」。
 * 约束：基础伤害 = 1 + 强化层数，暴击只翻倍基础伤害；火焰每层 +1 独立累计；
 *       闪电对最近两个钉子各 1 点，闪电命中的钉子不再触发任何效果。
 */
export function rollHit(state: RunState, rng: Rng, otherPegsAvailable: number): HitResult {
  const u = state.upgrades;
  const base = 1 + u.strengthen;
  const crit = u.crit && rng() < RULES.critChance;
  const hitDamage = crit ? base * RULES.critMultiplier : base;
  const fireDamage = u.fire;
  const lightningTargets = u.lightning ? Math.max(0, Math.min(RULES.lightningTargets, otherPegsAvailable)) : 0;
  return { base, crit, hitDamage, fireDamage, lightningTargets };
}

/** 把一次碰撞结果累计进本轮（闪电按实际命中目标数计入）。 */
export function recordHit(state: RunState, r: HitResult, lightningHits: number): void {
  const v = state.volley;
  v.hit += r.hitDamage;
  v.fire += r.fireDamage;
  v.lightning += lightningHits;
  v.hits += 1;
  if (r.crit) v.crits += 1;
}

export function beginVolley(state: RunState): void {
  state.volley = emptyTally();
  state.stats.launches += 1;
}

/**
 * 核心函数：本轮结算，把累计伤害一次性作用于敌人并清空累计。
 * 约束：调用方必须保证每轮只调用一次（GameScene 用 phase 守卫）。
 */
export function settleVolley(state: RunState): { damage: number; enemyHp: number; enemyDead: boolean } {
  const damage = tallyTotal(state.volley);
  state.enemyHp = Math.max(0, state.enemyHp - damage);
  state.stats.totalDamage += damage;
  state.stats.hits += state.volley.hits;
  state.stats.crits += state.volley.crits;
  state.stats.bestVolley = Math.max(state.stats.bestVolley, damage);
  state.volley = emptyTally();
  return { damage, enemyHp: state.enemyHp, enemyDead: state.enemyHp <= 0 };
}

export function enemyCounterattack(state: RunState): { damage: number; playerHp: number; playerDead: boolean } {
  const damage = levelDef(state.level).atk;
  state.playerHp = Math.max(0, state.playerHp - damage);
  state.stats.damageTaken += damage;
  return { damage, playerHp: state.playerHp, playerDead: state.playerHp <= 0 };
}

export function applyUpgrade(state: RunState, id: UpgradeId): void {
  const u = state.upgrades;
  switch (id) {
    case 'strengthen':
      u.strengthen += 1;
      break;
    case 'fire':
      u.fire += 1;
      break;
    case 'lightning':
      u.lightning = true;
      break;
    case 'split':
      u.split = true;
      break;
    case 'crit':
      u.crit = true;
      break;
    case 'heal':
      state.playerHp = Math.min(state.maxHp, state.playerHp + RULES.healAmount);
      break;
  }
}

export function isFinalLevel(state: RunState): boolean {
  return state.level >= RULES.levelCount;
}

/** 进入下一关；已是最后一关时返回 false（应进入胜利流程）。 */
export function advanceLevel(state: RunState): boolean {
  if (isFinalLevel(state)) return false;
  state.level += 1;
  const def = levelDef(state.level);
  state.enemyHp = def.hp;
  state.enemyMaxHp = def.hp;
  state.volley = emptyTally();
  return true;
}
