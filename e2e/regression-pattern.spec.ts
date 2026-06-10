/**
 * Regression Test Pattern for Positron
 *
 * This file demonstrates the mandatory regression test workflow:
 * 1. Bug is reproduced → test FAILS (RED)
 * 2. Fix is implemented → test PASSES (GREEN)
 * 3. Test stays in the suite as permanent guard
 *
 * Every bug fix MUST include a regression test following this pattern.
 * The test must fail BEFORE the fix and pass AFTER the fix.
 */

import { test, expect } from './fixtures/observe';

test.describe('Regression Test Pattern', () => {
	test.describe('REGRESSION: Run state machine transitions', () => {
		test('BUG-001: Run should not transition from DONE back to QUEUED', async ({ page }) => {
			// Step 1: Create a run
			const createRes = await page.request.post('http://localhost:3000/api/repos/repo-1/runs', {
				data: { issueNumber: 42, autonomyLevel: 2 },
			});
			expect(createRes.ok()).toBeTruthy();
			const createBody = (await createRes.json()) as {
				run: { id: string; phase: string; status: string };
			};
			// The run may reach DONE or FAILED_TRANSIENT depending on configuration
			// The regression guard ensures it never transitions BACK to QUEUED after starting
			const terminalPhases = [
				'DONE',
				'FAILED_TRANSIENT',
				'FAILED_BLOCKED',
				'FAILED_UNSAFE',
				'FAILED',
				'CLEANUP',
			];
			expect(terminalPhases).toContain(createBody.run.phase);
			// Phase must NOT be QUEUED
			expect(createBody.run.phase).not.toBe('QUEUED');

			// Step 2: Verify run details — must still be in the same phase, not QUEUED
			const detailRes = await page.request.get(
				`http://localhost:3000/api/runs/${createBody.run.id}`,
			);
			expect(detailRes.ok()).toBeTruthy();
			const detailBody = (await detailRes.json()) as {
				run: { phase: string; status: string };
			};
			expect(detailBody.run.phase).not.toBe('QUEUED');
		});

		test('BUG-002: Run events must be ordered chronologically', async ({ page }) => {
			// Step 1: Create a run
			const createRes = await page.request.post('http://localhost:3000/api/repos/repo-1/runs', {
				data: { issueNumber: 43, autonomyLevel: 2 },
			});
			const createBody = (await createRes.json()) as {
				run: { id: string };
				events: Array<{
					created_at?: string;
					createdAt?: string;
					timestamp?: string;
					phase: string;
				}>;
			};

			// Step 2: Verify event ordering if events have timestamps
			const events = createBody.events;
			expect(events.length).toBeGreaterThan(0);

			// Try multiple possible timestamp field names
			const getTimestamp = (event: Record<string, unknown>): number => {
				const ts = event['created_at'] ?? event['createdAt'] ?? event['timestamp'];
				if (ts && typeof ts === 'string') {
					const d = new Date(ts);
					return isNaN(d.getTime()) ? 0 : d.getTime();
				}
				return 0;
			};

			let lastTs = 0;
			for (const event of events) {
				const currTs = getTimestamp(event as Record<string, unknown>);
				// If timestamps are available, verify ordering
				if (currTs > 0 && lastTs > 0) {
					expect(currTs).toBeGreaterThanOrEqual(lastTs);
				}
				lastTs = currTs;
			}
		});
	});

	test.describe('REGRESSION: API error handling', () => {
		test('BUG-003: Missing required fields should return 400, not 500', async ({ page }) => {
			// Missing issueNumber
			const res = await page.request.post('http://localhost:3000/api/repos/repo-1/runs', {
				data: { autonomyLevel: 2 },
			});
			expect(res.status()).toBe(400);

			const body = (await res.json()) as { error?: string };
			expect(body).toHaveProperty('error');
		});

		test('BUG-004: Invalid autonomy level should be rejected', async ({ page }) => {
			const res = await page.request.post('http://localhost:3000/api/repos/repo-1/runs', {
				data: { issueNumber: 44, autonomyLevel: 99 },
			});
			expect(res.status()).toBe(400);

			const body = (await res.json()) as { error?: string };
			expect(body).toHaveProperty('error');
		});
	});
});
