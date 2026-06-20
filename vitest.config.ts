import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		env: {
			POSITRON_GITHUB_MODE: 'fake',
			GITHUB_MODE: 'fake',
			POSITRON_WORKSPACE_ROOT: '',
			POSITRON_DISABLE_QUEUE: 'true',
		},
		setupFiles: ['apps/server/vitest.setup.ts'],
		include: ['packages/*/src/__tests__/**/*.test.ts', 'apps/server/src/__tests__/**/*.test.ts'],
		exclude: ['**/dist/**', '**/node_modules/**', '**/coverage/**'],
		environment: 'node',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json-summary', 'html'],
			include: ['packages/*/src/**', 'apps/server/src/**'],
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
			// Global coverage baseline — calibrated to current measured values.
			// Ratcheting policy: thresholds must never decrease. Raise as coverage improves.
			// Safety-critical coverage (secrets, state-machine, policies) uses separate
			// vitest.safety.config.ts with 100% hard gate.
			thresholds: {
				lines: 30, // Ist: 35.17% — floor 30% catches regressions
				statements: 30, // Ist: 34.98%
				functions: 32, // Ist: 36.84%
				branches: 25, // Ist: 30.22%
			},
		},
		reporters: ['verbose'],
	},
});
