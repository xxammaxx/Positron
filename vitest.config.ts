import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
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
