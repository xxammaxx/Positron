import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for Safety Coverage Gate.
 *
 * Safety-critical files: those that handle secrets, paths, policies,
 * state-machine transitions, template rendering, and adapter configuration.
 *
 * This config targets only safety-critical modules with 100% threshold.
 */
export default defineConfig({
	test: {
		env: {
			POSITRON_GITHUB_MODE: 'fake',
			GITHUB_MODE: 'fake',
			POSITRON_WORKSPACE_ROOT: '',
			POSITRON_DISABLE_QUEUE: 'true',
		},
		setupFiles: ['apps/server/vitest.setup.ts'],
		include: [
			// Safety-critical test files only
			'packages/shared/src/__tests__/secret-manager.test.ts',
			'packages/shared/src/__tests__/secret-manager.property.test.ts',
			'packages/shared/src/__tests__/types.test.ts',
			'packages/run-state/src/__tests__/state-machine.test.ts',
			'packages/run-state/src/__tests__/state-machine.property.test.ts',
			'packages/sandbox/src/__tests__/smoke.test.ts',
			'packages/sandbox/src/__tests__/paths.test.ts',
			'packages/sandbox/src/__tests__/commit-policy.test.ts',
			'packages/sandbox/src/__tests__/opencode-policy.test.ts',
			'packages/sandbox/src/__tests__/speckit-policy.test.ts',
			'packages/github-adapter/src/__tests__/templates.test.ts',
			'packages/github-adapter/src/__tests__/sync-templates.test.ts',
			'packages/opencode-adapter/src/__tests__/fake-adapter.test.ts',
			'packages/opencode-adapter/src/__tests__/real-adapter.test.ts',
		],
		exclude: ['**/dist/**', '**/node_modules/**', '**/coverage/**'],
		environment: 'node',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json-summary', 'html'],
			include: [
				// Safety-critical source files only
				'packages/shared/src/secret-manager.ts',
				'packages/shared/src/types.ts',
				'packages/run-state/src/state-machine.ts',
				'packages/sandbox/src/paths.ts',
				'packages/sandbox/src/commit-policy.ts',
				'packages/sandbox/src/opencode-policy.ts',
				'packages/sandbox/src/speckit-policy.ts',
				'packages/github-adapter/src/templates.ts',
				'packages/github-adapter/src/sync-templates.ts',
				'packages/opencode-adapter/src/fake-adapter.ts',
				'packages/opencode-adapter/src/real-adapter.ts',
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
