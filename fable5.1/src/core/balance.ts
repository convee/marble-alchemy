/**
 * 配置项：数值平衡与物理常量。所有关卡/升级/弹盘的调参都在这一个文件。
 * 约束：BOARD 尺寸在横竖屏两种布局下保持一致，保证物理手感相同。
 */
export const BOARD = {
  width: 540,
  height: 660,
  /** 发射口（弹盘局部坐标 y） */
  launcherY: 46,
  pegRadius: 8,
  marbleRadius: 11,
  wallThickness: 24,
  /** 弹珠掉出弹盘底部多远算落底 */
  fallMargin: 40,
} as const;

export const PHYSICS = {
  /** 发射初速（px / 物理步，60Hz） */
  launchSpeed: 13,
  restitution: 0.55,
  gravityY: 1.4,
  /** 允许的瞄准角（以 +x 为 0 度、向下为正，单位度） */
  minAimDeg: 12,
  maxAimDeg: 168,
  /** 卡住判定：速度低于此值持续 stuckMs 就推一下 */
  stuckSpeed: 0.25,
  stuckMs: 1200,
  maxNudges: 3,
  /** 每次撞钉后给弹珠的水平随机扰动（px/步），打破完全垂直的往返弹跳 */
  hitJitter: 0.9,
  /** 单颗弹珠最长存活；整轮最长时长（兜底强制结算） */
  marbleMaxAgeMs: 30_000,
  volleyMaxMs: 45_000,
} as const;

export const RULES = {
  maxHp: 5,
  levelCount: 5,
  upgradeChoices: 3,
  critChance: 0.2,
  critMultiplier: 2,
  healAmount: 2,
  lightningTargets: 2,
  splitCount: 2,
  /** 每次发射随机点亮的回充石数量 */
  refreshPegs: 2,
} as const;

export interface LevelDef {
  level: number;
  name: string;
  hp: number;
  atk: number;
  enemyKey: 'slime' | 'goblin' | 'gargoyle' | 'warlock' | 'golem';
  flavor: string;
}

export const LEVELS: LevelDef[] = [
  { level: 1, name: 'Acid Slime', hp: 24, atk: 1, enemyKey: 'slime', flavor: 'A thing that crawled from an abandoned crucible and corrodes everything.' },
  { level: 2, name: 'Scrap Goblin', hp: 50, atk: 1, enemyKey: 'goblin', flavor: 'It stole a philosopher’s stone shard and is chewing it proudly.' },
  { level: 3, name: 'Rune Gargoyle', hp: 95, atk: 1, enemyKey: 'gargoyle', flavor: 'Awakened by a flawed rune, hard and furious.' },
  { level: 4, name: 'Shadow Warlock', hp: 150, atk: 1, enemyKey: 'warlock', flavor: 'The former workshop master. Every counterattack carries a curse.' },
  { level: 5, name: 'Core Golem', hp: 230, atk: 2, enemyKey: 'golem', flavor: 'A beast forged from the workshop’s fire. Defeat it and complete the alchemy.' },
];
