/** Records the real production UI. No fixture bridge, RNG patch, or game-state writes. */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const target = process.env.GAME_URL || 'http://127.0.0.1:4173/';
const take =
  process.env.TAKE ||
  new Date()
    .toISOString()
    .replaceAll(':', '-')
    .replace(/\.\d+Z$/, 'Z');
const folder = `artifacts/recordings/${take}`;
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  headless: true,
});
const viewport = { width: 1440, height: 900 };
const context = await browser.newContext({
  viewport,
  deviceScaleFactor: 1,
  recordVideo: { dir: folder, size: viewport },
});
const page = await context.newPage();
const video = page.video();
const started = Date.now();
const events = [],
  errors = [],
  requests = [];
const mark = (action, data = {}) => {
  const event = { seconds: +((Date.now() - started) / 1000).toFixed(3), action, ...data };
  events.push(event);
  console.log(JSON.stringify(event));
};
const state = () =>
  page.evaluate(() => ({
    phase: document.querySelector('#phase-label').textContent,
    level: document.querySelector('#level-number').textContent,
    damage: Number(document.querySelector('#damage').textContent),
    hits: Number(document.querySelector('#hits').textContent),
    life: document.querySelector('#hp-number').textContent,
  }));
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => requests.push(request.url()));
let result = 'unfinished',
  failure;
try {
  await page.goto(target);
  await page.locator('canvas').waitFor();
  if (await page.evaluate(() => typeof window.__alchemyTest !== 'undefined'))
    throw new Error('Refusing to record a page with a fixture bridge.');
  mark('ready', await state());
  await page.screenshot({ path: `${folder}/initial.png` });
  await page.waitForTimeout(900);
  await page.locator('#help').click();
  mark('help-open');
  await page.waitForTimeout(1800);
  await page.locator('#help-close').click();
  mark('help-close');
  for (let shot = 1; shot <= 25; shot++) {
    const box = await page.locator('canvas').boundingBox();
    const aim = 0.3,
      y = box.y + (300 / 660) * box.height;
    const x = box.x + ((260 + Math.tan(aim) * 224) / 520) * box.width;
    if (shot === 1) {
      await page.mouse.move(box.x + box.width * 0.35, y, { steps: 16 });
      await page.waitForTimeout(400);
      await page.mouse.move(box.x + box.width * 0.75, y, { steps: 20 });
      await page.waitForTimeout(400);
    }
    await page.mouse.move(x, y, { steps: 16 });
    await page.waitForTimeout(500);
    mark('shoot', { shot, aimRadians: aim, ...(await state()) });
    await page.mouse.click(x, y);
    if (shot === 1) {
      await page.waitForTimeout(950);
      await page.locator('#pause').click();
      mark('pause', await state());
      await page.waitForTimeout(1400);
      await page.locator('#resume').click();
      mark('resume', await state());
    }
    await page.waitForFunction(
      () => !document.querySelector('#launch').disabled || document.querySelector('#modal').open,
      {},
      { timeout: 24000 },
    );
    mark('settled', { shot, ...(await state()) });
    if (await page.locator('[data-upgrade]').count()) {
      const offers = await page
        .locator('[data-upgrade]')
        .evaluateAll((elements) => elements.map((el) => el.dataset.upgrade));
      const hp = Number((await page.locator('#hp-number').textContent()).split('/')[0]);
      const order =
        hp <= 2
          ? ['heal', 'split', 'lightning', 'fire', 'power', 'critical']
          : ['split', 'lightning', 'fire', 'power', 'critical', 'heal'];
      const choice = order.find((id) => offers.includes(id));
      await page.screenshot({ path: `${folder}/upgrade-${shot}.png` });
      mark('upgrade-offers', { shot, offers });
      await page.waitForTimeout(1900);
      await page.locator(`[data-upgrade="${choice}"]`).hover();
      await page.waitForTimeout(550);
      await page.locator(`[data-upgrade="${choice}"]`).click();
      mark('upgrade-picked', { shot, choice });
      await page.waitForTimeout(600);
    }
    if (await page.locator('#play-again').count()) {
      result = (await state()).phase;
      mark('run-finished', await state());
      await page.screenshot({ path: `${folder}/result.png` });
      await page.waitForTimeout(2500);
      await page.locator('#play-again').click();
      mark('restart', await state());
      await page.waitForTimeout(1000);
      break;
    }
  }
} catch (error) {
  failure = String(error);
  mark('recording-error', { error: failure });
  process.exitCode = 1;
} finally {
  await context.close();
  await video.saveAs(`${folder}/codex-raw.webm`);
  await browser.close();
  const hash = createHash('sha256')
    .update(await readFile(`${folder}/codex-raw.webm`))
    .digest('hex');
  let commit = 'uncommitted';
  try {
    commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {}
  await writeFile(
    `${folder}/manifest.json`,
    JSON.stringify(
      {
        take,
        target,
        capturedAt: new Date(started).toISOString(),
        label: 'Codex 版',
        commit,
        viewport,
        result,
        events,
        errors,
        requests,
        failure,
        rawVideoSha256: hash,
        audio: 'silent: Playwright video records the browser image, not system audio',
        integrity:
          'Normal UI inputs only. No test bridge, random seed override, life/damage edit, speed-up, or generated gameplay frames.',
      },
      null,
      2,
    ),
  );
  console.log(`Recording: ${folder}/codex-raw.webm\nResult: ${result}`);
  if (errors.length || result === 'unfinished') process.exitCode = 1;
}
