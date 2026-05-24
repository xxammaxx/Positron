import { test, expect } from '@playwright/test';

test.describe('Run Detail Page', () => {

  test('shows pipeline phases for a given run', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Click on first available run
    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    test.skip(count === 0, 'No runs available to test detail');

    await runCards.first().click();
    await page.waitForSelector('text=Run ID', { timeout: 5000 });

    // Check that the pipeline shows at least some phases
    await expect(page.locator('text=QUEUED')).toBeVisible();
    await expect(page.locator('text=CLAIMED')).toBeVisible();
    await expect(page.locator('text=DONE')).toBeVisible();
  });

  test('shows PR & Merge section', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    test.skip(count === 0, 'No runs available');

    await runCards.first().click();
    await page.waitForSelector('text=PR & Merge', { timeout: 5000 });
    await expect(page.locator('text=PR & Merge')).toBeVisible();
  });

  test('shows Test Report section', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    test.skip(count === 0, 'No runs available');

    await runCards.first().click();
    await page.waitForSelector('text=Test Report', { timeout: 5000 });
    await expect(page.locator('text=Test Report')).toBeVisible();
  });

  test('shows Evidence section', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    test.skip(count === 0, 'No runs available');

    await runCards.first().click();
    await page.waitForSelector('text=Evidence', { timeout: 5000 });
    await expect(page.locator('text=Evidence')).toBeVisible();
  });

  test('shows Autonomy Mode section', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    test.skip(count === 0, 'No runs available');

    await runCards.first().click();
    await page.waitForSelector('text=Autonomy Mode', { timeout: 5000 });
    await expect(page.locator('text=Autonomy Mode')).toBeVisible();
  });

  test('shows Run Controls section', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    test.skip(count === 0, 'No runs available');

    await runCards.first().click();
    await page.waitForSelector('text=Run Controls', { timeout: 5000 });
    await expect(page.locator('text=Run Controls')).toBeVisible();

    // Verify disabled buttons
    await expect(page.locator('button:has-text("Pause")')).toBeDisabled();
    await expect(page.locator('button:has-text("Abort")')).toBeDisabled();
    await expect(page.locator('button:has-text("Resume")')).toBeDisabled();
    await expect(page.locator('button:has-text("Retry")')).toBeDisabled();
  });
});
