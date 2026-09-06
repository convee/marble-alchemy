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
  { level: 1, name: '酸液史莱姆', hp: 24, atk: 1, enemyKey: 'slime', flavor: '从废弃坩埚里爬出来的东西，会腐蚀一切。' },
  { level: 2, name: '废料哥布林', hp: 50, atk: 1, enemyKey: 'goblin', flavor: '偷走了工坊的贤者之石碎片，正在得意地嚼着。' },
  { level: 3, name: '符文石像鬼', hp: 95, atk: 1, enemyKey: 'gargoyle', flavor: '被错误的符文唤醒，坚硬且愤怒。' },
  { level: 4, name: '暗影术士', hp: 150, atk: 1, enemyKey: 'warlock', flavor: '前任工坊主。他的每次反击都带着诅咒。' },
  { level: 5, name: '炉心魔像', hp: 230, atk: 2, enemyKey: 'golem', flavor: '整座工坊的炉火凝成的巨兽。击败它，炼金大成。' },
];
