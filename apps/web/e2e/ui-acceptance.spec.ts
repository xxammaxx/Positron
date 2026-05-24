import { test, expect } from '@playwright/test';
import path from 'node:path';

const SCREENSHOT_DIR = path.resolve('../../docs/release/ui-acceptance');

test.describe('UI Acceptance Screenshots', () => {
  test.setTimeout(30000);

  test('01 — Dashboard Overview', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Positron Operator Cockpit')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-dashboard.png'), fullPage: true });
  });

  test('02 — Issues Section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    // Issues section should be visible
    const issues = page.locator('text=/Issues|Repository/');
    if (await issues.isVisible().catch(() => false)) {
      await issues.first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-issues.png'), fullPage: true });
    }
  });

  test('03 — Safety Controls', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const safety = page.locator('text=Safety Controls');
    if (await safety.isVisible().catch(() => false)) {
      await safety.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-safety-controls.png'), fullPage: true });
    }
  });

  test('04 — Adapter Health', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const health = page.locator('text=Adapter Health');
    if (await health.isVisible().catch(() => false)) {
      await health.first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-adapter-health.png'), fullPage: true });
    }
  });

  test('05 — Run Detail (first available)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click first run
    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    if (count > 0) {
      await runCards.first().click();
      await page.waitForSelector('text=Run ID', { timeout: 5000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-run-detail.png'), fullPage: true });
    }
  });

  test('06 — 21-Phase Pipeline', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    test.skip(count === 0, 'No runs');
    await runCards.first().click();
    await page.waitForSelector('text=Run ID', { timeout: 5000 });

    // Pipeline should show QUEUED → DONE phases
    const pipeline = page.locator('text=QUEUED');
    if (await pipeline.isVisible().catch(() => false)) {
      await pipeline.first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-pipeline.png'), fullPage: true });
    }
  });

  test('07 — Merge Gates', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    test.skip(count === 0, 'No runs');
    await runCards.first().click();
    await page.waitForSelector('text=Merge Gates', { timeout: 5000 });

    const gates = page.locator('text=Merge Gates');
    if (await gates.isVisible().catch(() => false)) {
      await gates.first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-merge-gates.png'), fullPage: true });
    }
  });

  test('08 — Test Report + Evidence + Event Log', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    test.skip(count === 0, 'No runs');
    await runCards.first().click();
    await page.waitForSelector('text=Test Report', { timeout: 5000 });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-test-evidence-log.png'), fullPage: true });
  });

  test('09 — Full Page Pipeline with Run Info', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    test.skip(count === 0, 'No runs');
    await runCards.first().click();
    await page.waitForSelector('text=Run ID', { timeout: 5000 });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-full-run-detail.png'), fullPage: true });
  });
});
