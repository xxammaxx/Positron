import { test, expect } from '@playwright/test';

test.describe('Safety Controls', () => {

  test('shows Safety Controls section on dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Safety Controls')).toBeVisible({ timeout: 10000 });
  });

  test('shows individual safety flags with ON/OFF status', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Check labels are visible
    await expect(page.locator('text=Enable Merge')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Kill Switch')).toBeVisible();
    await expect(page.locator('text=Enable Push')).toBeVisible();
    await expect(page.locator('text=Fix Loop')).toBeVisible();
  });

  test('shows live server state label', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Live server state')).toBeVisible({ timeout: 5000 });
  });

  test('safety state reflects ON/OFF indicators', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Each flag should show either ON or OFF text
    const onOffIndicators = page.locator('text=/ON|OFF/');
    const count = await onOffIndicators.count();
    expect(count).toBeGreaterThanOrEqual(5); // 5 safety flags
  });
});
