import { defineConfig, devices } from "@playwright/test";

/**
 * Positron Playwright E2E Configuration (QA-028 / L4 — Issue #170)
 *
 * Strategy:
 * - Fake adapters only — no real GitHub/OpenCode calls
 * - Explicit VITEST=true skips .env loading (prevents real mode activation)
 * - Chromium only (consistent across CI and local)
 * - webServer auto-starts backend (port 3000) and frontend (port 5173)
 * - reuseExistingServer: true — works with manually started servers
 * - Single worker — sequential execution avoids port conflicts
 *
 * Evidence (L4 — Issue #170):
 * - trace: "on" — trace for every test (Playwright Trace Viewer)
 * - video: "retain-on-failure" — video recording on failure
 * - screenshot: "only-on-failure" — automatic screenshots on failure
 * - Named screenshots captured via e2e/support/artifacts.ts helper
 * - Console and network logs captured via e2e/support/console-network.ts
 */

const FAKE_MODE_ENV = {
	// Skip .env loading entirely — the .env file sets real mode
	VITEST: "true",
	// Explicit fake mode for ALL adapters
	POSITRON_GITHUB_MODE: "fake",
	POSITRON_OPENCODE_MODE: "fake",
	POSITRON_SPECKIT_MODE: "fake",
	// QA-029: Force inline pipeline execution (no BullMQ dependency)
	POSITRON_DISABLE_QUEUE: "true",
	// Required repository config (needed when .env is skipped)
	POSITRON_REPO_OWNER: "test-owner",
	POSITRON_REPO_NAME: "test-repo",
	POSITRON_REPO_DEFAULT_BRANCH: "main",
	// Prevent real token usage
	GITHUB_TOKEN: "",
};

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: "html",
	use: {
		baseURL: "http://localhost:5173",
		// L4: Evidence collection — trace for every test, video on failure, screenshot on failure
		trace: "on",
		video: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: [
		{
			command: "npx tsx src/index.ts",
			cwd: "./apps/server",
			url: "http://localhost:3000/api/health",
			reuseExistingServer: true,
			timeout: 30000,
			env: {
				...process.env,
				...FAKE_MODE_ENV,
			},
		},
		{
			command: "npx vite --port 5173",
			cwd: "./apps/web",
			url: "http://localhost:5173",
			reuseExistingServer: true,
			timeout: 30000,
		},
	],
});
