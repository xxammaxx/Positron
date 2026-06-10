/**
 * Positron Manual Product Demo — demo-live.mjs
 *
 * Starts Positron as a visible, interactive product demo — NOT a Playwright test.
 * This is the human-visible demo mode requested in Issue #66 correction.
 *
 * What it does:
 *   1. Builds backend TypeScript
 *   2. Starts backend server (Express on :3000)
 *   3. Starts frontend dev server (Vite on :5173)
 *   4. Waits for both to be healthy
 *   5. Creates a demo live run via POST /api/demo/live-run
 *   6. Opens the browser at the Positron dashboard
 *   7. Prints clear URLs for manual navigation
 *   8. Stays running until Ctrl+C
 *
 * Usage:
 *   npm run demo:open     (full demo with browser auto-open)
 *   npm run demo:open:no-browser  (just servers + URLs, no auto-open)
 *   npm run demo:url      (servers + URLs only — for manual copy/paste)
 *   npm run demo:firefox  (try Firefox directly via BROWSER=firefox)
 *   npm run demo:chrome   (try Google Chrome via BROWSER=google-chrome)
 *   npm run demo:chrome-stable  (try Chrome Stable via BROWSER=google-chrome-stable)
 *   npm run demo:chromium (try Chromium via BROWSER=chromium)
 *
 * Browser auto-open on Linux fallback chain:
 *   $BROWSER env > google-chrome > google-chrome-stable > chromium >
 *   chromium-browser > xdg-open > sensible-browser > gio open > firefox
 */

import { spawn, execSync } from 'node:child_process';

// ── Configuration ──────────────────────────────────────────
const BACKEND_PORT = 3000;
const FRONTEND_PORT = 5173;
const DASHBOARD_URL = `http://localhost:${FRONTEND_PORT}/`;
const RUNS_URL = `http://localhost:${FRONTEND_PORT}/runs`;
const EVIDENCE_URL = `http://localhost:${FRONTEND_PORT}/evidence`;
const API_HEALTH_URL = `http://localhost:${BACKEND_PORT}/api/health`;
const DEMO_RUN_API = `http://localhost:${BACKEND_PORT}/api/demo/live-run`;

const NO_BROWSER = process.argv.includes('--no-browser');
const ONLY_SERVERS = process.argv.includes('--servers-only');

// ── Helpers ────────────────────────────────────────────────

function log(msg) {
	console.log(`[demo] ${msg}`);
}

function warn(msg) {
	console.log(`[demo] ⚠ ${msg}`);
}

/** Wait for URL to respond with HTTP 200 */
async function waitForUrl(url, label, timeoutMs = 60_000) {
	const start = Date.now();
	log(`Waiting for ${label}...`);
	while (Date.now() - start < timeoutMs) {
		try {
			const res = await fetch(url);
			if (res.ok) {
				log(`${label} ready (${Date.now() - start}ms)`);
				return true;
			}
		} catch {
			// Not ready yet
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	warn(`${label} did not become ready within ${timeoutMs / 1000}s`);
	return false;
}

/** HTTP POST with JSON */
async function postJSON(url, body) {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: body ? JSON.stringify(body) : undefined,
	});
	if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
	return res.json();
}

/** Run a command and resolve with success/failure (async) */
function runCommand(command, args) {
	return new Promise((resolve) => {
		const child = spawn(command, args, {
			stdio: 'ignore',
			detached: true,
		});

		child.on('error', (error) => {
			resolve({ ok: false, command, error: error.message });
		});

		child.on('spawn', () => {
			child.unref();
			resolve({ ok: true, command });
		});
	});
}

/**
 * Open URL in default browser with fallback chain (cross-platform).
 *
 * Priority:
 *   1. $BROWSER env var (if set) — supports `demo:firefox`, `demo:chrome`, etc.
 *   2. Linux: google-chrome → google-chrome-stable → chromium → chromium-browser
 *      → xdg-open → sensible-browser → gio open → firefox
 *   3. macOS: open
 *   4. Windows: cmd /c start
 *
 * Never throws. Returns { ok, command, attempts }.
 */
