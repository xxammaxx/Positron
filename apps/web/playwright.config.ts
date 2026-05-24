import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'npm run dev --prefix ../server',
      port: 3000,
      reuseExistingServer: true,
      cwd: '../../',
    },
    {
      command: 'npm run preview --prefix .',
      port: 4173,
      reuseExistingServer: true,
    },
  ],
});
