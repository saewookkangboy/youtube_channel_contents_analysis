import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:3456',
  },
  webServer: {
    command: 'VITE_E2E_REPORT_PREVIEW=1 npm run dev -- --port 3456 --host 127.0.0.1',
    url: 'http://127.0.0.1:3456/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
