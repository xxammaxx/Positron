/**
 * E2E Screenshot Helper — Layer 4 Browser Evidence (Issue #170)
 *
 * Provides named screenshot capture for key UI states.
 * Screenshots are saved to test-results/screenshots/ with descriptive names.
 *
 * Usage:
 *   import { capturePageScreenshot } from "../support/artifacts.js";
 *   await capturePageScreenshot(page, "dashboard-loaded");
 */

import type { Page } from "@playwright/test";
import path from "node:path";

/**
 * Key UI states to capture during E2E tests.
 * Ordered by workflow phase — capture in sequence.
 */
export const SCREENSHOT_PAGES = [
	"dashboard-loaded",
	"health-verified",
	"new-run-modal",
	"run-started",
	"run-detail-phase",
	"dashboard-complete",
	"blueprint-before",
	"blueprint-loaded",
	"demo-run-before",
	"demo-run-started",
	"run-in-list",
	"runs-page",
	"evidence-page",
	"settings-page",
	"system-health",
] as const;

export type ScreenshotPage = (typeof SCREENSHOT_PAGES)[number];

/**
 * Capture a named screenshot of the current page state.
 *
 * @param page — Playwright Page object
 * @param name — descriptive name from SCREENSHOT_PAGES
 * @param fullPage — capture full scrollable page (default: false for viewport-only)
 * @returns absolute path to the saved screenshot
 */
export async function capturePageScreenshot(
	page: Page,
	name: ScreenshotPage,
	fullPage = false,
): Promise<string> {
	const dir =
		process.env.E2E_SCREENSHOT_DIR ??
		path.resolve(process.cwd(), "test-results", "screenshots");

	const screenshot = await page.screenshot({
		path: path.join(dir, `${name}.png`),
		fullPage,
	});

	return path.join(dir, `${name}.png`);
}

/**
 * Capture screenshots of ALL key pages in sequence.
 * Call this at the end of a complete workflow run.
 */
export async function captureAllScreenshots(
	page: Page,
	names: readonly ScreenshotPage[] = SCREENSHOT_PAGES,
): Promise<Map<ScreenshotPage, string>> {
	const results = new Map<ScreenshotPage, string>();

	for (const name of names) {
		try {
			const filepath = await capturePageScreenshot(page, name);
			results.set(name, filepath);
		} catch {
			// Non-critical: skip screenshots that can't be captured
			// (e.g., page not in expected state)
		}
	}

	return results;
}
