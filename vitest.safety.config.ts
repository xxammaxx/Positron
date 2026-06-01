import { defineConfig } from 'vitest/config';

/**
 * Vitest config for Level A Safety modules only.
 * These must achieve 100% coverage in all categories.
 *
 * Level A contains only pure safety/decision/argument-building code.
 * Runtime wrappers (RealAdapter classes, orchestration) are Level B.
 */
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
      // Level A Safety Module tests
      'packages/shared/src/__tests__/secret-manager.test.ts',
      'packages/shared/src/__tests__/utils.test.ts',
      'packages/shared/src/__tests__/repository-config.test.ts',
      'packages/shared/src/__tests__/speckit-errors.test.ts',
      'packages/shared/src/__tests__/opencode-errors.test.ts',
      'packages/sandbox/src/__tests__/speckit-policy.test.ts',
      'packages/sandbox/src/__tests__/opencode-policy.test.ts',
      'packages/sandbox/src/__tests__/paths.test.ts',
      'packages/github-adapter/src/__tests__/errors.test.ts',
      'packages/github-adapter/src/__tests__/templates.test.ts',
      'packages/github-adapter/src/__tests__/label-lifecycle.test.ts',
      'packages/github-adapter/src/__tests__/sync-templates.test.ts',
      'packages/run-state/src/__tests__/state-machine.test.ts',
      'apps/server/src/__tests__/safety-service.test.ts',
      'apps/server/src/__tests__/runtime-config.test.ts',
      'apps/server/src/__tests__/admin-auth.test.ts',
      'apps/worker/src/__tests__/safety-decisions.test.ts',
      'packages/opencode-adapter/src/__tests__/cli-args.test.ts',
      'packages/opencode-adapter/src/__tests__/build-opencode-command.test.ts',
      'packages/speckit-adapter/src/__tests__/build-speckit-command.test.ts',
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
        // Level A Safety Modules (pure safety/decision/argument-building only)
        'packages/shared/src/secret-manager.ts',
        'packages/shared/src/utils.ts',
        'packages/shared/src/repository-config.ts',
        'packages/shared/src/speckit-errors.ts',
        'packages/shared/src/opencode-errors.ts',
        'packages/sandbox/src/speckit-policy.ts',
        'packages/sandbox/src/opencode-policy.ts',
        'packages/sandbox/src/paths.ts',
        'packages/github-adapter/src/errors.ts',
        'packages/github-adapter/src/templates.ts',
        'packages/github-adapter/src/label-lifecycle.ts',
        'packages/github-adapter/src/sync-templates.ts',
        'packages/run-state/src/state-machine.ts',
        'apps/server/src/safety-service.ts',
        'apps/server/src/config/runtime-config.ts',
        'apps/server/src/http/admin-auth.ts',
        'apps/worker/src/pipeline/safety-decisions.ts',
        // CLI argument builders (extracted from RealAdapter runtime wrappers)
        'packages/opencode-adapter/src/build-opencode-command.ts',
        'packages/speckit-adapter/src/build-speckit-command.ts',
      ],
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        'test-results/',
        '**/*.config.*',
        '**/*.d.ts',
        '**/__tests__/**',
        '**/test/**',
        '**/tests/**',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
