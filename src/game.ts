export type UpgradeId = 'power' | 'fire' | 'lightning' | 'split' | 'critical' | 'heal';
export type Phase = 'aiming' | 'flying' | 'settling' | 'upgrade' | 'won' | 'lost';
export interface Upgrade { id: UpgradeId; name: string; symbol: string; color: string; tag: string; description: string }
export const UPGRADES: Upgrade[] = [
  { id: 'power', name: '强化', symbol: '✦', color: '#bd9bff', tag: '基础增幅 · 可叠加', description: '每次碰撞的基础伤害 +1。每一次触碰，都更有力量。' },
  { id: 'fire', name: '火焰', symbol: '♨', color: '#ffad76', tag: '元素附魔 · 可叠加', description: '每次碰撞额外累计 1 点火焰伤害。重复获得可叠加。' },
  { id: 'lightning', name: '闪电', symbol: 'ϟ', color: '#f4d884', tag: '连锁反应 · 唯一', description: '碰撞时连接最近的另外两颗钉子，各造成 1 点伤害。连锁不再触发连锁。' },
  { id: 'split', name: '分裂', symbol: '⑂', color: '#8df0cd', tag: '弹珠变异 · 唯一', description: '每次发射的首次碰撞额外生成 2 颗弹珠。新弹珠不会继续分裂。' },
  { id: 'critical', name: '暴击', symbol: '◇', color: '#ff93bb', tag: '幸运催化 · 唯一', description: '每次碰撞有 20% 概率使本次直接伤害翻倍，包含火焰，不含闪电连锁。' },
  { id: 'heal', name: '治疗', symbol: '♡', color: '#8fcdf6', tag: '即时恢复 · 可重复', description: '立即恢复 2 点生命，最多恢复至 5 点。让下一次实验更从容。' },
];
export const LEVELS = [
  { name: '游离幽灵', title: 'THE WANDERING WISP', hp: 12, attack: 1, color: '#b8a0ff', description: '一团从试剂瓶中溜出的不安灵火。' },
  { name: '铜锈守卫', title: 'THE COPPER GUARDIAN', hp: 26, attack: 1, color: '#ffb77d', description: '旧工坊的守卫，被铜锈与魔力唤醒。' },
  { name: '棱镜幻影', title: 'THE PRISM SPECTER', hp: 46, attack: 1, color: '#8ee4df', description: '在折射的微光里，藏着危险的幻影。' },
  { name: '星尘吞噬者', title: 'THE STARDUST DEVOURER', hp: 72, attack: 1, color: '#f797c4', description: '以失败实验的星尘为食，日渐强大。' },
  { name: '虚空贤者', title: 'THE VOID ALCHEMIST', hp: 104, attack: 2, color: '#f2d08b', description: '最后一道试炼。炼成属于你的贤者之石。' },
];
export interface Build { power: number; fire: number; lightning: boolean; split: boolean; critical: boolean }
export interface HitResult { direct: number; chain: number; total: number; critical: boolean }
export function collisionDamage(build: Build, otherPegs: number, random = Math.random): HitResult {
  const critical = build.critical && random() < 0.2;
  const direct = (1 + build.power + build.fire) * (critical ? 2 : 1);
  const chain = build.lightning ? Math.min(2, Math.max(0, otherPegs)) : 0;
  return { direct, chain, total: direct + chain, critical };
}
export class Run {
  phase: Phase = 'aiming';
  level = 0;
  hp = 5;
  enemyHp = LEVELS[0].hp;
  damage = 0;
  hits = 0;
  shots = 0;
  totalDamage = 0;
  totalHits = 0;
  splitUsed = false;
  build: Build = { power: 0, fire: 0, lightning: false, split: false, critical: false };
  offers: UpgradeId[] = [];
  history: UpgradeId[] = [];
  constructor(public random: () => number = Math.random) {}
  launch() {
    if (this.phase !== 'aiming') return false;
    this.phase = 'flying'; this.damage = 0; this.hits = 0; this.splitUsed = false; this.shots++;
    return true;
  }
  hit(otherPegs: number): (HitResult & { split: boolean }) | undefined {
    if (this.phase !== 'flying') return;
    const result = collisionDamage(this.build, otherPegs, this.random);
    this.damage += result.total; this.hits++; this.totalHits++;
    const split = this.build.split && !this.splitUsed;
    if (split) this.splitUsed = true;
    return { ...result, split };
  }
  beginSettlement() {
    if (this.phase !== 'flying') return false;
    this.phase = 'settling'; return true;
  }
  settle() {
    if (this.phase !== 'settling') return false;
    this.enemyHp = Math.max(0, this.enemyHp - this.damage);
    this.totalDamage += this.damage;
    if (this.enemyHp === 0) {
      this.phase = 'upgrade'; this.offers = this.rollOffers();
    } else {
      this.hp = Math.max(0, this.hp - LEVELS[this.level].attack);
      this.phase = this.hp ? 'aiming' : 'lost';
    }
    return true;
  }
  rollOffers(): UpgradeId[] {
    const pool = UPGRADES.filter(u => !(['lightning', 'split', 'critical'] as string[]).includes(u.id) || !this.build[u.id as 'lightning' | 'split' | 'critical']).map(u => u.id);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 3);
  }
  choose(id: UpgradeId) {
    if (this.phase !== 'upgrade' || !this.offers.includes(id)) return false;
    if (id === 'heal') this.hp = Math.min(5, this.hp + 2);
    else if (id === 'power' || id === 'fire') this.build[id]++;
    else this.build[id] = true;
    this.history.push(id); this.offers = [];
    if (this.level === LEVELS.length - 1) { this.phase = 'won'; return true; }
    this.level++; this.enemyHp = LEVELS[this.level].hp; this.damage = 0; this.hits = 0; this.phase = 'aiming';
    return true;
  }
}
