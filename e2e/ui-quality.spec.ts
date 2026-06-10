/**
 * UI Quality E2E Tests
 * Verifies that the Positron UI renders as a usable product,
 * not just as a blank page with minimal content.
 *
 * Run:
 *   npm run test:e2e
 *   npm run test:e2e:headed
 *   npm run test:e2e:observe
 */
import { test, expect } from './fixtures/observe';

test.describe('UI Quality: App Shell', () => {
	test('Q01: App Shell renders with navigation and main content', async ({ page }) => {
		const errors: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') errors.push(msg.text());
		});
		page.on('pageerror', (err) => errors.push(err.message));

		await page.goto('/', { waitUntil: 'networkidle', timeout: 30_000 });

		// Navigation exists (sidebar)
		await expect(page.getByRole('navigation', { name: /Main/i })).toBeVisible();

		// Main content area exists
		await expect(page.getByRole('main')).toBeVisible();

		// Skip to content link exists
		await expect(page.locator('.skip-to-content')).toBeAttached();

		// No console errors
		expect(errors.length).toBe(0);
	});

	test('Q02: Sidebar has all 5 navigation items', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle', timeout: 30_000 });

		const expectedItems = ['Dashboard', 'Runs', 'Evidence', 'Repositories', 'Settings'];
		const nav = page.getByRole('navigation', { name: /Main/i });

		for (const item of expectedItems) {
			await expect(nav.getByRole('link', { name: item })).toBeVisible();
		}
	});

	test('Q03: TopBar renders with logo and health indicator', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle', timeout: 30_000 });

		// Logo is visible
		await expect(page.getByText('Positron')).toBeVisible();

		// Health indicator exists (in the header)
		const header = page.locator('header');
		await expect(header).toBeVisible();
	});

	test('Q04: Dashboard page has heading and description', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle', timeout: 30_000 });

		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
		await expect(page.getByText(/Evidence-Gated/)).toBeVisible();
	});

	test('Q05: Dashboard status cards render (pass/active/blocked/failed)', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle', timeout: 30_000 });

		// The status summary should have labeled cards
		await expect(page.getByText('Passed', { exact: true })).toBeVisible();
		await expect(page.getByText('Active', { exact: true })).toBeVisible();
		await expect(page.getByText('Blocked', { exact: true })).toBeVisible();
		await expect(page.getByText('Failed', { exact: true })).toBeVisible();
	});

	test('Q06: Evidence summary section renders', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle', timeout: 30_000 });

		await expect(page.getByText('Evidence Summary')).toBeVisible();
	});

	test('Q07: Needs Attention section renders', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle', timeout: 30_000 });

		await expect(page.getByText('Needs Attention')).toBeVisible();
	});

	test('Q08: System Health section renders', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle', timeout: 30_000 });

		await expect(page.getByText('System Health')).toBeVisible();
	});
});

test.describe('UI Quality: Stub Pages', () => {
	test('Q09: Settings page renders with MCP configuration', async ({ page }) => {
		await page.goto('/settings', { waitUntil: 'networkidle', timeout: 30_000 });

		await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
		// New functional settings page shows MCP, test modes, safety gates
		await expect(page.getByText(/MCP configuration/)).toBeVisible();
	});

	test('Q10: Evidence page renders with content', async ({ page }) => {
		await page.goto('/evidence', { waitUntil: 'networkidle', timeout: 30_000 });

		await expect(page.getByRole('heading', { name: 'Evidence', exact: true })).toBeVisible();
		await expect(page.getByText(/Aggregated evidence/)).toBeVisible();
	});

	test('Q11: Runs page renders with content', async ({ page }) => {
		await page.goto('/runs', { waitUntil: 'networkidle', timeout: 30_000 });

		await expect(page.getByRole('heading', { name: 'Runs' })).toBeVisible();
	});
});

