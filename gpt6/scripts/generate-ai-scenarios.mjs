import { mkdir, writeFile } from 'node:fs/promises';

const apiKey = process.env.ZHIPU_API_KEY || process.env.GLM_API_KEY;
const baseUrl = (process.env.ZAI_CODING_BASE_URL || 'https://api.z.ai/api/coding/paas/v4').replace(
  /\/$/,
  '',
);
const requestedModel = process.env.GLM_MODEL || 'glm-5.3-flash';
if (!apiKey) {
  console.error('Missing ZHIPU_API_KEY or GLM_API_KEY in the environment.');
  process.exit(1);
}

const prompt = `You are the content director for Marble Alchemy, a short original browser roguelite.
Create exactly 3 daily AI alchemy challenges. Return JSON only as an array, with no markdown or commentary.
Each item must contain only these five string keys: id, title, prophecy, effect, debrief.
The effect must be exactly one of: double_first_hit, heal_after_settlement, glass_cannon.
Use these exact mechanics: double_first_hit doubles the first peg contact of each shot; heal_after_settlement restores one life after a successful settlement that defeats an enemy; glass_cannon starts the run with two life.
Keep title under 32 characters and prophecy under 140 characters.
Keep debrief under 180 characters. The debrief is shown after the run and should turn the result into one concrete next move.
The rules must be exciting but fair, and must not require a server call during physics gameplay.
Use this exact shape: [{"id":"daily_one","title":"Short title","prophecy":"Short prophecy","effect":"double_first_hit","debrief":"One concrete next move."}, {"id":"daily_two","title":"Short title","prophecy":"Short prophecy","effect":"heal_after_settlement","debrief":"One concrete next move."}, {"id":"daily_three","title":"Short title","prophecy":"Short prophecy","effect":"glass_cannon","debrief":"One concrete next move."}]`;

const effects = new Set(['double_first_hit', 'heal_after_settlement', 'glass_cannon']);
const models = [...new Set([requestedModel, 'glm-5.3'])];
let scenarios;
let usedModel;
let lastError;
for (const model of models) {
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(20_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 1200,
        messages: [
          { role: 'system', content: 'Return valid JSON with no markdown fences.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!response.ok) throw new Error(`request ${response.status}`);
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('missing content');
    const json = content
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const candidate = JSON.parse(json);
    if (!Array.isArray(candidate) || candidate.length !== 3) throw new Error('schema mismatch');
    const ids = new Set();
    for (const item of candidate) {
      if (
        !item ||
        typeof item.id !== 'string' ||
        item.id.length === 0 ||
        item.id.length > 64 ||
        ids.has(item.id) ||
        typeof item.title !== 'string' ||
        item.title.length === 0 ||
        item.title.length > 32 ||
        typeof item.prophecy !== 'string' ||
        item.prophecy.length === 0 ||
        item.prophecy.length > 140 ||
        typeof item.debrief !== 'string' ||
        item.debrief.length === 0 ||
        item.debrief.length > 180 ||
        !effects.has(item.effect)
      )
        throw new Error('schema mismatch');
      ids.add(item.id);
    }
    scenarios = candidate;
    usedModel = model;
    break;
  } catch (error) {
    lastError = error;
  }
}
if (!scenarios || !usedModel) throw new Error(`No model produced valid challenges: ${lastError}`);

await mkdir('public/ai', { recursive: true });
await writeFile(
  'public/ai/scenarios.json',
  `${JSON.stringify({ generated_by: usedModel, generated_at: new Date().toISOString(), scenarios }, null, 2)}\n`,
);
console.log(`Wrote ${scenarios.length} AI challenges using ${usedModel}.`);
