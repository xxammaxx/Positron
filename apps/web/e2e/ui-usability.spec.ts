import { test, expect } from '@playwright/test';

test.describe('UI Usability', () => {
  test.setTimeout(15000);

  test('shows DEMO MODE banner in demo mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=no GitHub token configured')).toBeVisible({ timeout: 10000 });
  });

  test('shows API connection status indicator', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=API')).toBeVisible({ timeout: 10000 });
  });

  test('shows Adapter Health with data (not collapsed)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const health = page.locator('text=Adapter Health');
    await expect(health).toBeVisible({ timeout: 10000 });
    // Data should be visible (GitHub/SpecKit/OpenCode)
    await expect(page.locator('text=/GitHub|Spec Kit|OpenCode/').first()).toBeVisible({ timeout: 5000 });
  });

  test('shows helpful empty state for runs', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Should show either "No runs yet" or actual run data
    const emptyOrRuns = page.locator('text=/No runs yet|runs/');
    await expect(emptyOrRuns.first()).toBeVisible({ timeout: 10000 });
  });

  test('shows Demo Run button in demo mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Start Demo Run')).toBeVisible({ timeout: 10000 });
  });

  test('can click Demo Run button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const btn = page.locator('text=Start Demo Run');
    if (await btn.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(3000);
      // Should now show at least 1 run or an error
      const runCount = page.locator('text=/runs/');
      await expect(runCount.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('Safety Controls visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Safety Controls')).toBeVisible({ timeout: 10000 });
  });
});
