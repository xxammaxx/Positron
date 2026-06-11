/**
 * Record a Positron demo video walking through key features.
 * Usage:
 *   node scripts/record-demo.mjs              # headless (CI/release)
 *   HEADED=1 node scripts/record-demo.mjs     # headed (interactive demo)
 *   PW_SLOWMO=500 HEADED=1 node scripts/record-demo.mjs  # slow motion
 * Output: docs/release/video-demo/positron-demo-recording.webm
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = 'docs/release/video-demo';
const BASE_URL = 'http://localhost:5173';
const HEADED = process.env.HEADED === '1';
const SLOWMO = Number.parseInt(process.env.PW_SLOWMO ?? '0', 10);

let scenesFailed = 0;
const MAX_SCENE_FAILURES = 3;

async function captureScene(page, name, url, waitMs = 2000) {
	try {
		await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
		await page.waitForTimeout(waitMs);
		await page.screenshot({ path: path.join(OUT_DIR, `scene-${name}.png`), fullPage: true });
		return true;
	} catch (err) {
		scenesFailed++;
		console.error(`  ❌ ${name} failed: ${err.message}`);
		try {
			await page.screenshot({
				path: path.join(OUT_DIR, `scene-${name}-error.png`),
				fullPage: true,
			});
		} catch {}
		return false;
	}
}

async function main() {
	const _exitCode = 0;
	fs.mkdirSync(OUT_DIR, { recursive: true });

	const browser = await chromium.launch({
		headless: !HEADED,
		slowMo: SLOWMO,
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		recordVideo: { dir: OUT_DIR, size: { width: 1440, height: 900 } },
	});

	const page = await context.newPage();

	try {
		await captureScene(page, '01-dashboard', BASE_URL);
		await captureScene(page, '02-evidence', `${BASE_URL}/evidence`);
		await captureScene(page, '03-admin', `${BASE_URL}/admin`);
		await captureScene(page, '04-runs', `${BASE_URL}/runs`);

		// Scene 5: Run Detail (requires API call)
		try {
			const resp = await page.request.get('http://localhost:3000/api/runs');
			const data = await resp.json();
			if (data.runs && data.runs.length > 0) {
				const runId = data.runs[0].id;
				await page.goto(`${BASE_URL}/runs/${runId}`, {
					waitUntil: 'domcontentloaded',
					timeout: 30000,
				});
				await page.waitForTimeout(3000);
				await page.screenshot({
					path: path.join(OUT_DIR, 'scene-05-run-detail.png'),
					fullPage: true,
				});
			} else {
			}
		} catch (err) {
			scenesFailed++;
			console.error(`  ❌ 05-run-detail failed: ${err.message}`);
		}

		// Scene 6: CLI Demo (API health check)
		try {
			const healthCheck = await page.request.get('http://localhost:3000/api/health');
			const _healthData = await healthCheck.json();
		} catch (err) {
			scenesFailed++;
			console.error(`  ❌ 06-api-health failed: ${err.message}`);
		}
	} finally {
		await context.close();
		await browser.close();
	}

	// Report
	const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.webm'));
	for (const f of files) {
		const _stat = fs.statSync(path.join(OUT_DIR, f));
	}

	if (scenesFailed > MAX_SCENE_FAILURES) {
		console.error(`\n❌ Too many scene failures (${scenesFailed}). Recording incomplete.`);
		process.exit(1);
	} else if (scenesFailed > 0) {
		console.warn(`\n⚠️ ${scenesFailed} scene(s) failed but recording completed.`);
	} else {
	}
}

main().catch((err) => {
	console.error('Fatal:', err);
	process.exit(1);
});
