import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		env: {
			POSITRON_GITHUB_MODE: 'fake',
			GITHUB_MODE: 'fake',
			POSITRON_WORKSPACE_ROOT: '',
			POSITRON_DISABLE_QUEUE: 'true',
		},
		environment: 'node',
		include: ['src/__tests__/**/*.test.ts'],
		exclude: ['dist/**', 'node_modules/**', 'coverage/**'],
	},
});
