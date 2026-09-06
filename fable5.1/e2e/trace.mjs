// 轨迹采样：发一颗弹珠，每 200ms 打印位置与累计，直到本轮结束。用法：node e2e/trace.mjs [baseURL] [angle]
import { chromium } from '@playwright/test';
const base = process.argv[2] ?? 'http://127.0.0.1:5173';
const angle = Number(process.argv[3] ?? 90);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`${base}/?seed=11`);
await page.waitForFunction(() => !!window.__marble?.getState(), null, { timeout: 30000 });
await page.getByTestId('start-btn').click();
await page.waitForFunction(() => window.__marble.getState().phase === 'ready', null, { timeout: 20000 });
await page.evaluate(() => window.__marble.setEnemyHp(999999));
await page.evaluate((a) => window.__marble.fire(a), angle);
const t0 = Date.now();
const rows = [];
for (;;) {
  const s = await page.evaluate(() => window.__marble.getState());
  rows.push(`${((Date.now() - t0) / 1000).toFixed(1)}s ${s.phase} n=${s.marbles} pos=${JSON.stringify(s.marblePositions)} total=${s.volley.total} pegs=${s.activePegs}/${s.totalPegs}`);
  if (s.phase === 'ready' && Date.now() - t0 > 1000) break;
  if (Date.now() - t0 > 60000) break;
  await page.waitForTimeout(200);
}
console.log(rows.join('\n'));
await browser.close();
