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

const prompt = `Return exactly 3 original English Marble Alchemy challenge objects as JSON only.
Keys: id, title, prophecy, effect, debrief. Effects: double_first_hit, heal_after_settlement, glass_cannon.
Mechanics: first effect doubles the first peg contact of each shot; second restores one life after a settlement that defeats an enemy; third starts with two lives.
Keep title under 32 chars, prophecy under 140, debrief under 180. Use only real concepts: aim, peg contacts, damage, life, settlement, shots, and the six upgrades. Never mention rerolls, mana, decks, currencies, shops, spells, energy, or relics.
Shape: [{"id":"daily_one","title":"Short title","prophecy":"Short prophecy","effect":"double_first_hit","debrief":"Aim at a dense peg cluster on the next shot."},{"id":"daily_two","title":"Short title","prophecy":"Short prophecy","effect":"heal_after_settlement","debrief":"Choose an upgrade that keeps damage reliable."},{"id":"daily_three","title":"Short title","prophecy":"Short prophecy","effect":"glass_cannon","debrief":"Protect your two lives and favor steady damage."}]`;

const effects = new Set(['double_first_hit', 'heal_after_settlement', 'glass_cannon']);
const forbiddenMechanics = /\b(reroll|mana|deck|currency|shop|spell|energy|relic)\b/i;
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
        max_tokens: 1600,
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
        forbiddenMechanics.test(`${item.prophecy} ${item.debrief}`) ||
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
