// 冒烟脚本：打开页面、点开始、发一颗弹珠，截图并汇报控制台错误。用法：node e2e/smoke.mjs [baseURL] [layout]
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://127.0.0.1:5173';
const layout = process.argv[3] ?? 'landscape';
const viewport = layout === 'portrait' ? { width: 480, height: 900 } : { width: 1280, height: 800 };
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`console.${m.type()}: ${m.text()}`);
});
const shot = (name) => page.screenshot({ path: `e2e/.screens/${layout}-${name}.png` });

await page.goto(`${base}/?seed=7&layout=${layout}`);
await page.waitForFunction(() => !!window.__marble?.getState(), null, { timeout: 30000 });
await page.waitForTimeout(600);
await shot('01-start');
await page.getByTestId('start-btn').click();
await page.waitForTimeout(700);
await shot('02-intro');
await page.waitForFunction(() => window.__marble.getState().phase === 'ready', null, { timeout: 20000 });
await page.waitForTimeout(300);
await shot('03-ready');
await page.evaluate(() => window.__marble.fire(80));
await page.waitForTimeout(900);
await shot('04-flying');
await page.waitForFunction(() => ['ready', 'upgrading', 'gameover'].includes(window.__marble.getState().phase), null, { timeout: 60000 });
await page.waitForTimeout(300);
await shot('05-after-volley');
const s = await page.evaluate(() => window.__marble.getState());
console.log(JSON.stringify({ phase: s.phase, level: s.level, playerHp: s.playerHp, enemyHp: s.enemyHp, enemyMaxHp: s.enemyMaxHp, stats: s.stats, overlay: s.overlay, layout: s.layout, renderer: null }));
const renderer = await page.evaluate(() => document.querySelector('canvas')?.getContext ? 'canvas-present' : 'none');
console.log('renderer check:', renderer);
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
