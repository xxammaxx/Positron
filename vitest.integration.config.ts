import { defineConfig } from 'vitest/config';

/**
 * Integration-Test-Konfiguration
 * Läuft Tests, die Datenbank, Redis oder andere Infrastruktur benötigen.
 * Nutzt Fake-Adapater wo möglich, Redis-Testcontainer wo nötig.
 */
export default defineConfig({
  test: {
    env: {
      POSITRON_GITHUB_MODE: 'fake',
      GITHUB_MODE: 'fake',
      POSITRON_SPECKIT_MODE: 'fake',
      POSITRON_OPENCODE_MODE: 'fake',
      POSITRON_WORKSPACE_ROOT: '/tmp/positron-integration-test',
      POSITRON_REDIS_URL: process.env.POSITRON_REDIS_URL || 'redis://localhost:6379',
      POSITRON_DB_PATH: ':memory:',
    },
    include: [
      'packages/*/src/**/*.integration.test.ts',
      'apps/server/src/**/*.integration.test.ts',
    ],
    environment: 'node',
    testTimeout: 15000,
    hookTimeout: 15000,
    reporters: ['verbose'],
    setupFiles: [],
    globalSetup: [],
  },
});
