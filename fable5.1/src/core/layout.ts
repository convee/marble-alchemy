import { BOARD } from './balance';

/** 数据模型：弹盘钉子布局（弹盘局部坐标，原点在弹盘左上角）。 */
export interface PegSpec {
  x: number;
  y: number;
}

interface LatticeOpts {
  cols: number;
  dx: number;
  rows: number;
  dy: number;
  top: number;
}

function lattice(o: LatticeOpts): PegSpec[] {
  const out: PegSpec[] = [];
  const x0 = (BOARD.width - (o.cols - 1) * o.dx) / 2;
  for (let r = 0; r < o.rows; r++) {
    const odd = r % 2 === 1;
    const n = odd ? o.cols - 1 : o.cols;
    const off = odd ? o.dx / 2 : 0;
    for (let c = 0; c < n; c++) {
      out.push({ x: Math.round(x0 + off + c * o.dx), y: Math.round(o.top + r * o.dy) });
    }
  }
  return out;
}

const CX = BOARD.width / 2;

/**
 * 核心函数：按关卡生成钉子布局。五关五种形状，数量都在 55 到 64 之间，
 * 让每次发射的期望伤害在同一量级，难度由敌人数值拉开。
 */
/**
 * 核心函数：按关卡生成钉子布局。
 * 约束：五关都以同一张满密度交错网格为底，只做「挖空造型」（每关去掉不超过两成钉子），
 *       且不留竖直通道，保证每轮命中数量级一致（实测 18 到 22 次），难度只由敌人数值拉开。
 *       曾试过纯菱形/同心环/沙漏造型，实测每轮只撞 6 到 9 次，直接废掉中间三关。
 */
export function generateLayout(level: number): PegSpec[] {
  const base = lattice({ cols: 13, dx: 40, rows: 11, dy: 38, top: 130 });
  const cy = 320;
  switch (level) {
    case 1: {
      // 晶格：完整网格
      return base;
    }
    case 2: {
      // 双菱：左右两颗菱形凹窝
      return base.filter((p) => {
        const dl = Math.abs(p.x - 150) / 62 + Math.abs(p.y - cy) / 60;
        const dr = Math.abs(p.x - 390) / 62 + Math.abs(p.y - cy) / 60;
        return dl >= 1 && dr >= 1;
      });
    }
    case 3: {
      // 环阵：一圈暗环，环内是「炉心」实体
      return base.filter((p) => {
        const d = Math.hypot(p.x - CX, p.y - cy);
        return d < 112 || d > 152;
      });
    }
    case 4: {
      // 裂谷：两条对角裂缝交叉成 X，没有竖直通道但更容易被斜向导流
      return base.filter((p) => {
        const dx = p.x - CX;
        const dy = p.y - cy;
        return Math.abs(dx - dy) > 30 && Math.abs(dx + dy) > 30;
      });
    }
    case 5: {
      // 炉心：中心一颗核 + 环带，外圈四角保留
      const band = base.filter((p) => {
        const d = Math.hypot(p.x - CX, p.y - cy);
        return d >= 62;
      });
      return [...band, { x: CX, y: cy }];
    }
    default:
      return base;
  }
}

/** 钉子最小中心距：至少留出可见空隙（两钉半径 + 20px）。弹珠比空隙大也没关系，被撞的钉子会熄灭让路。 */
export const MIN_PEG_GAP = BOARD.pegRadius * 2 + 20;

export function minPairDistance(pegs: PegSpec[]): number {
  let min = Infinity;
  for (let i = 0; i < pegs.length; i++) {
    for (let j = i + 1; j < pegs.length; j++) {
      const d = Math.hypot(pegs[i].x - pegs[j].x, pegs[i].y - pegs[j].y);
      if (d < min) min = d;
    }
  }
  return min;
}
