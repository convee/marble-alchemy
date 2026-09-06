// 自动对局：停掉主循环，用 simulate() 纯逻辑快进，随机瞄准、按固定优先级选升级，统计胜率与耗时。
// 用法：node e2e/autoplay.mjs [baseURL] [runs]
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://127.0.0.1:5173';
const runs = Number(process.argv[3] ?? 10);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const api = (fn, arg) => page.evaluate(fn, arg);
const st = () => api(() => window.__marble.getState());
const pickPriority = ['lightning', 'split', 'strengthen', 'fire', 'crit', 'heal'];
const results = [];

for (let run = 1; run <= runs; run++) {
  await page.goto(`${base}/?seed=${1000 + run}`);
  await page.waitForFunction(() => !!window.__marble?.getState(), null, { timeout: 30000 });
  await api(() => window.__marble.stopLoop());
  await page.getByTestId('start-btn').click();
  let s = await st();
  for (let i = 0; i < 60 && s.phase !== 'ready'; i++) {
    await api(() => window.__marble.simulate(30));
    s = await st();
  }
  if (s.phase !== 'ready') throw new Error('intro did not reach ready: ' + s.phase);
  let volleys = 0;
  let simSteps = 0;
  const t0 = Date.now();
  let rng = 1000 + run;
  const rand = () => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng / 0x7fffffff; };
  while (!['gameover', 'victory'].includes(s.phase) && volleys < 60) {
    if (s.phase === 'ready') {
      const angle = 40 + rand() * 100;
      await api((a) => window.__marble.fire(a), angle);
      volleys += 1;
    } else if (s.phase === 'upgrading') {
      const ids = await page.locator('[data-overlay="upgrade"] .card').evaluateAll((els) => els.map((e) => e.dataset.id));
      const pick = (s.playerHp <= 2 && ids.includes('heal')) ? 'heal' : (pickPriority.find((p) => ids.includes(p)) ?? ids[0]);
      await api((id) => window.__marble.pickUpgrade(id), pick);
    }
    await api(() => window.__marble.simulate(60));
    simSteps += 60;
    s = await st();
    if (simSteps > 60 * 60 * 30) break; // 30 分钟模拟时间兜底
  }
  results.push({ seed: 1000 + run, outcome: s.phase, level: s.level, hp: s.playerHp, volleys, damage: s.stats.totalDamage, taken: s.stats.damageTaken, simSeconds: Math.round(simSteps / 60), wallSeconds: ((Date.now() - t0) / 1000).toFixed(1), upgrades: s.upgrades });
  console.log(JSON.stringify(results[results.length - 1]));
}
const wins = results.filter((r) => r.outcome === 'victory').length;
const avg = (k) => (results.reduce((a, r) => a + Number(r[k]), 0) / results.length).toFixed(1);
console.log(`runs=${runs} wins=${wins} winRate=${((wins / runs) * 100).toFixed(0)}% avgLevel=${avg('level')} avgVolleys=${avg('volleys')} avgSimSeconds=${avg('simSeconds')}`);
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
