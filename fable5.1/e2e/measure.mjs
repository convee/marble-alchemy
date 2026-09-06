// 调参脚本：无升级、敌人血量设成极大，按不同角度连发 N 轮，统计每轮命中数。用法：node e2e/measure.mjs [baseURL] [N] [level]
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://127.0.0.1:5173';
const N = Number(process.argv[3] ?? 12);
const level = Number(process.argv[4] ?? 1);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`${base}/?seed=${Date.now() % 100000}`);
await page.waitForFunction(() => !!window.__marble?.getState(), null, { timeout: 30000 });
await page.getByTestId('start-btn').click();
await page.waitForFunction(() => window.__marble.getState().phase === 'ready', null, { timeout: 20000 });
if (level !== 1) await page.evaluate((l) => window.__marble.jumpToLevel(l), level);
const results = [];
for (let i = 0; i < N; i++) {
  await page.evaluate(() => { window.__marble.setEnemyHp(999999); window.__marble.setPlayerHp(5); });
  const angle = 30 + (i * 120) / Math.max(1, N - 1);
  const before = await page.evaluate(() => window.__marble.getState().stats);
  const t0 = Date.now();
  await page.evaluate((a) => window.__marble.fire(a), angle);
  await page.waitForFunction(() => window.__marble.getState().phase === 'ready', null, { timeout: 90000 });
  const after = await page.evaluate(() => window.__marble.getState().stats);
  const hits = after.hits - before.hits;
  const dmg = after.totalDamage - before.totalDamage;
  results.push({ angle: Math.round(angle), hits, dmg, secs: ((Date.now() - t0) / 1000).toFixed(1) });
}
const hits = results.map((r) => r.hits).sort((a, b) => a - b);
const mean = hits.reduce((a, b) => a + b, 0) / hits.length;
console.log(JSON.stringify(results));
console.log(`level ${level}: N=${N} mean=${mean.toFixed(1)} median=${hits[Math.floor(hits.length / 2)]} min=${hits[0]} max=${hits[hits.length - 1]}`);
await browser.close();
