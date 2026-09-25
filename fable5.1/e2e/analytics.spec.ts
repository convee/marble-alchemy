import { expect, test } from '@playwright/test';

test('匿名事件队列保留 X 来源归因', async ({ page }) => {
  await page.goto('/?utm_source=x&utm_campaign=launch_thread');
  await page.waitForFunction(() => !!window.__marble?.getState());
  const events = await page.evaluate(() => JSON.parse(localStorage.getItem('chaoschemy:analytics:v1') ?? '[]'));
  expect(events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'page_view',
        utm_source: 'x',
        utm_campaign: 'launch_thread',
      }),
    ]),
  );
});

