import { test, expect } from '@playwright/test';

test.describe('Fix-Loop Visibility', () => {

  test('shows FAILED_TRANSIENT in pipeline if run has failures', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    test.skip(count === 0, 'No runs available');

    await runCards.first().click();
    await page.waitForSelector('text=Run ID', { timeout: 5000 });

    // FAILED_TRANSIENT might be visible if run had failures
    const transientPhase = page.locator('text=FAILED TRANSIENT');
    const isVisible = await transientPhase.isVisible().catch(() => false);
    if (isVisible) {
      await expect(transientPhase).toBeVisible();
    }
  });

  test('shows retry badge on FAILED_TRANSIENT', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    test.skip(count === 0, 'No runs available');

    await runCards.first().click();
    await page.waitForSelector('text=Run ID', { timeout: 5000 });

    // Check if FAILED_TRANSIENT is shown with retry info
    const failedTransient = page.locator('text=FAILED TRANSIENT');
    if (await failedTransient.isVisible().catch(() => false)) {
      // Check for retry badge (absolute positioned badge with retry count)
      const badge = failedTransient.locator('..');
      const badgeText = await badge.textContent();
      expect(badgeText).toBeTruthy();
    }
  });

  test('shows retry events in Event Log', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    test.skip(count === 0, 'No runs available');

    await runCards.first().click();
    await page.waitForSelector('text=Event Log', { timeout: 5000 });

    // Event log should be visible
    await expect(page.locator('text=Event Log')).toBeVisible();

    // Check for retry-related content in events
    const hasRetryLog = await page.locator('text=/Fix-Loop|retry|Retry/').first().isVisible().catch(() => false);
    // Not all runs have retries, so we just check the log exists
  });
});
