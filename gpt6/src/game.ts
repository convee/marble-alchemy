export type UpgradeId = 'power' | 'fire' | 'lightning' | 'split' | 'critical' | 'heal';
export type Phase = 'aiming' | 'flying' | 'settling' | 'upgrade' | 'won' | 'lost';
export type AiEffect = 'double_first_hit' | 'heal_after_settlement' | 'glass_cannon';
export type AiChallengeSource = 'model' | 'fallback';
export interface AiChallenge {
  id: string;
  title: string;
  prophecy: string;
  effect: AiEffect;
  source?: AiChallengeSource;
  generatedBy?: string;
  generatedAt?: string;
  debrief?: string;
}
export interface Upgrade {
  id: UpgradeId;
  name: string;
  symbol: string;
  color: string;
  tag: string;
  description: string;
}
export const UPGRADES: Upgrade[] = [
  {
    id: 'power',
    name: 'Strengthen',
    symbol: '✦',
    color: '#bd9bff',
    tag: 'Base boost · Stackable',
    description: 'Each collision adds +1 base damage. Every touch hits harder.',
  },
  {
    id: 'fire',
    name: 'Fire',
    symbol: '♨',
    color: '#ffad76',
    tag: 'Elemental enchantment · Stackable',
    description: 'Each collision adds 1 fire damage. Duplicate picks stack.',
  },
  {
    id: 'lightning',
    name: 'Lightning',
    symbol: 'ϟ',
    color: '#f4d884',
    tag: 'Chain reaction · Unique',
    description: 'Each collision arcs 1 damage to the two nearest other pegs. Arcs do not chain.',
  },
  {
    id: 'split',
    name: 'Split',
    symbol: '⑂',
    color: '#8df0cd',
    tag: 'Marble mutation · Unique',
    description: 'The first collision of each shot creates 2 extra marbles. New marbles do not split.',
  },
  {
    id: 'critical',
    name: 'Critical',
    symbol: '◇',
    color: '#ff93bb',
    tag: 'Lucky catalyst · Unique',
    description: 'Each collision has a 20% chance to double direct damage, including fire but not lightning.',
  },
  {
    id: 'heal',
    name: 'Heal',
    symbol: '♡',
    color: '#8fcdf6',
    tag: 'Instant recovery · Repeatable',
    description: 'Restore 2 health immediately, up to 5. Give the next experiment room to breathe.',
  },
];
export const LEVELS = [
  {
    name: 'Wandering Wisp',
    title: 'THE WANDERING WISP',
    hp: 12,
    attack: 1,
    color: '#b8a0ff',
    description: 'A restless flame that slipped from a reagent vial.',
  },
  {
    name: 'Copper Guardian',
    title: 'THE COPPER GUARDIAN',
    hp: 26,
    attack: 1,
    color: '#ffb77d',
    description: 'An old workshop guardian, awakened by rust and magic.',
  },
  {
    name: 'Prism Specter',
    title: 'THE PRISM SPECTER',
    hp: 46,
    attack: 1,
    color: '#8ee4df',
    description: 'A dangerous specter hiding in refracted light.',
  },
  {
    name: 'Stardust Devourer',
    title: 'THE STARDUST DEVOURER',
    hp: 72,
    attack: 1,
    color: '#f797c4',
    description: 'It feeds on failed experiments and grows stronger.',
  },
  {
    name: 'Void Alchemist',
    title: 'THE VOID ALCHEMIST',
    hp: 104,
    attack: 2,
    color: '#f2d08b',
    description: 'The final trial. Forge your own philosopher\'s stone.',
  },
];
export interface Build {
  power: number;
  fire: number;
  lightning: boolean;
  split: boolean;
  critical: boolean;
}
export interface HitResult {
  direct: number;
  chain: number;
  total: number;
  critical: boolean;
  aiTrigger?: AiEffect;
}
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
  lastAiTrigger?: AiEffect;
  constructor(
    public random: () => number = Math.random,
    public challenge?: AiChallenge,
  ) {
    if (challenge?.effect === 'glass_cannon') this.hp = 2;
  }
  launch() {
    if (this.phase !== 'aiming') return false;
    this.phase = 'flying';
    this.damage = 0;
    this.hits = 0;
    this.splitUsed = false;
    this.lastAiTrigger = undefined;
    this.shots++;
    return true;
  }
  hit(otherPegs: number): (HitResult & { split: boolean }) | undefined {
    if (this.phase !== 'flying') return;
    const base = collisionDamage(this.build, otherPegs, this.random);
    const firstHitBoost = this.challenge?.effect === 'double_first_hit' && this.hits === 0;
    const result = firstHitBoost
      ? { ...base, direct: base.direct * 2, total: base.total + base.direct }
      : base;
    if (firstHitBoost) this.lastAiTrigger = 'double_first_hit';
    this.damage += result.total;
    this.hits++;
    this.totalHits++;
    const split = this.build.split && !this.splitUsed;
    if (split) this.splitUsed = true;
    return { ...result, split, aiTrigger: firstHitBoost ? 'double_first_hit' : undefined };
  }
  beginSettlement() {
    if (this.phase !== 'flying') return false;
    this.phase = 'settling';
    return true;
  }
  settle() {
    if (this.phase !== 'settling') return false;
    this.enemyHp = Math.max(0, this.enemyHp - this.damage);
    this.totalDamage += this.damage;
    if (this.enemyHp === 0) {
      if (this.challenge?.effect === 'heal_after_settlement') {
        this.hp = Math.min(5, this.hp + 1);
        this.lastAiTrigger = 'heal_after_settlement';
      }
      this.phase = 'upgrade';
      this.offers = this.rollOffers();
    } else {
      this.hp = Math.max(0, this.hp - LEVELS[this.level].attack);
      this.phase = this.hp ? 'aiming' : 'lost';
    }
    return true;
  }
  rollOffers(): UpgradeId[] {
    const pool = UPGRADES.filter(
      (u) =>
        !(['lightning', 'split', 'critical'] as string[]).includes(u.id) ||
        !this.build[u.id as 'lightning' | 'split' | 'critical'],
    ).map((u) => u.id);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 3);
  }
  choose(id: UpgradeId) {
    if (this.phase !== 'upgrade' || !this.offers.includes(id)) return false;
    if (id === 'heal') this.hp = Math.min(5, this.hp + 2);
    else if (id === 'power' || id === 'fire') this.build[id]++;
    else this.build[id] = true;
    this.history.push(id);
    this.offers = [];
    if (this.level === LEVELS.length - 1) {
      this.phase = 'won';
      return true;
    }
    this.level++;
    this.enemyHp = LEVELS[this.level].hp;
    this.damage = 0;
    this.hits = 0;
    this.phase = 'aiming';
    return true;
  }
}
