/**
 * After Screenshot Capture for UI/UX Redesign
 * Captures after-state of all key pages.
 */
import { test, expect } from './fixtures/observe';

const SCREENSHOT_DIR = 'docs/ui-audit/after';

test.describe('UI After Screenshots (Redesign)', () => {
	test('A01: Dashboard — full page (new design)', async ({ page }) => {
		const errors: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') errors.push(`[console.${msg.type()}] ${msg.text()}`);
		});
		page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

		await page.goto('/', { waitUntil: 'networkidle', timeout: 30_000 });
		await page.waitForTimeout(2000);

		await page.screenshot({
			path: `${SCREENSHOT_DIR}/01-dashboard-full.png`,
			fullPage: true,
		});
		console.log(`[AFTER] Dashboard screenshot saved. Errors: ${errors.length}`);

		// Verify new components exist
		await expect(page.getByRole('navigation', { name: /Main/i })).toBeVisible();
		await expect(page.getByRole('main')).toBeVisible();
		await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
		expect(errors.length).toBe(0);
	});

	test('A02: Dashboard — viewport (above the fold)', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle', timeout: 30_000 });
		await page.setViewportSize({ width: 1440, height: 900 });

		await page.screenshot({
			path: `${SCREENSHOT_DIR}/02-dashboard-viewport.png`,
			fullPage: false,
		});
		console.log('[AFTER] Dashboard viewport screenshot saved.');

		// Check sidebar navigation items
		const navItems = ['Dashboard', 'Runs', 'Evidence', 'Repositories', 'Settings'];
		for (const item of navItems) {
			await expect(page.getByRole('link', { name: item })).toBeVisible();
		}
	});

	test('A03: Repositories page (in new shell)', async ({ page }) => {
		await page.goto('/repos', { waitUntil: 'networkidle', timeout: 30_000 });
		await page.waitForTimeout(1000);

		await page.screenshot({
			path: `${SCREENSHOT_DIR}/03-repositories.png`,
			fullPage: true,
		});
		console.log('[AFTER] Repositories screenshot saved.');
	});

	test('A04: Settings stub page', async ({ page }) => {
		await page.goto('/settings', { waitUntil: 'networkidle', timeout: 30_000 });
		await page.waitForTimeout(500);

		await page.screenshot({
			path: `${SCREENSHOT_DIR}/04-settings.png`,
			fullPage: true,
		});
		console.log('[AFTER] Settings screenshot saved.');
		await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();
	});

	test('A05: Evidence stub page', async ({ page }) => {
		await page.goto('/evidence', { waitUntil: 'networkidle', timeout: 30_000 });
		await page.waitForTimeout(500);

		await page.screenshot({
			path: `${SCREENSHOT_DIR}/05-evidence.png`,
			fullPage: true,
		});
		console.log('[AFTER] Evidence screenshot saved.');
		await expect(page.getByRole('heading', { name: 'Evidence', exact: true })).toBeVisible();
	});
});
