import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: '@positron/shared',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
