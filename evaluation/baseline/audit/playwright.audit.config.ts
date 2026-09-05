import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: 'regressions.spec.ts', workers: 1,
  timeout: 15000, expect: { timeout: 1500 },
  outputDir: 'test-results',
  use: { baseURL: 'http://127.0.0.1:4173', channel: 'chrome', viewport: { width: 1440, height: 900 }, screenshot: 'only-on-failure' },
});
