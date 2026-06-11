import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for Contract Tests.
 *
 * Contract tests verify PUBLIC API contracts between packages.
 * They test exported interfaces, not implementation details.
 *
 * Requirements:
 * - No real external API calls
 * - No real tokens/secrets
 * - No Redis/BullMQ dependency
 * - No filesystem writes outside temp directories
 * - Fast, deterministic execution
 */
export default defineConfig({
	test: {
		env: {
			// Ensure fake mode for all contract tests
			POSITRON_GITHUB_MODE: 'fake',
			GITHUB_MODE: 'fake',
			POSITRON_WORKSPACE_ROOT: '',
		},
		include: [
			'packages/*/src/__tests__/**/*.contract.test.ts',
			'packages/*/src/__contracts__/**/*.test.ts',
		],
		exclude: ['**/dist/**', '**/node_modules/**', '**/coverage/**'],
		environment: 'node',
		reporters: ['verbose'],
		// Contract tests should be fast — enforce a reasonable timeout
		testTimeout: 5000,
	},
});
