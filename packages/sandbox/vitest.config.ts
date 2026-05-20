import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: '@positron/sandbox',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
