import { RULES } from './balance';
import { pickIndex, type Rng } from './rng';

/** 数据模型：升级 ID，六种固定升级。 */
export type UpgradeId = 'strengthen' | 'fire' | 'lightning' | 'split' | 'crit' | 'heal';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  /** 卡片标签：可叠加 / 被动 / 即时 */
  tag: 'Stackable' | 'Passive' | 'Instant';
  /** HUD 徽章用的单字 */
  short: string;
  desc: string;
  /** 卡片主题色（CSS） */
  color: string;
  /** Phaser 用的数值色 */
  tint: number;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  strengthen: {
    id: 'strengthen',
    name: 'Strengthen',
    tag: 'Stackable',
    short: 'S',
    desc: 'Each collision adds +1 base damage. Base damage is doubled by critical hits.',
    color: '#35f2ff',
    tint: 0x35f2ff,
  },
  fire: {
    id: 'fire',
    name: 'Fire',
    tag: 'Stackable',
    short: 'F',
    desc: 'Each collision adds 1 fire damage. Fire damage settles independently and is not affected by critical hits.',
    color: '#ff8a3d',
    tint: 0xff8a3d,
  },
  lightning: {
    id: 'lightning',
    name: 'Lightning',
    tag: 'Passive',
    short: 'L',
    desc: 'Each collision deals 1 lightning damage to the two nearest other pegs. Lightning does not chain.',
    color: '#c58bff',
    tint: 0xc58bff,
  },
  split: {
    id: 'split',
    name: 'Split',
    tag: 'Passive',
    short: 'Sp',
    desc: 'The first collision of each shot creates 2 extra marbles. New marbles do not split.',
    color: '#5dff9a',
    tint: 0x5dff9a,
  },
  crit: {
    id: 'crit',
    name: 'Critical',
    tag: 'Passive',
    short: 'C',
    desc: 'Each collision has a 20% chance to double its damage.',
    color: '#ffd36b',
    tint: 0xffd36b,
  },
  heal: {
    id: 'heal',
    name: 'Heal',
    tag: 'Instant',
    short: 'H',
    desc: 'Restore 2 health immediately, up to 5.',
    color: '#ff5fa2',
    tint: 0xff5fa2,
  },
};

/** 数据模型：玩家已获得的升级。强化/火焰计层数，其余三种被动为开关。 */
export interface Owned {
  strengthen: number;
  fire: number;
  lightning: boolean;
  split: boolean;
  crit: boolean;
}

export function emptyOwned(): Owned {
  return { strengthen: 0, fire: 0, lightning: false, split: false, crit: false };
}

/**
 * 核心函数：当前可抽取的升级池。
 * 约束：强化/火焰永远在池中；闪电/分裂/暴击拥有后移出；
 *       治疗在生命未满时进入池，生命已满时仅在其它选项不足 3 个时补位。
 */
export function availableUpgrades(owned: Owned, hp: number, maxHp: number = RULES.maxHp): UpgradeId[] {
  const pool: UpgradeId[] = ['strengthen', 'fire'];
  if (!owned.lightning) pool.push('lightning');
  if (!owned.split) pool.push('split');
  if (!owned.crit) pool.push('crit');
  if (hp < maxHp || pool.length < RULES.upgradeChoices) pool.push('heal');
  return pool;
}

/** 核心函数：抽取 N 个互不相同的升级。 */
export function rollUpgrades(
  owned: Owned,
  hp: number,
  rng: Rng,
  count: number = RULES.upgradeChoices,
  maxHp: number = RULES.maxHp,
): UpgradeId[] {
  const pool = availableUpgrades(owned, hp, maxHp);
  const out: UpgradeId[] = [];
  while (out.length < count && pool.length > 0) {
    const i = pickIndex(rng, pool.length);
    out.push(pool[i]);
    pool.splice(i, 1);
  }
  return out;
}

export function ownedCount(owned: Owned, id: UpgradeId): number {
  switch (id) {
    case 'strengthen':
      return owned.strengthen;
    case 'fire':
      return owned.fire;
    case 'lightning':
      return owned.lightning ? 1 : 0;
    case 'split':
      return owned.split ? 1 : 0;
    case 'crit':
      return owned.crit ? 1 : 0;
    case 'heal':
      return 0;
  }
}
