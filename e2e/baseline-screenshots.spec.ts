/**
 * Baseline Screenshot Capture for UI/UX Audit
 * Captures before-state of all key pages.
 */
import { test, expect } from './fixtures/observe';

const SCREENSHOT_DIR = 'docs/ui-audit/baseline';

test.describe('UI Baseline Screenshots (Before)', () => {
	test('B01: Dashboard — full page', async ({ page }) => {
		const errors: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') errors.push(`[console.${msg.type()}] ${msg.text()}`);
		});
		page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

		await page.goto('/', { waitUntil: 'networkidle', timeout: 30_000 });
		await page.waitForTimeout(2000); // Let animations settle

		await page.screenshot({
			path: `${SCREENSHOT_DIR}/01-dashboard-full.png`,
			fullPage: true,
		});
		console.log(`[BASELINE] Dashboard screenshot saved. Errors: ${errors.length}`);

		await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
		// Check nav
		await expect(page.getByRole('navigation').first()).toBeVisible();
		// Check main content area
		await expect(page.getByRole('main').first()).toBeVisible();
	});

	test('B02: Dashboard — above the fold', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle', timeout: 30_000 });
		await page.setViewportSize({ width: 1440, height: 900 });

		await page.screenshot({
			path: `${SCREENSHOT_DIR}/02-dashboard-viewport.png`,
			fullPage: false,
		});
		console.log('[BASELINE] Dashboard viewport screenshot saved.');
	});

	test('B03: Repositories page', async ({ page }) => {
		await page.goto('/repos', { waitUntil: 'networkidle', timeout: 30_000 });
		await page.waitForTimeout(1000);

		await page.screenshot({
			path: `${SCREENSHOT_DIR}/03-repositories.png`,
			fullPage: true,
		});
		console.log('[BASELINE] Repositories screenshot saved.');

		await expect(page.getByRole('heading', { name: /Repositories/i })).toBeVisible();
	});
});
