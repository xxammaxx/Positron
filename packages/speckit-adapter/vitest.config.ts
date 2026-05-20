import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: '@positron/speckit-adapter',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
