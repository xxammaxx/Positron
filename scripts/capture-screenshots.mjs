/**
 * Capture screenshots of all main Positron pages for README.
 * Usage: node scripts/capture-screenshots.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const OUT_DIR = 'docs/screenshots';
const BASE_URL = 'http://localhost:5173';

const PAGES = [
	{ path: '/', name: 'dashboard', heading: 'Dashboard' },
	{ path: '/evidence', name: 'evidence', heading: 'Evidence' },
	{ path: '/admin', name: 'admin', heading: 'Admin' },
	{ path: '/runs', name: 'runs', heading: 'Runs' },
];

let failures = 0;

async function capturePage(page, name, url, waitMs = 3000) {
	try {
		console.log(`📸 Capturing ${url} → ${name}.png`);
		await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
		await page.waitForTimeout(waitMs);
		await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
		console.log(`  ✅ ${name}.png saved`);
		return true;
	} catch (err) {
		failures++;
		console.error(`  ❌ ${name}.png failed: ${err.message}`);
		try {
			await page.screenshot({ path: path.join(OUT_DIR, `${name}-error.png`), fullPage: true });
		} catch {}
		return false;
	}
}

async function main() {
	fs.mkdirSync(OUT_DIR, { recursive: true });

	let browser;
	try {
		browser = await chromium.launch({
			headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox'],
		});

		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
		});

		const page = await context.newPage();

		// Capture all main pages
		for (const { path: route, name } of PAGES) {
			await capturePage(page, name, `${BASE_URL}${route}`);
		}

		// Capture run detail page
		try {
			console.log(`📸 Fetching latest run...`);
			const resp = await page.request.get('http://localhost:3000/api/runs');
			const data = await resp.json();
			if (data.runs && data.runs.length > 0) {
				const runId = data.runs[0].id;
				await capturePage(page, 'run-detail', `${BASE_URL}/runs/${runId}`);
			} else {
				console.log('  ⚠️ No runs found, skipping run-detail');
			}
		} catch (err) {
			failures++;
			console.error(`  ❌ run-detail failed: ${err.message}`);
		}

		await page.close();
		await context.close();
	} finally {
		if (browser) await browser.close();
	}

	// Report
	console.log('\n📁 Screenshots in', OUT_DIR);
	const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.png') && !f.includes('-error'));
	for (const f of files) {
		const stat = fs.statSync(path.join(OUT_DIR, f));
		console.log(`  ${f} (${(stat.size / 1024).toFixed(1)} KB)`);
	}

	// Clean up error screenshots from previous runs
	for (const f of fs.readdirSync(OUT_DIR).filter((f) => f.includes('-error'))) {
		fs.unlinkSync(path.join(OUT_DIR, f));
		console.log(`  🧹 Cleaned up stale: ${f}`);
	}

	if (failures > 0) {
		console.error(`\n❌ ${failures} screenshot(s) failed`);
		process.exit(1);
	}
	console.log('\n✅ All screenshots captured successfully');
}

main().catch((err) => {
	console.error('Fatal:', err);
	process.exit(1);
});
