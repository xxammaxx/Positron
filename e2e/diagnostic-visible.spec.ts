/**
 * Diagnostic Visible Browser Test
 * Minimal test to verify the browser stays open and renders content.
 *
 * Run:
 *   $env:PW_HEADED="1"; $env:PW_OBSERVE="1"; npx playwright test e2e/diagnostic-visible.spec.ts --headed --workers=1
 *
 * Or via npm (after adding to package.json):
 *   npm run test:diag
 */

import { test, expect } from './fixtures/observe';

test.describe('Diagnostic: Visible Browser', () => {
	test('D001: Browser opens, renders content, and stays open', async ({ page }) => {
		// Capture ALL console and network errors
		const errors: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') errors.push(`[console.${msg.type()}] ${msg.text()}`);
		});
		page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
		page.on('requestfailed', (req) => {
			errors.push(`[requestfailed] ${req.url()}: ${req.failure()?.errorText ?? 'unknown'}`);
		});

		// Navigate to the app
		console.log('[DIAG] Navigating to /');
		await page.goto('/', { waitUntil: 'networkidle', timeout: 30_000 });

		// Log what we see
		const url = page.url();
		const title = await page.title();
		const bodyHtml = await page
			.locator('body')
			.innerHTML()
			.then((h) => h.slice(0, 500));

		console.log(`[DIAG] URL: ${url}`);
		console.log(`[DIAG] Title: ${title}`);
		console.log(`[DIAG] Body HTML (first 500 chars): ${bodyHtml}`);
		console.log(`[DIAG] Errors collected: ${errors.length}`);

		// Take screenshot for evidence
		await page.screenshot({
			path: 'test-results/diagnostic-visible-browser.png',
			fullPage: true,
		});
		console.log('[DIAG] Screenshot saved: test-results/diagnostic-visible-browser.png');

		// Check if body has any visible content
		const bodyVisible = await page.locator('body').isVisible();
		console.log(`[DIAG] Body visible: ${bodyVisible}`);

		// Check for common root elements
		const hasRoot = await page.locator('#root, #app, [data-testid="root"]').count();
		console.log(`[DIAG] Root elements found: ${hasRoot}`);

		// If we collected errors, print them
		if (errors.length > 0) {
			console.log('[DIAG] ERRORS DETECTED:');
			for (const err of errors) {
				console.log(`  - ${err}`);
			}
		}

		// Verify something rendered
		await expect(page.locator('body')).toBeVisible();
		expect(title.length).toBeGreaterThan(0);

		// If PW_OBSERVE is active, the observe fixture will pause after this test
		console.log(
			'[DIAG] Test assertions complete. Observe fixture will handle pause if PW_OBSERVE=1.',
		);
	});
});
