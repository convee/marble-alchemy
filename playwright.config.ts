import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  timeout: 45000,
  expect: { timeout: 20000 },
  fullyParallel: false,
  workers: 1,
  metadata: {
    browserChannel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  },
  reporter: [
    ['list'],
    ['json', { outputFile: 'artifacts/e2e-results.json' }],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    headless: true,
    viewport: { width: 1440, height: 1050 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'VITE_TEST_MODE=true npm run dev -- --port 5174 --strictPort',
    port: 5174,
    reuseExistingServer: false,
  },
});
