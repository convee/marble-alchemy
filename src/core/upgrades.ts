import { RULES } from './balance';
import { pickIndex, type Rng } from './rng';

/** 数据模型：升级 ID，六种固定升级。 */
export type UpgradeId = 'strengthen' | 'fire' | 'lightning' | 'split' | 'crit' | 'heal';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  /** 卡片标签：可叠加 / 被动 / 即时 */
  tag: '可叠加' | '被动' | '即时';
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
    name: '强化',
    tag: '可叠加',
    short: '强',
    desc: '每次碰撞的基础伤害 +1。基础伤害会被暴击翻倍。',
    color: '#35f2ff',
    tint: 0x35f2ff,
  },
  fire: {
    id: 'fire',
    name: '火焰',
    tag: '可叠加',
    short: '火',
    desc: '每次碰撞额外累计 1 点火焰伤害。火焰伤害独立结算，不受暴击影响。',
    color: '#ff8a3d',
    tint: 0xff8a3d,
  },
  lightning: {
    id: 'lightning',
    name: '闪电',
    tag: '被动',
    short: '雷',
    desc: '每次碰撞向最近的另外两个钉子各放出 1 点闪电伤害。连锁不会再触发连锁。',
    color: '#c58bff',
    tint: 0xc58bff,
  },
  split: {
    id: 'split',
    name: '分裂',
    tag: '被动',
    short: '裂',
    desc: '每次发射的首次碰撞额外分出 2 颗弹珠。分出的弹珠不会再分裂。',
    color: '#5dff9a',
    tint: 0x5dff9a,
  },
  crit: {
    id: 'crit',
    name: '暴击',
    tag: '被动',
    short: '暴',
    desc: '每次碰撞有 20% 概率让本次碰撞伤害翻倍。',
    color: '#ffd36b',
    tint: 0xffd36b,
  },
  heal: {
    id: 'heal',
    name: '治疗',
    tag: '即时',
    short: '愈',
    desc: '立即恢复 2 点生命，最多恢复到 5 点。',
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
