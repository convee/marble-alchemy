import type { AiChallenge, AiChallengeSource } from './game';

const VALID_EFFECTS = new Set<AiChallenge['effect']>([
  'double_first_hit',
  'heal_after_settlement',
  'glass_cannon',
]);

function isChallenge(value: unknown): value is AiChallenge {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<AiChallenge>;
  return (
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    item.id.length <= 64 &&
    typeof item.title === 'string' &&
    item.title.length > 0 &&
    item.title.length <= 32 &&
    typeof item.prophecy === 'string' &&
    item.prophecy.length > 0 &&
    item.prophecy.length <= 140 &&
    typeof item.effect === 'string' &&
    VALID_EFFECTS.has(item.effect as AiChallenge['effect']) &&
    (item.debrief === undefined ||
      (typeof item.debrief === 'string' && item.debrief.length > 0 && item.debrief.length <= 180))
  );
}

export const FALLBACK_CHALLENGE: AiChallenge = {
  id: 'fallback_twin_strike',
  title: 'Twin Strike of the Dawn Stone',
  prophecy:
    'The first marble to touch fate strikes twice; lead with gold and wake the echo of dawn.',
  effect: 'double_first_hit',
  source: 'fallback',
  debrief: '离线命题仍然保留首击优势；下一轮先找能连续碰撞的落点，把一次机会变成一串火花。',
};

function dailyIndex(length: number, now = new Date()) {
  const day = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86_400_000,
  );
  return Math.abs(day) % length;
}

export async function loadDailyChallenge(): Promise<AiChallenge> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}ai/scenarios.json`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`AI challenge request failed: ${response.status}`);
    const payload = (await response.json()) as unknown;
    const metadata =
      payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const scenarios = Array.isArray(payload) ? payload : metadata.scenarios;
    if (!Array.isArray(scenarios) || scenarios.length === 0) throw new Error('No AI challenges');
    const valid = scenarios.filter(isChallenge);
    if (valid.length === 0) throw new Error('Invalid AI challenge');
    const challenge = valid[dailyIndex(valid.length)];
    const generatedBy =
      typeof metadata.generated_by === 'string' ? metadata.generated_by : undefined;
    const generatedAt =
      typeof metadata.generated_at === 'string' ? metadata.generated_at : undefined;
    const source: AiChallengeSource = generatedBy ? 'model' : 'fallback';
    return { ...challenge, source, generatedBy, generatedAt };
  } catch {
    return FALLBACK_CHALLENGE;
  }
}

export function effectLabel(effect: AiChallenge['effect']) {
  return {
    double_first_hit: '首击伤害 ×2',
    heal_after_settlement: '击败后恢复 +1 生命',
    glass_cannon: '玻璃炮 · 初始 2 生命',
  }[effect];
}

export function debriefFor(challenge: AiChallenge): string {
  return (
    challenge.debrief ??
    {
      double_first_hit: '首击优势已经写入物理规则；下一轮先找能连续碰撞的落点。',
      heal_after_settlement: '每次净化都能收回一滴生命；把风险留给即将到来的高压关卡。',
      glass_cannon: '两点生命换来更高的专注度；优先选择能稳定累积伤害的配方。',
    }[challenge.effect]
  );
}
