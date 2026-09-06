import { BOARD } from './balance';

/**
 * 数据模型：屏幕布局。横屏 1280x720（弹盘在左、敌人在右），竖屏 720x1280（敌人在上、弹盘在中、状态在下）。
 * 约束：弹盘尺寸两种布局一致（BOARD），只挪位置，不缩放物理。
 */
export interface Pt {
  x: number;
  y: number;
}

export interface ScreenLayout {
  width: number;
  height: number;
  portrait: boolean;
  /** 弹盘左上角 */
  board: Pt;
  enemy: Pt;
  enemyScale: number;
  levelLabel: Pt;
  enemyName: Pt;
  enemyHpBar: Pt & { w: number };
  intent: Pt;
  /** 本轮蓄能 */
  charge: Pt;
  chargeDetail: Pt;
  /** 生命行左锚点 */
  playerHp: Pt;
  /** 升级徽章行左锚点 */
  upgrades: Pt;
  /** 右上角按钮：第一颗中心，向左排 */
  buttons: Pt & { gap: number };
  /** 弹盘内提示 */
  hint: Pt;
  /** 关卡横幅中心 */
  banner: Pt;
  /** 敌人一句话背景（竖屏没有位置时省略） */
  flavor?: Pt;
  /** 本轮蓄能明细的换行宽度 */
  chargeDetailWidth: number;
}

export function computeLayout(portrait: boolean): ScreenLayout {
  if (!portrait) {
    const board = { x: 40, y: 30 };
    const cx = 950;
    return {
      width: 1280,
      height: 720,
      portrait: false,
      board,
      enemy: { x: cx, y: 350 },
      enemyScale: 1,
      levelLabel: { x: cx, y: 58 },
      enemyName: { x: cx, y: 104 },
      enemyHpBar: { x: cx, y: 142, w: 400 },
      intent: { x: cx, y: 176 },
      charge: { x: cx, y: 514 },
      chargeDetail: { x: cx, y: 552 },
      playerHp: { x: 660, y: 642 },
      upgrades: { x: 660, y: 692 },
      buttons: { x: 1236, y: 50, gap: 60 },
      hint: { x: board.x + BOARD.width / 2, y: board.y + BOARD.height - 40 },
      banner: { x: board.x + BOARD.width / 2, y: board.y + BOARD.height / 2 },
      flavor: { x: cx, y: 602 },
      chargeDetailWidth: 520,
    };
  }
  const board = { x: 90, y: 480 };
  const cx = 360;
  return {
    width: 720,
    height: 1280,
    portrait: true,
    board,
    enemy: { x: 440, y: 300 },
    enemyScale: 0.78,
    levelLabel: { x: 40, y: 44 },
    enemyName: { x: cx, y: 90 },
    enemyHpBar: { x: cx, y: 128, w: 440 },
    intent: { x: cx, y: 160 },
    charge: { x: 150, y: 300 },
    chargeDetail: { x: 150, y: 342 },
    playerHp: { x: 100, y: 1176 },
    upgrades: { x: 100, y: 1232 },
    buttons: { x: 676, y: 44, gap: 60 },
    hint: { x: board.x + BOARD.width / 2, y: board.y + BOARD.height - 40 },
    banner: { x: board.x + BOARD.width / 2, y: board.y + BOARD.height / 2 },
    chargeDetailWidth: 270,
  };
}
