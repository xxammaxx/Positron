/**
 * Observe fixture for E2E tests with visible browser support.
 * Provides page.pause() for manual inspection and waitForTimeout fallback.
 */
import { test as base, expect, type Page } from '@playwright/test';

const OBSERVE = process.env.PW_OBSERVE === '1';
const OBSERVE_TIMEOUT = Number.parseInt(process.env.PW_OBSERVE_TIMEOUT ?? '30000', 10);

async function observe(page: Page): Promise<void> {
	if (!OBSERVE) return;
	try {
		await page.pause();
	} catch {
		await page.waitForTimeout(OBSERVE_TIMEOUT);
	}
}

export const test = base.extend({
	page: async ({ page }, use) => {
		// Navigate to app base URL
		// Use 'load' instead of 'networkidle' because SSE streams keep connections open
		await page.goto('/', { waitUntil: 'load' });
		await use(page);
	},
});

export { expect } from '@playwright/test';
export { observe };