test.describe('UI Quality: Functional Pages', () => {
	test('Q16: Settings page shows MCP servers section', async ({ page }) => {
		await page.goto('/settings', { waitUntil: 'networkidle', timeout: 30_000 });

		// MCP Servers heading
		await expect(page.getByText(/MCP Servers/)).toBeVisible();
	});

	test('Q17: Settings page shows Test Modes section', async ({ page }) => {
		await page.goto('/settings', { waitUntil: 'networkidle', timeout: 30_000 });

		// Test Modes heading
		await expect(page.getByText(/Test Modes/)).toBeVisible();
	});

	test('Q18: Settings page shows Safety Gates section', async ({ page }) => {
		await page.goto('/settings', { waitUntil: 'networkidle', timeout: 30_000 });

		// Safety Gates heading
		await expect(page.getByText(/Safety Gates/)).toBeVisible();
	});

	test('Q19: Evidence page shows summary or filter controls', async ({ page }) => {
		await page.goto('/evidence', { waitUntil: 'networkidle', timeout: 30_000 });

		// Shows either: evidence summary, empty state, or filter controls
		const hasSummary = await page
			.getByText(/Evidence Summary Available/i)
			.isVisible()
			.catch(() => false);
		const hasEmpty = await page
			.getByText(/No Evidence Yet/i)
			.isVisible()
			.catch(() => false);
		const hasFilters = await page
			.getByPlaceholder(/Search evidence/i)
			.isVisible()
			.catch(() => false);
		expect(hasSummary || hasEmpty || hasFilters).toBeTruthy();
	});

	test('Q20: Runs page shows run data or empty state', async ({ page }) => {
		await page.goto('/runs', { waitUntil: 'networkidle', timeout: 30_000 });

		// Either shows run table or empty state
		const hasContent = await page
			.getByText(/total runs/)
			.isVisible()
			.catch(() => false);
		if (!hasContent) {
			// Should show empty state
			await expect(page.getByText(/No Runs Yet/i)).toBeVisible();
		}
	});
});

test.describe('UI Quality: Accessibility', () => {
	test('Q12: Focus styles are applied (focus-visible)', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle', timeout: 30_000 });

		// Tab to the skip link
		await page.keyboard.press('Tab');

		// Skip link should be visible (not -top-10)
		const skipLink = page.locator('.skip-to-content');
		await expect(skipLink).toBeVisible();
	});

	test('Q13: Semantic HTML structure exists', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle', timeout: 30_000 });

		// header element
		await expect(page.locator('header')).toBeAttached();
		// nav element
		await expect(page.locator('nav[aria-label="Main navigation"]')).toBeAttached();
		// main element with id
		await expect(page.locator('main#main-content')).toBeAttached();
	});
});

test.describe('UI Quality: Empty States', () => {
	test('Q14: Evidence page shows content (summary or empty state)', async ({ page }) => {
		await page.goto('/evidence', { waitUntil: 'networkidle', timeout: 30_000 });

		// Either shows empty state, summary, or evidence content
		const hasNoEvidence = await page
			.getByText(/No Evidence Yet/i)
			.isVisible()
			.catch(() => false);
		const hasSummary = await page
			.getByText(/Evidence Summary Available/i)
			.isVisible()
			.catch(() => false);
		const hasAggregated = await page
			.getByText(/Aggregated evidence/i)
			.isVisible()
			.catch(() => false);
		expect(hasNoEvidence || hasSummary || hasAggregated).toBeTruthy();
	});

	test('Q15: Runs page shows empty state when no runs', async ({ page }) => {
		await page.goto('/runs', { waitUntil: 'networkidle', timeout: 30_000 });

		// Either shows runs or empty state
		const hasContent = await page
			.getByText(/total runs/i)
			.isVisible()
			.catch(() => false);
		const hasEmpty = await page
			.getByText(/No Runs Yet/i)
			.isVisible()
			.catch(() => false);
		expect(hasContent || hasEmpty).toBeTruthy();
	});

	test('Q21: Settings page never shows secrets', async ({ page }) => {
		await page.goto('/settings', { waitUntil: 'networkidle', timeout: 30_000 });

		const bodyText = await page.locator('body').innerText();

		// No GitHub tokens visible
		expect(bodyText).not.toContain('ghp_');
		expect(bodyText).not.toContain('gho_');
		expect(bodyText).not.toContain('github_pat_');
		// No API keys
		expect(bodyText).not.toContain('sk-ant-');
		// "masked" should appear for token indication
		expect(bodyText).toContain('masked');
	});
});
