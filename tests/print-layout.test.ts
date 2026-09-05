import { it } from 'vitest';
import { generateLayout, minPairDistance } from '../src/core/layout';

it('打印各关钉子数（辅助调参）', () => {
  const rows = [1, 2, 3, 4, 5].map((l) => {
    const p = generateLayout(l);
    return `L${l}: ${p.length} pegs, minGap=${minPairDistance(p).toFixed(1)}`;
  });
  console.log(rows.join('\n'));
});
