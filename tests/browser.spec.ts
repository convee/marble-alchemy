import { test, expect, type Page } from '@playwright/test';
const snapshot = (page: Page) => page.evaluate(() => (window as any).__alchemyTest.snapshot());
const fixture = (page: Page, data: object) =>
  page.evaluate((d) => (window as any).__alchemyTest.configure(d), data);
async function ready(page: Page) {
  await page.goto('/');
  await page.locator('canvas').waitFor();
  await expect(page.locator('#phase-label')).toHaveText('等待发射');
}
async function restart(page: Page) {
  await page.locator('#restart').click();
  await page.locator('#confirm-restart').click();
  await expect(page.locator('#phase-label')).toHaveText('等待发射');
}

test('real mouse shot, live feedback, deferred settlement and restart cleanup', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  const box = (await page.locator('canvas').boundingBox())!;
  const x = box.x + ((260 + Math.tan(0.3) * 224) / 520) * box.width,
    y = box.y + (300 / 660) * box.height;
  await page.mouse.move(x, y);
  await page.mouse.click(x, y);
  await expect.poll(async () => (await snapshot(page)).hits).toBeGreaterThan(0);
  const flying = await snapshot(page);
  expect(flying.enemyHp).toBe(12);
  expect(flying.hp).toBe(5);
  expect(flying.shots).toBe(1);
  await expect.poll(async () => (await snapshot(page)).phase).not.toBe('flying');
  await expect.poll(async () => (await snapshot(page)).phase).not.toBe('settling');
  const settled = await snapshot(page);
  expect(settled.totalDamage).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as any).__alchemyTest.settleAgain())).toBe(false);
  if (settled.phase === 'upgrade') await page.locator('[data-upgrade]').first().click();
  await restart(page);
  expect(await snapshot(page)).toMatchObject({
    hp: 5,
    level: 0,
    enemyHp: 12,
    damage: 0,
    hits: 0,
    shots: 0,
    balls: [],
    totalDamage: 0,
    pendingSplit: 0,
  });
  expect(errors).toEqual([]);
});

test('pause freezes Matter, shot age, and settlement timer; restart cancels old work', async ({
  page,
}) => {
  await ready(page);
  await page.locator('#launch').click();
  await page.locator('#pause').click();
  const before = await snapshot(page);
  await page.waitForTimeout(1100);
  expect(await snapshot(page)).toEqual(before);
  await page.locator('#resume').click();
  await expect.poll(async () => (await snapshot(page)).elapsed).toBeGreaterThan(before.elapsed);
  await restart(page);
  await page.waitForTimeout(900);
  expect(await snapshot(page)).toMatchObject({
    phase: 'aiming',
    damage: 0,
    hp: 5,
    balls: [],
    shots: 0,
  });
  await page.locator('#launch').click();
  await page.evaluate(() => (window as any).__alchemyTest.recall());
  await expect.poll(async () => (await snapshot(page)).phase).toBe('settling');
  await page.locator('#pause').click();
  const pending = await snapshot(page);
  await page.waitForTimeout(900);
  expect(await snapshot(page)).toEqual(pending);
  await page.locator('#resume').click();
  await expect.poll(async () => (await snapshot(page)).phase).toBe('aiming');
  expect((await snapshot(page)).hp).toBe(4);
  await page.locator('#launch').click();
  await page.evaluate(() => (window as any).__alchemyTest.recall());
  await expect.poll(async () => (await snapshot(page)).phase).toBe('settling');
  await restart(page);
  await page.waitForTimeout(900);
  expect(await snapshot(page)).toMatchObject({
    phase: 'aiming',
    damage: 0,
    hp: 5,
    totalDamage: 0,
    shots: 0,
  });
});

test('actual split bodies, finite lightning, critical/fire damage, and timeout recovery', async ({
  page,
}) => {
  await ready(page);
  await fixture(page, {
    enemyHp: 1000,
    build: { power: 1, fire: 1, lightning: true, split: true, critical: true },
  });
  await page.evaluate(() => (window as any).__alchemyTest.random(0.1));
  await page.locator('#launch').click();
  const firstHit = await page.evaluate(() => {
    const bridge = (window as any).__alchemyTest;
    const before = bridge.snapshot().damage;
    bridge.hit(0);
    return bridge.snapshot().damage - before;
  });
  expect(firstHit).toBe(8);
  await expect.poll(async () => (await snapshot(page)).balls.length).toBe(3);
  const hit = await snapshot(page);
  expect(hit.hits).toBeGreaterThanOrEqual(1);
  expect(hit.damage).toBeGreaterThanOrEqual(8);
  expect(hit.balls.filter((b: any) => b.child)).toHaveLength(2);
  const secondHit = await page.evaluate(() => {
    const bridge = (window as any).__alchemyTest;
    const before = bridge.snapshot().damage;
    bridge.hit(1);
    return bridge.snapshot().damage - before;
  });
  expect(secondHit).toBe(8);
  expect((await snapshot(page)).balls).toHaveLength(3);
  expect((await snapshot(page)).damage).toBeGreaterThanOrEqual(16);
  await page.evaluate(() => (window as any).__alchemyTest.stall());
  await expect.poll(async () => (await snapshot(page)).phase).toBe('aiming');
  expect((await snapshot(page)).balls).toHaveLength(0);
  expect((await snapshot(page)).totalDamage).toBeGreaterThanOrEqual(16);
});

