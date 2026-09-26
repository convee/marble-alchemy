import { describe, expect, it } from 'vitest';
import { debriefFor } from '../src/ai';

describe('AI director debrief', () => {
  it('combines model-authored guidance with measured win results', () => {
    const text = debriefFor(
      {
        id: 'twin',
        title: 'Twin',
        prophecy: 'Twin.',
        effect: 'double_first_hit',
        debrief: 'Aim for a dense cluster.',
      },
      { won: true, levelsCleared: 5, totalDamage: 123, shots: 9, hp: 2 },
    );
    expect(text).toContain('Aim for a dense cluster.');
    expect(text).toContain('本局五关完成');
    expect(text).toContain('123');
  });

  it('keeps the fallback guidance when the model omits debrief text', () => {
    expect(
      debriefFor({
        id: 'glass',
        title: 'Glass',
        prophecy: 'Glass.',
        effect: 'glass_cannon',
      }),
    ).toContain('两点生命');
  });
});
