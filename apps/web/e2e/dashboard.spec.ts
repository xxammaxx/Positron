import { test, expect } from '@playwright/test';

test.describe('Operator Dashboard', () => {

  test('shows the Positron header and title', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Positron')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Operator Cockpit')).toBeVisible();
  });

  test('shows footer with ready status', async ({ page }) => {
    await page.goto('/');
    // Footer should eventually show ready
    await expect(page.locator('footer')).toContainText('ready', { timeout: 10000 });
  });

  test('shows the Run List section', async ({ page }) => {
    await page.goto('/');
    // Either "Runs" heading or "No runs yet" message
    await page.waitForSelector('text=/Runs|No runs yet/', { timeout: 10000 });
  });

  test('shows Issues section', async ({ page }) => {
    await page.goto('/');
    // Issues section should appear
    await page.waitForSelector('text=/Issues|No repository/i', { timeout: 10000 });
  });

  test('shows Safety Controls', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Safety Controls')).toBeVisible({ timeout: 10000 });
  });

  test('shows Adapter Health', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Adapter Health')).toBeVisible({ timeout: 10000 });
  });

  test('navigates to run detail and back', async ({ page }) => {
    await page.goto('/');
    // Wait for the page to load
    await page.waitForTimeout(2000);

    // If there are runs, click the first one
    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();

    if (count > 0) {
      await runCards.first().click();
      // Should now be on run detail page — expect Run ID info
      await expect(page.locator('text=Run ID')).toBeVisible({ timeout: 5000 });
      // Check for key sections
      await expect(page.locator('text=Merge Gates')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Event Log')).toBeVisible({ timeout: 5000 });

      // Click back to dashboard
      await page.locator('text=← Dashboard').click();
      await expect(page.locator('text=Positron')).toBeVisible({ timeout: 5000 });
    }
  });
});
