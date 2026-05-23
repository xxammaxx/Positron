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
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'packages/*/src/**/*.ts',
        'apps/server/src/**/*.ts',
      ],
      exclude: [
        '**/__tests__/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/*.config.*',
        '**/vitest.*',
        'packages/opencode-adapter/src/sqlite-mcp.ts',
      ],
      thresholds: {
        lines: 50,
        branches: 30,
        functions: 40,
        statements: 50,
      },
    },
  },
});
