import { test, expect } from '@playwright/test';

test('AUDIT-01: cancelled touch must not launch a marble', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5174/');
  await page.locator('canvas').waitFor();
  await page.locator('canvas').scrollIntoViewIfNeeded();
  const box = (await page.locator('canvas').boundingBox())!;
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: box.x + box.width * 0.6, y: box.y + box.height * 0.4 }],
  });
  await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await page.waitForTimeout(150);
  await expect(page.locator('#phase-label')).toHaveText('等待发射');
  await context.close();
});

test('AUDIT-02: Space should launch after returning from help', async ({ page }) => {
  await page.goto('/');
  await page.locator('canvas').waitFor();
  await page.locator('#help').click();
  await page.locator('#help-close').click();
  await page.keyboard.press('Space');
  await expect(page.locator('#phase-label')).toHaveText('炼成进行中');
});

test('AUDIT-03: landscape playfield should fit the visible viewport', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 820, height: 600 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5174/');
  await page.locator('canvas').waitFor();
  await page.locator('#launch').click();
  await page.waitForTimeout(500);
  const box = (await page.locator('canvas').boundingBox())!;
  expect(box.y, 'Launcher is above the viewport after automatic scrolling').toBeGreaterThanOrEqual(
    0,
  );
  expect(box.y + box.height, 'Drain is below the viewport').toBeLessThanOrEqual(600);
  await context.close();
});

test('AUDIT-04: right mouse click must not fire', async ({ page }) => {
  await page.goto('/');
  await page.locator('canvas').waitFor();
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.4, { button: 'right' });
  await page.waitForTimeout(150);
  await expect(page.locator('#phase-label')).toHaveText('等待发射');
});

for (const [width, height] of [
  [320, 568],
  [844, 390],
  [568, 320],
]) {
  test(`responsive playfield and controls fit ${width}x${height}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:5174/');
    await page.locator('canvas').waitFor();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.locator('#launch').click();
    await page.waitForTimeout(500);
    const box = (await page.locator('canvas').boundingBox())!;
    const button = (await page.locator('#launch').boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(height);
    expect(button.y + button.height).toBeLessThanOrEqual(height);
    await context.close();
  });
}

test('cancelled gesture is cleared, then a normal touch still launches', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5174/');
  await page.locator('canvas').waitFor();
  await page.locator('canvas').scrollIntoViewIfNeeded();
  const box = (await page.locator('canvas').boundingBox())!;
  const x = box.x + box.width * 0.6,
    y = box.y + box.height * 0.4;
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await page.touchscreen.tap(box.x + box.width / 2, box.y + (76 / 660) * box.height);
  await expect(page.locator('#phase-label')).toHaveText('等待发射');
  await page.touchscreen.tap(x, y);
  await expect(page.locator('#phase-label')).toHaveText('炼成进行中');
  await context.close();
});
