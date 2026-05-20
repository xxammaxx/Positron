import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/shared',
      'packages/run-state',
      'packages/github-adapter',
      'packages/speckit-adapter',
      'packages/opencode-adapter',
      'packages/sandbox',
      'apps/server',
    ],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
    },
  },
});
