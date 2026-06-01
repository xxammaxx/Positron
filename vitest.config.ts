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
      'apps/worker/src/__tests__/**/*.test.ts',
    ],
    exclude: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
    ],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: [
        'packages/*/src/**',
        'apps/server/src/**',
        'apps/worker/src/**',
      ],
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        'test-results/',
        'playwright-report/',
        '**/*.config.*',
        '**/*.d.ts',
        '**/__tests__/**',
        '**/test/**',
        '**/tests/**',
        '**/e2e/**',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
    reporters: ['verbose'],
  },
});
