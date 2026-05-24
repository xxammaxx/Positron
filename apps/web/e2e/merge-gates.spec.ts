import { test, expect } from '@playwright/test';

test.describe('Merge Gates', () => {

  test('shows merge gates section on run detail page', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    test.skip(count === 0, 'No runs available');

    await runCards.first().click();
    await page.waitForSelector('text=Merge Gates', { timeout: 5000 });
    await expect(page.locator('text=Merge Gates')).toBeVisible();
  });

  test('shows individual gate indicators', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    test.skip(count === 0, 'No runs available');

    await runCards.first().click();
    await page.waitForSelector('text=Merge Gates', { timeout: 5000 });

    // Check for gate labels
    await expect(page.locator('text=Auto-Merge Enabled')).toBeVisible();
    await expect(page.locator('text=Kill-Switch')).toBeVisible();
    await expect(page.locator('text=Test Evidence')).toBeVisible();
    await expect(page.locator('text=Branch Exists')).toBeVisible();
  });

  test('shows merge blocked or ready status', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    test.skip(count === 0, 'No runs available');

    await runCards.first().click();
    await page.waitForSelector('text=Merge Gates', { timeout: 5000 });

    // Should show either "Ready to Merge" or "Merge Blocked"
    const readyOrBlocked = page.locator('text=/Ready to Merge|Merge Blocked/');
    await expect(readyOrBlocked).toBeVisible();
  });
});
