// 展示截图：带全部升级的飞行、结算瞬间、升级卡、暂停、失败、胜利。手动步进，与真机帧率无关。
// 用法：node e2e/showcase.mjs [baseURL] [layout]
import { chromium } from '@playwright/test';
const base = process.argv[2] ?? 'http://127.0.0.1:5173';
const layout = process.argv[3] ?? 'landscape';
const viewport = layout === 'portrait' ? { width: 480, height: 900 } : { width: 1280, height: 800 };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport });
const shot = (n) => page.screenshot({ path: `e2e/.screens/${layout}-show-${n}.png` });
const api = (fn, arg) => page.evaluate(fn, arg);
const st = () => api(() => window.__marble.getState());
/** 手动推进直到条件满足（最多 maxSec 秒模拟时间） */
async function stepUntil(pred, maxSec = 60) {
  for (let i = 0; i < maxSec * 30; i++) {
    await api(() => window.__marble.stepFrames(2));
    if (await api(pred)) return true;
  }
  throw new Error(`stepUntil timeout: ${pred.toString().slice(0, 80)}`);
}
const stepSeconds = (s) => api((n) => window.__marble.stepFrames(n), Math.round(s * 60));

await page.goto(`${base}/?seed=21&layout=${layout}`);
await page.waitForFunction(() => !!window.__marble?.getState(), null, { timeout: 30000 });
await api(() => window.__marble.stopLoop());
await page.getByTestId('start-btn').click();
await stepUntil(() => window.__marble.getState().phase === 'ready');
await api(() => { const m = window.__marble; m.grant('strengthen'); m.grant('fire'); m.grant('lightning'); m.grant('split'); m.grant('crit'); m.setEnemyHp(9999); });
await api(() => window.__marble.fire(80));
await stepUntil(() => window.__marble.getState().marbles >= 3, 20);
await stepSeconds(0.5);
await shot('a-flying-all-upgrades');
await stepUntil(() => window.__marble.getState().phase === 'settle');
await stepSeconds(0.75);
await shot('b-settle-impact');
await stepUntil(() => window.__marble.getState().phase === 'ready');
await shot('c-after-volley-hud');
await api(() => window.__marble.setEnemyHp(1));
await api(() => window.__marble.fire(90));
await stepUntil(() => window.__marble.getState().overlay === 'upgrade');
await stepSeconds(0.4);
await page.waitForTimeout(400); // DOM 卡片入场动画走的是真实时间
await shot('d-upgrade-cards');
await api(() => window.__marble.pickUpgrade(0));
await stepUntil(() => window.__marble.getState().phase === 'ready');
await shot('e-level2-ready');
await api(() => window.__marble.fire(60));
await stepSeconds(0.3);
await page.keyboard.press('Escape');
await stepSeconds(0.1);
await page.waitForTimeout(300);
await shot('f-pause');
await page.keyboard.press('Escape');
// 继续后这一轮大概率直接打死第 2 关敌人，会进升级层；两种结果都接住
await stepUntil(() => ['ready', 'upgrading'].includes(window.__marble.getState().phase));
if ((await st()).phase === 'upgrading') {
  await page.waitForTimeout(300);
  await api(() => window.__marble.pickUpgrade(0));
  await stepUntil(() => window.__marble.getState().phase === 'ready');
}
await api(() => { window.__marble.setPlayerHp(1); window.__marble.setEnemyHp(99999); });
await api(() => window.__marble.fire(90));
await stepUntil(() => window.__marble.getState().overlay === 'gameover');
await page.waitForTimeout(400);
await shot('g-gameover');
await page.getByTestId('restart-btn').click();
await stepUntil(() => window.__marble.getState().phase === 'ready');
await api(() => window.__marble.jumpToLevel(5));
await stepSeconds(0.7);
await shot('h-level5-boss');
await api(() => window.__marble.setEnemyHp(1));
await api(() => window.__marble.fire(90));
await stepUntil(() => window.__marble.getState().overlay === 'victory');
await page.waitForTimeout(500);
await shot('i-victory');
console.log('showcase done', JSON.stringify(await st()));
await browser.close();
