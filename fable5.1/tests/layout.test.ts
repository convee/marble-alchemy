import { describe, expect, it } from 'vitest';
import { generateLayout, MIN_PEG_GAP, minPairDistance } from '../src/core/layout';
import { BOARD, RULES } from '../src/core/balance';

describe('弹盘布局', () => {
  for (let level = 1; level <= RULES.levelCount; level++) {
    it(`第 ${level} 关：数量在 100 到 140 之间、全部在盘内、间距不重叠`, () => {
      const pegs = generateLayout(level);
      expect(pegs.length).toBeGreaterThanOrEqual(100);
      expect(pegs.length).toBeLessThanOrEqual(140);
      for (const p of pegs) {
        expect(p.x).toBeGreaterThanOrEqual(BOARD.pegRadius + BOARD.marbleRadius * 2);
        expect(p.x).toBeLessThanOrEqual(BOARD.width - BOARD.pegRadius - BOARD.marbleRadius * 2);
        expect(p.y).toBeGreaterThanOrEqual(BOARD.launcherY + 60);
        expect(p.y).toBeLessThanOrEqual(BOARD.height - 60);
      }
      expect(minPairDistance(pegs)).toBeGreaterThanOrEqual(MIN_PEG_GAP);
    });
  }
});
