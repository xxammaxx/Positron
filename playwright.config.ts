import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'npx tsx src/index.ts',
      cwd: './apps/server',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'npx vite --port 5173',
      cwd: './apps/web',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 30000,
    }
  ],
});
