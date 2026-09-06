import { defineConfig } from '@playwright/test';

/**
 * 端到端测试：默认对 vite preview 出来的生产构建跑（先 build）。
 * 设 E2E_BASE_URL 可以指向已在运行的 dev server（如 http://127.0.0.1:5173）。
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL,
    channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
    headless: true,
    viewport: { width: 1280, height: 800 },
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npx vite build && npx vite preview --port 4173 --strictPort',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
