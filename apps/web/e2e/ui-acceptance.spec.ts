import { test, expect } from '@playwright/test';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';

const SCREENSHOT_DIR = path.resolve('../../docs/release/ui-acceptance');
const manifestPath = path.join(SCREENSHOT_DIR, 'manifest.json');

interface ManifestEntry {
  file: string;
  route: string;
  timestamp: string;
  hash: string;
  viewport: string;
  description: string;
}

const manifest: ManifestEntry[] = [];

function addToManifest(file: string, route: string, viewport: string, description: string) {
  const filePath = path.join(SCREENSHOT_DIR, file);
  const buf = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
  manifest.push({ file, route, timestamp: new Date().toISOString(), hash, viewport, description });
}

test.describe('UI Acceptance Screenshots', () => {
  test.setTimeout(30000);

  // Helper: navigate and wait for stable UI
  async function open(page: any) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Positron Operator Cockpit')).toBeVisible({ timeout: 10000 });
  }

  test('01 — Dashboard Overview', async ({ page }) => {
    await open(page);
    const vp = page.viewportSize();
    const vpStr = `${vp?.width ?? 0}x${vp?.height ?? 0}`;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-dashboard.png'), fullPage: true });
    addToManifest('01-dashboard.png', '/', vpStr, 'Dashboard Overview — Header, Issues, Run List, Footer');
  });

  test('02 — Issue Queue Section', async ({ page }) => {
    await open(page);
    const issues = page.locator('text=/Issues|positron:|Repository/i').first();
    if (await issues.isVisible({ timeout: 3000 }).catch(() => false)) {
      await issues.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await issues.screenshot({ path: path.join(SCREENSHOT_DIR, '02-issue-queue.png') });
      addToManifest('02-issue-queue.png', '/', '', 'Issue Queue — Labels, positron:ready, Run-Button');
    }
  });

  test('03 — Safety Controls Panel', async ({ page }) => {
    await open(page);
    const safety = page.locator('text=Safety Controls');
    if (await safety.isVisible({ timeout: 3000 }).catch(() => false)) {
      await safety.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await safety.locator('..').screenshot({ path: path.join(SCREENSHOT_DIR, '03-safety-controls.png') });
      addToManifest('03-safety-controls.png', '/', '', 'Safety Controls — 5 flags: Merge, Dry-Run, Push, Kill-Switch, Fix-Loop');
    }
  });

  test('04 — Adapter Health Panel', async ({ page }) => {
    await open(page);
    const health = page.locator('text=Adapter Health');
    if (await health.isVisible({ timeout: 3000 }).catch(() => false)) {
      await health.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await health.locator('..').screenshot({ path: path.join(SCREENSHOT_DIR, '04-adapter-health.png') });
      addToManifest('04-adapter-health.png', '/', '', 'Adapter Health — GitHub, SpecKit, OpenCode availability');
    }
  });

  // Helper for run detail: navigate to first run
  async function openRunDetail(page: any) {
    await open(page);
    const runCards = page.locator('.cursor-pointer');
    const count = await runCards.count();
    if (count === 0) test.skip(true, 'No runs');
    await runCards.first().click();
    await page.waitForSelector('text=Run ID', { timeout: 5000 });
    await page.waitForTimeout(500);
  }

  test('05 — Run Detail Header + Pipeline', async ({ page }) => {
    await openRunDetail(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-run-detail-pipeline.png'), fullPage: true });
    addToManifest('05-run-detail-pipeline.png', '/run/:id', '', 'Full Run Detail — Run info header with 21-phase pipeline badges');
  });

  test('06 — Merge Gates Section', async ({ page }) => {
    await openRunDetail(page);
    const gates = page.locator('text=Merge Gates');
    if (await gates.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gates.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      // Take viewport-level screenshot centered on Merge Gates
      // Scroll slightly to ensure different viewport from other screenshots
      await page.evaluate(() => window.scrollBy(0, 50));
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-merge-gates.png') });
      addToManifest('06-merge-gates.png', '/run/:id', '', 'Merge Gates — Gate indicators with status and blocked reasons');
    }
  });

  test('07 — Test Report + Evidence', async ({ page }) => {
    await openRunDetail(page);
    const testReport = page.locator('text=Test Report');
    if (await testReport.isVisible({ timeout: 3000 }).catch(() => false)) {
      await testReport.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await testReport.screenshot({ path: path.join(SCREENSHOT_DIR, '07-test-report-evidence.png') });
      addToManifest('07-test-report-evidence.png', '/run/:id', '', 'Test Report card with PASS/FAIL status and evidence items');
    }
  });

  test('08 — Event Log with Filters', async ({ page }) => {
    await openRunDetail(page);
    const eventLog = page.locator('text=Event Log');
    if (await eventLog.isVisible({ timeout: 3000 }).catch(() => false)) {
      await eventLog.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await eventLog.screenshot({ path: path.join(SCREENSHOT_DIR, '08-event-log.png') });
      addToManifest('08-event-log.png', '/run/:id', '', 'Event Log — filter dropdowns by Level and Phase');
    }
  });

  test('09 — PR & Merge + Autonomy + Controls', async ({ page }) => {
    await openRunDetail(page);
    const controls = page.locator('text=Run Controls');
    if (await controls.isVisible({ timeout: 3000 }).catch(() => false)) {
      await controls.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      // Scroll down more to capture PR, Autonomy, and Controls together
      await page.evaluate(() => window.scrollBy(0, -200));
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-pr-autonomy-controls.png') });
      addToManifest('09-pr-autonomy-controls.png', '/run/:id', '', 'PR & Merge block, Autonomy Mode, Run Controls (Pause/Abort/Resume/Retry)');
    }
  });

  // After all tests, write manifest
  test.afterAll(async () => {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  });
});
