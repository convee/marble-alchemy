// A normal, unmodified run through the real UI. Start `npm run dev` first.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [], log = [];
let result = 'unfinished';
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:5173/');
  await page.locator('canvas').waitFor();
  for (let i = 0; i < 25; i++) {
    await page.locator('#launch').click();
    await page.waitForFunction(() => !document.querySelector('#launch').disabled || document.querySelector('#modal').open, {}, { timeout: 23000 });
    const row = { shot: i + 1, level: await page.locator('#level-number').textContent(), damage: await page.locator('#damage').textContent(), hits: await page.locator('#hits').textContent(), life: await page.locator('#hp-number').textContent(), phase: await page.locator('#phase-label').textContent() };
    if (await page.locator('[data-upgrade]').count()) {
      const choices = await page.locator('[data-upgrade]').evaluateAll(elements => elements.map(el => el.dataset.upgrade));
      const priority = Number(row.life.split('/')[0]) <= 2 ? ['heal', 'split', 'lightning', 'power', 'fire', 'critical'] : ['split', 'lightning', 'power', 'fire', 'critical', 'heal'];
      const pick = priority.find(id => choices.includes(id));
      Object.assign(row, { offers: choices, pick });
      await page.screenshot({ path: 'artifacts/desktop-upgrades.png', fullPage: true });
      await page.locator(`[data-upgrade="${pick}"]`).click();
    }
    log.push(row); console.log(JSON.stringify(row));
    if (await page.locator('#play-again').count()) {
      result = await page.locator('#phase-label').textContent();
      await page.screenshot({ path: 'artifacts/natural-run-result.png', fullPage: true });
      break;
    }
  }
  await writeFile('artifacts/natural-run.json', JSON.stringify({ result, log, errors }, null, 2));
  console.log('Result:', result, 'Page errors:', errors.length);
  if (errors.length || result === 'unfinished') process.exitCode = 1;
} finally { await browser.close(); }
