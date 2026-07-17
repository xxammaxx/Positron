import type { Page } from '@playwright/test';

/**
 * QA-069: Shared E2E admin token fixture.
 *
 * Injects the test admin token into browser localStorage before any
 * admin-protected write operation (demo runs, etc.).
 *
 * ## Token contract
 * - Source of truth: `playwright.config.ts` → `FAKE_MODE_ENV.POSITRON_ADMIN_TOKEN`
 *   (propagated to test workers via `process.env.POSITRON_ADMIN_TOKEN`)
 * - Server reads the same value via `webServer.env` → `FAKE_MODE_ENV`
 * - No fallback: missing token is a hard test failure
 *
 * ## Usage
 * ```ts
 * import { installAdminToken } from './fixtures/admin-auth';
 * // In a test:
 * await installAdminToken(page);
 * ```
 *
 * ## Security
 * - Token value is NEVER logged, printed, or included in error messages
 * - Token is a public, test-only, non-secret value (`positron-test-token-dev`)
 * - No production default or auth bypass
 * - Fail-fast: missing token throws before any request is made
 */
export async function installAdminToken(page: Page): Promise<void> {
	const token = process.env.POSITRON_ADMIN_TOKEN;

	if (!token) {
		throw new Error(
			'POSITRON_ADMIN_TOKEN is required for authenticated E2E writes. ' +
				'Ensure playwright.config.ts propagates the token to test workers.',
		);
	}

	// Inject on all future page navigations (works when called before page.goto())
	await page.addInitScript((t) => {
		window.localStorage.setItem('positron_admin_token', t);
	}, token);

	// Also inject on the currently loaded page if one exists (needed when called
	// after page.goto() — addInitScript only runs on the next navigation).
	try {
		await page.evaluate((t) => {
			window.localStorage.setItem('positron_admin_token', t);
		}, token);
	} catch {
		// No document loaded yet — addInitScript above will handle the first navigation.
	}
}
