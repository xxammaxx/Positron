import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: '@positron/run-state',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
