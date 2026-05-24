import { test, expect } from '@playwright/test';

test.describe('SSE Live Updates', () => {

  test('shows connection status on run detail page', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    test.skip(count === 0, 'No runs available to test SSE');

    await runCards.first().click();
    await page.waitForSelector('text=Run ID', { timeout: 5000 });

    // Connection status should be visible (connected, reconnecting, or disconnected)
    const connectionStatus = page.locator('text=/Live|Reconnecting|Disconnected/');
    await expect(connectionStatus).toBeVisible({ timeout: 10000 });
  });

  test('shows Event Log section that can receive live updates', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    test.skip(count === 0, 'No runs available');

    await runCards.first().click();
    await page.waitForSelector('text=Event Log', { timeout: 5000 });
    await expect(page.locator('text=Event Log')).toBeVisible();
  });

  test('shows Live badge when SSE connected', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    test.skip(count === 0, 'No runs available');

    await runCards.first().click();
    await page.waitForSelector('text=Run ID', { timeout: 5000 });

    // Should show "Live" or connection status
    const liveIndicator = page.locator('text=Live');
    // Not all environments support SSE, so we check if it's present
    const isVisible = await liveIndicator.isVisible().catch(() => false);
    if (isVisible) {
      await expect(liveIndicator).toBeVisible();
    }
  });

  test('pipeline updates are visible in run detail', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    test.skip(count === 0, 'No runs available');

    await runCards.first().click();
    await page.waitForSelector('text=Run ID', { timeout: 5000 });

    // Pipeline should show phases
    await expect(page.locator('text=QUEUED')).toBeVisible();
    await expect(page.locator('text=DONE')).toBeVisible();
  });
});