test('all five upgrade screens, unique offers, healing, victory and play again', async ({
  page,
}) => {
  await ready(page);
  // Fixtures isolate progression UI; real physics causes each enemy defeat.
  await fixture(page, { hp: 3, build: { lightning: true, split: true, critical: true } });
  for (let level = 0; level < 5; level++) {
    await fixture(page, { enemyHp: 1 });
    await page.locator('#launch').click();
    await expect.poll(async () => (await snapshot(page)).hits).toBeGreaterThan(0);
    await expect.poll(async () => (await snapshot(page)).balls.length).toBe(3);
    await expect.poll(async () => (await snapshot(page)).pendingSplit).toBe(0);
    await page.evaluate(() => (window as any).__alchemyTest.recall());
    await expect(page.locator('[data-upgrade]')).toHaveCount(3);
    expect((await snapshot(page)).level).toBe(level);
    expect(new Set((await snapshot(page)).offers)).toEqual(new Set(['power', 'fire', 'heal']));
    await page.locator(`[data-upgrade="${level === 0 ? 'heal' : 'power'}"]`).click();
    if (level === 0) expect((await snapshot(page)).hp).toBe(5);
  }
  await expect(page.locator('#modal-title')).toContainText('属于自己的奇迹');
  expect((await snapshot(page)).phase).toBe('won');
  await page.screenshot({ path: 'artifacts/victory.png', fullPage: true });
  await page.locator('#play-again').click();
  expect(await snapshot(page)).toMatchObject({
    phase: 'aiming',
    hp: 5,
    level: 0,
    build: { power: 0, fire: 0, split: false, critical: false, lightning: false },
  });
});

test('failure screen, keyboard, help, sound persistence and clean retry', async ({ page }) => {
  await ready(page);
  await page.locator('#help').click();
  await expect(page.locator('#modal-title')).toHaveText('从一颗弹珠开始。');
  await page.keyboard.press('Escape');
  await expect(page.locator('#modal')).not.toBeVisible();
  await page.getByRole('button', { name: '关闭音效', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: '开启音效', exact: true })).toBeVisible();
  await fixture(page, { hp: 1, enemyHp: 1000 });
  await page.locator('#game').focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space');
  await expect(page.locator('#modal-title')).toContainText('火种暂熄');
  expect((await snapshot(page)).phase).toBe('lost');
  await page.screenshot({ path: 'artifacts/failure.png', fullPage: true });
  await page.locator('#play-again').click();
  expect((await snapshot(page)).hp).toBe(5);
});

test('mobile touch launch and responsive upgrade cards', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await ready(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/mobile-initial.png', fullPage: true });
  await fixture(page, { enemyHp: 1 });
  await page.locator('canvas').scrollIntoViewIfNeeded();
  const box = (await page.locator('canvas').boundingBox())!;
  await page.touchscreen.tap(
    box.x + ((260 + Math.tan(0.3) * 224) / 520) * box.width,
    box.y + (300 / 660) * box.height,
  );
  await expect.poll(async () => (await snapshot(page)).hits).toBeGreaterThan(0);
  await page.evaluate(() => (window as any).__alchemyTest.recall());
  await expect(page.locator('[data-upgrade]')).toHaveCount(3);
  await page.screenshot({ path: 'artifacts/mobile-upgrades.png', fullPage: true });
  for (const card of await page.locator('[data-upgrade]').all()) {
    const r = (await card.boundingBox())!;
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + r.width).toBeLessThanOrEqual(390);
  }
  await page.locator('[data-upgrade]').first().tap();
  expect((await snapshot(page)).level).toBe(1);
  await context.close();
});

test('stationary fixture triggers nudge and returns to real physics', async ({ page }) => {
  await ready(page);
  await fixture(page, { enemyHp: 1000 });
  await page.locator('#launch').click();
  await page.evaluate(() => (window as any).__alchemyTest.rest());
  await expect.poll(async () => (await snapshot(page)).nudgeCount).toBeGreaterThan(0);
  const beforeRelease = (await snapshot(page)).balls[0];
  await page.evaluate(() => (window as any).__alchemyTest.release());
  await expect
    .poll(async () => {
      const ball = (await snapshot(page)).balls[0];
      return ball ? Math.hypot(ball.x - beforeRelease.x, ball.y - beforeRelease.y) : 0;
    })
    .toBeGreaterThan(1);
  await page.evaluate(() => (window as any).__alchemyTest.recall());
  await expect.poll(async () => (await snapshot(page)).phase).toBe('aiming');
  expect((await snapshot(page)).balls).toHaveLength(0);
});

test('touch drag aims without firing until release', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await ready(page);
  await page.locator('canvas').scrollIntoViewIfNeeded();
  const box = (await page.locator('canvas').boundingBox())!;
  const cdp = await context.newCDPSession(page);
  const y = box.y + (280 / 660) * box.height,
    x = box.x + box.width / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 5; i++)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + i * 8, y }],
    });
  expect((await snapshot(page)).shots).toBe(0);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(async () => (await snapshot(page)).shots).toBe(1);
  await expect.poll(async () => (await snapshot(page)).hits).toBeGreaterThan(0);
  await context.close();
});
