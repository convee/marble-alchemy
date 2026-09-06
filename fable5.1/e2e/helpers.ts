import { expect, type Page } from '@playwright/test';
import type { DebugState } from '../src/debug/hooks';
import { computeLayout } from '../src/core/screen';

export type S = DebugState;

export async function getState(page: Page): Promise<S> {
  const s = await page.evaluate(() => window.__marble?.getState() ?? null);
  if (!s) throw new Error('game not ready');
  return s;
}

export async function waitPhase(page: Page, phases: string[], timeout = 90_000): Promise<S> {
  await page.waitForFunction(
    (ps) => {
      const s = window.__marble?.getState();
      return !!s && ps.includes(s.phase);
    },
    phases,
    { timeout, polling: 50 },
  );
  return getState(page);
}

export async function waitOverlay(page: Page, kind: string, timeout = 60_000): Promise<void> {
  await page.waitForFunction((k) => window.__marble?.getState()?.overlay === k, kind, { timeout, polling: 50 });
}

/** 打开页面并点开始，直到可发射。 */
export async function boot(page: Page, query = '?seed=7'): Promise<S> {
  await page.goto('/' + query);
  await page.waitForFunction(() => !!window.__marble?.getState(), null, { timeout: 30_000 });
  await expect(page.getByTestId('start-btn')).toBeVisible();
  await page.getByTestId('start-btn').click();
  return waitPhase(page, ['ready']);
}

/** 发射并等到这一轮完全结束（回到 ready，或进入升级/终局）。 */
export async function volley(page: Page, angleDeg = 90): Promise<S> {
  const ok = await page.evaluate((a) => window.__marble!.fire(a), angleDeg);
  expect(ok).toBe(true);
  await waitPhase(page, ['flying', 'settle', 'enemyTurn', 'upgrading', 'gameover', 'victory', 'transition']);
  return waitPhase(page, ['ready', 'upgrading', 'gameover', 'victory']);
}

/** 游戏坐标 -> 页面坐标（画布经 Scale.FIT 缩放）。 */
export async function gamePoint(page: Page, gx: number, gy: number): Promise<{ x: number; y: number }> {
  const s = await getState(page);
  const L = computeLayout(s.layout === 'portrait');
  return page.evaluate(
    ([x, y, W, H]) => {
      const c = document.querySelector('canvas');
      if (!c) throw new Error('no canvas');
      const r = c.getBoundingClientRect();
      return { x: r.left + (x * r.width) / W, y: r.top + (y * r.height) / H };
    },
    [gx, gy, L.width, L.height] as const,
  );
}

export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  return errors;
}