async function openBrowser(url) {
	const plat = process.platform;

	const candidates = [];

	// Prefer user-specified browser via BROWSER env
	const preferredBrowser = process.env.BROWSER;
	if (preferredBrowser) {
		candidates.push([preferredBrowser, [url]]);
	}

	if (plat === 'win32') {
		candidates.push(['cmd', ['/c', 'start', '', url]]);
	} else if (plat === 'darwin') {
		candidates.push(['open', [url]]);
	} else {
		// Linux: Chrome/Chromium variants first, then xdg-utils, then firefox
		candidates.push(
			['google-chrome', [url]],
			['google-chrome-stable', [url]],
			['chromium', [url]],
			['chromium-browser', [url]],
			['xdg-open', [url]],
			['sensible-browser', [url]],
			['gio', ['open', url]],
			['firefox', [url]],
		);
	}

	const attempts = [];

	for (const [command, args] of candidates) {
		const result = await runCommand(command, args);
		attempts.push(result);

		if (result.ok) {
			return { ok: true, command, attempts };
		}
	}

	return { ok: false, attempts };
}

// ── Cleanup ────────────────────────────────────────────────
const children = [];

function cleanup() {
	log('Shutting down demo...');
	for (const child of children) {
		try {
			// Kill process tree on Windows
			if (process.platform === 'win32' && child.pid) {
				try {
					execSync(`taskkill /pid ${child.pid} /T /F 2>nul`);
				} catch {}
			} else {
				child.kill('SIGTERM');
			}
		} catch {}
	}
	process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

// ── Main ───────────────────────────────────────────────────

async function main() {
	console.log('');
	console.log('┌──────────────────────────────────────────────────────┐');
	console.log('│                                                      │');
	console.log('│   🚀 Positron — Manual Product Demo                   │');
	console.log('│   Evidence-Gated GitHub Issue Execution System       │');
	console.log('│                                                      │');
	console.log('└──────────────────────────────────────────────────────┘');
	console.log('');

	// 1. Build backend
	log('Building backend TypeScript...');
	try {
		execSync(
			'npx tsc -b packages/shared packages/sandbox packages/github-adapter packages/run-state packages/speckit-adapter packages/opencode-adapter apps/server',
			{
				stdio: 'pipe',
				cwd: new URL('..', import.meta.url).pathname,
			},
		);
		log('Backend build complete.');
	} catch (err) {
		warn(`Build failed, trying to continue anyway: ${err.message?.slice(0, 100)}`);
	}

	// 2. Start backend server
	log('Starting backend server...');
	const serverProc = spawn('node', ['apps/server/dist/index.js'], {
		stdio: ['ignore', 'pipe', 'pipe'],
		env: { ...process.env, NODE_ENV: 'development', PORT: String(BACKEND_PORT) },
		detached: false,
	});
	children.push(serverProc);
	serverProc.stdout?.on('data', (d) => process.stdout.write(`[server] ${d}`));
	serverProc.stderr?.on('data', (d) => process.stderr.write(`[server:err] ${d}`));
	serverProc.on('close', (code) => {
		warn(`Backend server exited (code ${code})`);
	});

	// 3. Start frontend dev server
	log('Starting frontend dev server...');
	const viteProc = spawn(
		'npx',
		['vite', 'apps/web', '--port', String(FRONTEND_PORT), '--strictPort'],
		{
			stdio: ['ignore', 'pipe', 'pipe'],
			env: { ...process.env },
			detached: false,
		},
	);
	children.push(viteProc);
	viteProc.stdout?.on('data', (d) => process.stdout.write(`[vite] ${d}`));
	viteProc.stderr?.on('data', (d) => process.stderr.write(`[vite:err] ${d}`));
	viteProc.on('close', (code) => {
		warn(`Frontend dev server exited (code ${code})`);
	});

	// 4. Wait for both servers
	const backendOk = await waitForUrl(API_HEALTH_URL, 'Backend API', 90_000);
	const frontendOk = await waitForUrl(DASHBOARD_URL, 'Frontend Vite', 60_000);

	if (!backendOk || !frontendOk) {
		warn('One or more servers failed to start. Check output above.');
		if (backendOk) log('Dashboard is available but backend is not.');
		if (frontendOk) log('Backend is available but frontend is not.');
	}

	// 5. Create demo run
	let demoRunId = null;
	try {
		log('Creating demo live run...');
		const demoData = await postJSON(DEMO_RUN_API);
		demoRunId = demoData.runId;
		log(`Demo run created: ${demoRunId}`);
	} catch (err) {
		warn(`Could not create demo run: ${err.message}`);
		warn('Dashboard will show existing runs only.');
	}

	// 6. Open browser with robust fallback chain
	const autoOpen = !NO_BROWSER && !ONLY_SERVERS;
	let browserResult = null;
	if (autoOpen) {
		const targetUrl = demoRunId
			? `http://localhost:${FRONTEND_PORT}/runs/${demoRunId}`
			: DASHBOARD_URL;
		// Delay a moment to let everything settle
		await new Promise((r) => setTimeout(r, 1500));

		console.log('');
		log('Attempting to open browser...');
		const result = await openBrowser(targetUrl);

		if (result.ok) {
			console.log(`  ✅ Browser open command started: ${result.command}`);
			console.log(
				`  📍 Tried ${result.attempts.length} method(s), succeeded with: ${result.command}`,
			);
		} else {
			console.log('');
			console.log('  ╔══════════════════════════════════════════════════╗');
			console.log('  ║   ⚠️  Could not auto-open browser.               ║');
			console.log('  ║   Open the URL below manually.                  ║');
			console.log('  ╚══════════════════════════════════════════════════╝');
			console.log('');
			console.log(`  Target URL: ${targetUrl}`);
			console.log('');
			console.log('  Tried the following commands (all failed):');
			for (const attempt of result.attempts) {
				console.log(
					`    - ${attempt.command}: ${attempt.error ?? 'command not found or failed silently'}`,
				);
			}
			console.log('');
			console.log('  💡 Tips:');
			console.log('    1. Install xdg-utils:  sudo apt install xdg-utils');
			console.log(
				'    2. Set default browser: xdg-settings set default-web-browser firefox.desktop',
			);
			console.log('    3. Use Firefox directly: npm run demo:firefox');
			console.log('    4. Copy URL mode:       npm run demo:url');
			console.log('');
		}
		browserResult = result;
	}

	// 7. Print URLs
	console.log('');
	console.log('  ╔══════════════════════════════════════════════════╗');
	console.log('  ║   Positron demo is running.                      ║');
	console.log('  ╚══════════════════════════════════════════════════╝');
	console.log('');
	console.log(`  Dashboard:     ${DASHBOARD_URL}`);
	console.log(`  Runs:          ${RUNS_URL}`);
	if (demoRunId) {
		console.log(`  Live Run:      http://localhost:${FRONTEND_PORT}/runs/${demoRunId}`);
	}
	console.log(`  Evidence:      ${EVIDENCE_URL}`);
	console.log(`  Settings:      http://localhost:${FRONTEND_PORT}/settings`);
	console.log(`  API Health:    ${API_HEALTH_URL}`);
	console.log('');
	if (!autoOpen) {
		console.log('  👆 Open one of these URLs in your browser.');
	} else {
		console.log('  👆 The browser should now be open and visible.');
	}
	console.log('');
	console.log('  Press Ctrl+C to stop the demo.');
	console.log('');

	// 8. Keep process alive until Ctrl+C
	// This interval ensures the script does NOT exit when:
	//   - browser auto-open fails (no external process keeping event loop busy)
	//   - spawned children are detached/unref'd
	//   - user needs time to copy URL and open manually
	setInterval(() => {}, 10_000);
}

main().catch((err) => {
	console.error('[demo] Fatal error:', err);
	cleanup();
});
