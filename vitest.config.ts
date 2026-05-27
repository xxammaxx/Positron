import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      POSITRON_GITHUB_MODE: 'fake',
      GITHUB_MODE: 'fake',
      POSITRON_WORKSPACE_ROOT: '',
    },
    setupFiles: [
      'apps/server/vitest.setup.ts',
    ],
    include: [
      'packages/*/src/__tests__/**/*.test.ts',
      'apps/server/src/__tests__/**/*.test.ts',
    ],
    exclude: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
    ],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: [
        'packages/*/src/**',
        'apps/server/src/**',
      ],
    },
    reporters: ['verbose'],
  },
});
