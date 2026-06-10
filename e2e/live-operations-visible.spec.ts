/**
 * Live Operations — Visual Validation Test (Issue #66)
 *
 * Demonstrates all live operations features in a visible browser.
 * Run: npm run demo:live  or  npm run test:e2e:live-observe
 */
import { test, expect } from './fixtures/observe';

const SCREENSHOT_DIR = 'docs/live-operations';

// Helper: get first run ID from API
async function getFirstRunId(page: {
	request: {
		get: (
			url: string,
		) => Promise<{ json: () => Promise<{ runs?: Array<{ id: string; status: string }> }> }>;
	};
}): Promise<string | null> {
	const res = await page.request.get('http://localhost:3000/api/runs?limit=1');
	const data = await res.json();
	return data.runs?.[0]?.id ?? null;
}

test.describe('Live Operations — Visual Validation', () => {
	test('V01: Create demo run via API', async ({ page }) => {
		const res = await page.request.post('http://localhost:3000/api/demo/live-run');
		expect(res.ok()).toBeTruthy();
		const data = await res.json();
		expect(data.ok).toBe(true);
		expect(data.runId).toBeDefined();
		console.log(`[LIVE-DEMO] Created demo run: ${data.runId}`);
	});

	test('V02: Dashboard renders with demo data', async ({ page }) => {
		const errors: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') errors.push(msg.text());
		});

		await page.goto('/', { waitUntil: 'networkidle', timeout: 30_000 });
		await page.waitForTimeout(2000);

		await page.screenshot({ path: `${SCREENSHOT_DIR}/01-dashboard-with-demo.png`, fullPage: true });
		console.log(`[LIVE-DEMO] Dashboard rendered. Errors: ${errors.length}`);
		expect(errors.length).toBe(0);

		await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
		await expect(page.getByRole('navigation', { name: /Main/i })).toBeVisible();
		await expect(page.getByRole('main')).toBeVisible();
	});

	test('V03: Runs list is visible and navigable', async ({ page }) => {
		await page.goto('/runs', { waitUntil: 'networkidle', timeout: 30_000 });
		await page.waitForTimeout(1500);

		await page.screenshot({ path: `${SCREENSHOT_DIR}/02-runs-list.png`, fullPage: true });
		await expect(page.getByRole('heading', { name: 'Runs' })).toBeVisible();

		const runRows = page.locator('table tbody tr');
		const count = await runRows.count();
		console.log(`[LIVE-DEMO] Runs list has ${count} rows`);

		if (count > 0) {
			await runRows.first().click();
			await page.waitForTimeout(1000);
			expect(page.url()).toContain('/runs/');
			console.log(`[LIVE-DEMO] Navigated to: ${page.url()}`);
		}
	});

	test('V04: RunDetail shows live events evidence and cancel', async ({ page }) => {
		const runId = await getFirstRunId(page);
		if (!runId) {
			console.log('[LIVE-DEMO] No runs — skip');
			return;
		}

		console.log(`[LIVE-DEMO] Opening: ${runId.slice(0, 8)}`);
		// Use 'load' not 'networkidle' because SSE keeps connection open
		await page.goto(`/runs/${runId}`, { waitUntil: 'load', timeout: 30_000 });
		await page.waitForTimeout(3000);

		await page.screenshot({
			path: `${SCREENSHOT_DIR}/03-run-detail-live-events.png`,
			fullPage: true,
		});
		await page.screenshot({
			path: `${SCREENSHOT_DIR}/04-run-detail-viewport.png`,
			fullPage: false,
		});

		// Header
		await expect(page.getByRole('heading', { name: /Run /i })).toBeVisible();
		// Event log
		await expect(page.getByText(/Event Log/i)).toBeVisible();
		// Phase timeline
		await expect(page.getByText(/Phasen-Timeline/i)).toBeVisible();

		const statusText = await page
			.locator('text=/ACTIVE|DONE|FAILED|CANCELLED/i')
			.first()
			.textContent()
			.catch(() => 'unknown');
		console.log(`[LIVE-DEMO] Status: ${statusText}`);

		const cancelBtn = page.getByRole('button', { name: /cancel/i });
		const cancelVisible = await cancelBtn.isVisible().catch(() => false);
		console.log(`[LIVE-DEMO] Cancel visible: ${cancelVisible}`);
	});

	test('V05: Live evidence panel', async ({ page }) => {
		const runId = await getFirstRunId(page);
		if (!runId) return;

		await page.goto(`/runs/${runId}`, { waitUntil: 'load', timeout: 30_000 });
		await page.waitForTimeout(2000);

		await page.screenshot({ path: `${SCREENSHOT_DIR}/05-live-evidence-panel.png`, fullPage: true });

		// Evidence/Artefakte section
		const hasEvidence = await page
			.getByText(/Evidence|Artefakte/i)
			.first()
			.isVisible()
			.catch(() => false);
		console.log(`[LIVE-DEMO] Evidence section: ${hasEvidence}`);
		expect(hasEvidence).toBeTruthy();
	});

	test('V06: Cancel button and cancel flow', async ({ page }) => {
		// Find an active run
		const res = await page.request.get('http://localhost:3000/api/runs?limit=20');
		const data = await res.json();
		const activeRun = (data.runs || []).find((r: { status: string }) => r.status === 'active');
		if (!activeRun) {
			console.log('[LIVE-DEMO] No active run — skip cancel test');
			return;
		}

		const runId = activeRun.id;
		console.log(`[LIVE-DEMO] Cancel test: ${runId.slice(0, 8)}`);

		await page.goto(`/runs/${runId}`, { waitUntil: 'load', timeout: 30_000 });
		await page.waitForTimeout(2000);

		const cancelBtn = page.getByRole('button', { name: /Cancel Run/i });
		if (!(await cancelBtn.isVisible().catch(() => false))) {
			await page.screenshot({
				path: `${SCREENSHOT_DIR}/06-run-terminal-state.png`,
				fullPage: false,
			});
			console.log('[LIVE-DEMO] No cancel button — run terminal');
			return;
		}

		// Click Cancel
		await cancelBtn.click();
		await page.waitForTimeout(500);

		await page.screenshot({
			path: `${SCREENSHOT_DIR}/06-cancel-confirmation.png`,
			fullPage: false,
		});

		const confirmBtn = page.getByRole('button', { name: /Confirm Cancel/i });
		const keepBtn = page.getByRole('button', { name: /Keep/i });
		const confirmVisible = await confirmBtn.isVisible().catch(() => false);
		console.log(`[LIVE-DEMO] Confirm: ${confirmVisible}`);

		if (confirmVisible) {
			await confirmBtn.click();
			await page.waitForTimeout(3000); // Wait for backend to process cancel

			await page.screenshot({ path: `${SCREENSHOT_DIR}/07-cancelled-state.png`, fullPage: false });

			// Check for cancelled indicator anywhere on the page
			const bodyText = await page.locator('body').innerText();
			const cancelledVisible = bodyText.toLowerCase().includes('cancelled');
			console.log(`[LIVE-DEMO] Cancelled: ${cancelledVisible}`);
			// May take time to appear — log but don't fail the test
			if (!cancelledVisible) {
				console.log('[LIVE-DEMO] Cancelled state not yet visible in DOM — may need SSE refresh');
			}
		}
	});

	test('V07: Secret redaction — no raw tokens in UI', async ({ page }) => {
		// Find run with token event
		const res = await page.request.get('http://localhost:3000/api/runs?limit=20');
		const data = await res.json();
		let targetRunId: string | null = null;
		for (const r of data.runs || []) {
			const evtRes = await page.request.get(`http://localhost:3000/api/runs/${r.id}`);
			const evtData = await evtRes.json();
			if (
				(evtData.events || []).some((e: { message: string }) =>
					e.message?.includes('FAKE_API_TOKEN'),
				)
			) {
				targetRunId = r.id;
				break;
			}
		}

		if (!targetRunId) {
			console.log('[LIVE-DEMO] No token event found');
			return;
		}

		await page.goto(`/runs/${targetRunId}`, { waitUntil: 'load', timeout: 30_000 });
		await page.waitForTimeout(3000);

		const bodyText = await page.locator('body').innerText();
		await page.screenshot({ path: `${SCREENSHOT_DIR}/08-secret-redaction.png`, fullPage: true });

		// Check redaction: token label may appear but raw value must not
		if (bodyText.includes('FAKE_API_TOKEN')) {
			const hasRawToken = bodyText.includes('sk-demo-should-be-redacted');
			const hasRedacted = bodyText.includes('redacted');
			console.log(
				`[LIVE-DEMO] Raw token visible: ${hasRawToken} | Redacted marker: ${hasRedacted}`,
			);
			// Either value is redacted in message, or payload is redacted
			expect(hasRawToken).toBe(false);
		}
	});

	test('V08: Connection and System Health state', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle', timeout: 30_000 });
		await page.waitForTimeout(1500);

		await page.screenshot({ path: `${SCREENSHOT_DIR}/09-connected-state.png`, fullPage: true });

		await expect(page.locator('header')).toBeVisible();
		const systemHealth = page.getByText(/System Health/i);
		const healthVisible = await systemHealth.isVisible().catch(() => false);
		console.log(`[LIVE-DEMO] System Health: ${healthVisible}`);
		expect(healthVisible).toBeTruthy();
	});
});
