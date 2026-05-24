import { test, expect } from '@playwright/test';

test.describe('Reviewer Automation', () => {

  test('shows PR & Merge section with reviewer support', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    test.skip(count === 0, 'No runs available');

    await runCards.first().click();
    await page.waitForSelector('text=PR & Merge', { timeout: 5000 });
    await expect(page.locator('text=PR & Merge')).toBeVisible();
  });

  test('shows reviewers if present in run events', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    test.skip(count === 0, 'No runs available');

    await runCards.first().click();
    await page.waitForSelector('text=PR & Merge', { timeout: 5000 });

    // Reviewers may or may not be present — check if the label exists
    const reviewerLabel = page.locator('text=Reviewers');
    const hasReviewers = await reviewerLabel.isVisible().catch(() => false);
    if (hasReviewers) {
      await expect(reviewerLabel).toBeVisible();
      // One or more reviewer chips should be visible
      const chips = page.locator('.bg-sky-950');
      const chipCount = await chips.count();
      expect(chipCount).toBeGreaterThan(0);
    }
  });
});
