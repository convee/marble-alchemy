// 录屏：停掉主循环，按 60Hz 合成时钟手动逐帧推进并逐帧截图，再用 ffmpeg 合成 30fps MP4 与 GIF。
// 与真机帧率无关，画面完全平滑。用法：node e2e/record.mjs [baseURL] [outDir]
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync } from 'node:fs';

const base = process.argv[2] ?? 'http://127.0.0.1:5173';
const outDir = process.argv[3] ?? 'docs/media';
const framesDir = 'e2e/.frames';
rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const api = (fn, arg) => page.evaluate(fn, arg);
const st = () => api(() => window.__marble.getState());
let frame = 0;
const FPS = 30;
const STEPS_PER_FRAME = 2; // 60Hz 物理，30fps 输出
async function capture(frames) {
  for (let i = 0; i < frames; i++) {
    await api((n) => window.__marble.stepFrames(n), STEPS_PER_FRAME);
    await page.screenshot({ path: `${framesDir}/f${String(frame++).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 90 });
  }
}
async function captureUntil(pred, maxSeconds) {
  for (let i = 0; i < maxSeconds * FPS; i++) {
    await capture(1);
    if (await api(pred)) return true;
  }
  return false;
}
const seconds = (s) => Math.round(s * FPS);

await page.goto(`${base}/?seed=2026&layout=landscape`);
await page.waitForFunction(() => !!window.__marble?.getState(), null, { timeout: 30000 });
await page.waitForTimeout(500);
await api(() => window.__marble.stopLoop());
await capture(seconds(1.6)); // 开始菜单
await page.getByTestId('start-btn').click();
await captureUntil(() => window.__marble.getState().phase === 'ready', 6);
// 瞄准演示：来回扫一遍
for (let i = 0; i <= 36; i++) {
  const deg = 60 + Math.sin((i / 36) * Math.PI) * 55;
  await api((d) => window.__marble.aim(d), deg);
  await capture(1);
}
await api(() => window.__marble.aim(96));
await capture(seconds(0.4));
const pickPriority = ['lightning', 'split', 'strengthen', 'fire', 'crit', 'heal'];
async function playVolley(angle, maxSec = 16) {
  await api((a) => window.__marble.fire(a), angle);
  await captureUntil(() => ['ready', 'upgrading', 'gameover', 'victory'].includes(window.__marble.getState().phase), maxSec);
  const s = await st();
  if (s.phase === 'upgrading') {
    await capture(seconds(1.8));
    const ids = await page.locator('[data-overlay="upgrade"] .card').evaluateAll((els) => els.map((e) => e.dataset.id));
    const pick = pickPriority.find((p) => ids.includes(p)) ?? ids[0];
    await page.locator(`[data-testid="card-${pick}"]`).hover();
    await capture(seconds(0.6));
    await api((id) => window.__marble.pickUpgrade(id), pick);
    await captureUntil(() => window.__marble.getState().phase === 'ready', 6);
    await capture(seconds(0.4));
  } else if (s.phase === 'ready') {
    await capture(seconds(0.5));
  }
  return st();
}
const angles = [96, 78, 108, 88, 116, 72, 100];
let s = await st();
let volleys = 0;
while (volleys < 6 && s.level <= 3 && !['gameover', 'victory'].includes(s.phase)) {
  s = await playVolley(angles[volleys % angles.length]);
  volleys += 1;
}
await capture(seconds(1.2));
await browser.close();

console.log(`captured ${frame} frames (${(frame / FPS).toFixed(1)}s), final state`, JSON.stringify({ level: s.level, hp: s.playerHp, stats: s.stats }));
const mp4 = `${outDir}/gameplay.mp4`;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${framesDir}/f%05d.jpg`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '21', '-preset', 'medium', '-movflags', '+faststart', mp4]);
const gif = `${outDir}/gameplay.gif`;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp4, '-vf', 'fps=12,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5', gif]);
console.log('wrote', mp4, gif);
if (existsSync(mp4)) rmSync(framesDir, { recursive: true, force: true });
