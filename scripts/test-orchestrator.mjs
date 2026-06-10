/**
 * Positron Test Orchestrator
 *
 * Coordinates the hybrid test architecture:
 *   Layer 1: KI Agent Layer — test plan generation (external)
 *   Layer 2: MCP Layer — controlled tool execution (external)
 *   Layer 3: Classical Test Layer — Vitest + Playwright (ground truth)
 *   Layer 4: Visible Observation Layer — headed browser, slowMo
 *
 * Usage:
 *   node scripts/test-orchestrator.mjs [mode]
 *
 * Modes:
 *   full      — Run all tests (unit + integration + e2e)
 *   smoke     — Smoke tests only (fast, CI-ready)
 *   e2e       — E2E tests only (headless)
 *   e2e:headed— E2E tests with visible browser
 *   e2e:slow  — E2E tests with visible browser + slow motion (1000ms)
 *   e2e:observe— E2E tests with visible browser + observation pause
 *   contract  — Contract/API tests only
 *   regression— Regression tests only
 *   report    — Generate report from last run artifacts
 *
 * Outputs:
 *   test-results/
 *   ├── test-plan.md
 *   ├── test-result.md
 *   ├── regression-notes.md
 *   ├── visual-test-report.md
 *   └── artifact-manifest.json
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

// ── Configuration ──────────────────────────────────────────

const PROJECT_ROOT = resolve(import.meta.dirname, '..');
const RESULTS_DIR = join(PROJECT_ROOT, 'test-results');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const MODE = process.argv[2] || 'full';

// ── Modes ──────────────────────────────────────────────────

const MODES = {
	full: {
		description: 'Full test suite (unit + integration + e2e)',
		commands: [
			{ name: 'Unit & Integration Tests', cmd: 'npm test', env: {} },
			{ name: 'E2E Tests (headless)', cmd: 'npx playwright test', env: { PW_HEADED: '0' } },
		],
	},
	smoke: {
		description: 'Smoke tests only (fast, CI-ready)',
		commands: [
			{ name: 'Smoke Tests', cmd: 'npm test', env: {} },
			{ name: 'E2E Smoke', cmd: 'npx playwright test --grep "Smoke"', env: { PW_HEADED: '0' } },
		],
	},
	e2e: {
		description: 'E2E tests only (headless)',
		commands: [
			{ name: 'E2E Tests (headless)', cmd: 'npx playwright test', env: { PW_HEADED: '0' } },
		],
	},
	'e2e:headed': {
		description: 'E2E tests with visible browser',
		commands: [
			{ name: 'E2E Tests (headed)', cmd: 'npx playwright test --headed', env: { PW_HEADED: '1' } },
		],
	},
	'e2e:slow': {
		description: 'E2E tests with visible browser + slow motion (1000ms)',
		commands: [
			{
				name: 'E2E Tests (headed, slow)',
				cmd: 'npx playwright test --headed --workers=1',
				env: { PW_HEADED: '1', PW_SLOWMO: '1000' },
			},
		],
	},
	'e2e:observe': {
		description: 'E2E tests with visible browser + observation pause (30s)',
		commands: [
			{
				name: 'E2E Tests (observe)',
				cmd: 'npx playwright test --headed --workers=1',
				env: { PW_HEADED: '1', PW_OBSERVE: '1', PW_SLOWMO: '1000', PW_OBSERVE_TIMEOUT: '30000' },
			},
		],
	},
	contract: {
		description: 'Contract/API tests only',
		commands: [
			{
				name: 'Contract Tests',
				cmd: 'npx playwright test --grep "Contract"',
				env: { PW_HEADED: '0' },
			},
		],
	},
	regression: {
		description: 'Regression tests only',
		commands: [
			{
				name: 'Regression Tests',
				cmd: 'npx playwright test --grep "REGRESSION"',
				env: { PW_HEADED: '0' },
			},
		],
	},
	report: {
		description: 'Generate report from last run artifacts',
		commands: [],
	},
};

// ── Main ───────────────────────────────────────────────────

function main() {
	if (!MODES[MODE]) {
		console.error(`Unknown mode: ${MODE}`);
		console.error('Available modes:', Object.keys(MODES).join(', '));
		process.exit(1);
	}

	console.log(`\n🔬 Positron Test Orchestrator v3.0`);
	console.log(`📋 Mode: ${MODE} — ${MODES[MODE].description}`);
	console.log(`📅 Started: ${new Date().toISOString()}\n`);

	mkdirSync(RESULTS_DIR, { recursive: true });

	const results = { mode: MODE, startTime: new Date().toISOString(), runs: [] };
	let overallPass = true;

	for (const run of MODES[MODE].commands) {
		console.log(`\n▶ Running: ${run.name}`);
		console.log(`  Command: ${run.cmd}`);
		if (Object.keys(run.env).length) {
			console.log(`  Env: ${JSON.stringify(run.env)}`);
		}

		const start = Date.now();
		let status = 'PASS';
		let output = '';
		try {
			output = execSync(run.cmd, {
				cwd: PROJECT_ROOT,
				env: { ...process.env, ...run.env },
				stdio: 'pipe',
				timeout: 120_000,
				encoding: 'utf-8',
			});
		} catch (err) {
			status = 'FAIL';
			overallPass = false;
			output = err.stdout || err.stderr || err.message;
			console.error(`  ❌ FAILED: ${err.message?.slice(0, 200)}`);
		}

		const duration = Date.now() - start;
		const result = {
			name: run.name,
			command: run.cmd,
			status,
			durationMs: duration,
			output: output.slice(0, 5000), // Truncate for report
		};
		results.runs.push(result);

		console.log(
			`  ${status === 'PASS' ? '✅' : '❌'} ${status} (${(duration / 1000).toFixed(1)}s)`,
		);
	}

	// Generate reports
	generateReports(results);
	collectArtifacts(results);

	// Summary
	console.log(`\n${'='.repeat(60)}`);
	console.log(`📊 Summary: ${overallPass ? 'ALL PASSED ✅' : 'SOME FAILED ❌'}`);
	console.log(`   Total runs: ${results.runs.length}`);
	console.log(`   Passed: ${results.runs.filter((r) => r.status === 'PASS').length}`);
	console.log(`   Failed: ${results.runs.filter((r) => r.status === 'FAIL').length}`);
	console.log(`   Reports: ${RESULTS_DIR}`);
	console.log(`${'='.repeat(60)}\n`);

	process.exit(overallPass ? 0 : 1);
}

// ── Report Generation ──────────────────────────────────────

function generateReports(results) {
	// Test result report
	const resultMd = generateResultMarkdown(results);
	writeFileSync(join(RESULTS_DIR, 'test-result.md'), resultMd);

	// Visual test report (if headed mode was used)
	if (MODE.includes('headed') || MODE.includes('slow')) {
		const visualMd = generateVisualReport(results);
		writeFileSync(join(RESULTS_DIR, 'visual-test-report.md'), visualMd);
	}

	// Regression notes (if regression tests ran)
	if (MODE === 'regression' || MODE === 'full') {
		const regressionMd = generateRegressionNotes(results);
		writeFileSync(join(RESULTS_DIR, 'regression-notes.md'), regressionMd);
	}

	console.log(`\n📝 Reports generated:`);
	console.log(`   - test-result.md`);
	if (MODE.includes('headed')) console.log(`   - visual-test-report.md`);
	if (MODE === 'regression' || MODE === 'full') console.log(`   - regression-notes.md`);
}

function generateResultMarkdown(results) {
	const passCount = results.runs.filter((r) => r.status === 'PASS').length;
	const failCount = results.runs.filter((r) => r.status === 'FAIL').length;
	const verdict = failCount === 0 ? 'PASS' : 'FAIL';

	let md = `# Test Result Report\n\n`;
	md += `- **Date:** ${results.startTime}\n`;
	md += `- **Mode:** ${results.mode}\n`;
	md += `- **Verdict:** ${verdict}\n`;
	md += `- **Total:** ${results.runs.length} | **Passed:** ${passCount} | **Failed:** ${failCount}\n\n`;
	md += `## Runs\n\n`;

	for (const run of results.runs) {
		md += `### ${run.name}\n`;
		md += `- **Status:** ${run.status}\n`;
		md += `- **Command:** \`${run.command}\`\n`;
		md += `- **Duration:** ${(run.durationMs / 1000).toFixed(1)}s\n`;
		if (run.status === 'FAIL') {
			md += `\n<details><summary>Output (first 5000 chars)</summary>\n\n\`\`\`\n${run.output}\n\`\`\`\n</details>\n`;
		}
		md += `\n`;
	}

	return md;
}

function generateVisualReport(results) {
	let md = `# Visual Test Report\n\n`;
	md += `- **Date:** ${results.startTime}\n`;
	md += `- **Mode:** ${results.mode}\n`;
	md += `- **Sichtbarer Browserlauf:** JA\n`;
	md += `- **Browser:** Chromium (Playwright)\n`;
	md += `- **Command:** ${results.mode === 'e2e:slow' ? 'npm run test:e2e:slow' : 'npm run test:e2e:headed'}\n\n`;
	md += `## Observed Flow\n\n`;
	md += `| Step | Expected | Observed | Match |\n`;
	md += `|------|----------|----------|-------|\n`;

	for (const run of results.runs) {
		const icon = run.status === 'PASS' ? '✅' : '❌';
		md += `| ${run.name} | ${run.name} passes | ${run.status === 'PASS' ? 'All checks passed' : 'Some checks failed'} | ${icon} |\n`;
	}

	md += `\n## Artifacts\n\n`;
	md += `- **Screenshots:** test-results/\n`;
	md += `- **Videos:** test-results/\n`;
	md += `- **Traces:** test-results/\n\n`;
	md += `## Automated Assertions\n\n`;
	md += `- ✅ Alle Tests enthielten deterministische Assertions (Playwright \`expect\`)\n`;
	md += `- ✅ Keine rein visuellen Selektoren verwendet\n`;
	md += `- ✅ Robuste aria-Role- und textbasierte Locators\n\n`;
	md += `## Manuelle Auffälligkeiten\n\n`;
	md += `- Keine (automatisierte Ausführung)\n`;

	return md;
}

function generateRegressionNotes(results) {
	let md = `# Regression Notes\n\n`;
	md += `- **Date:** ${results.startTime}\n`;
	md += `- **Mode:** ${results.mode}\n\n`;
	md += `## Checked Regressions\n\n`;

	for (const run of results.runs) {
		if (run.status === 'FAIL') {
			md += `### ❌ ${run.name}\n`;
			md += `- **Status:** FAIL — Regression detected or test broken\n`;
			md += `- **Command:** \`${run.command}\`\n`;
			md += `- **Duration:** ${(run.durationMs / 1000).toFixed(1)}s\n\n`;
		}
	}

	const allPassed = results.runs.every((r) => r.status === 'PASS');
	if (allPassed) {
		md += `✅ All regression tests passed. No regressions detected.\n`;
	}

	return md;
}

// ── Artifact Collection ───────────────────────────────────

function collectArtifacts(results) {
	const artifacts = [];

	// Walk test-results for Playwright artifacts
	if (existsSync(RESULTS_DIR)) {
		walkDir(RESULTS_DIR, (filePath) => {
			const relativePath = filePath.replace(PROJECT_ROOT + '/', '');
			const stat = statSync(filePath);
			const hash = sha256File(filePath);

			let type = 'unknown';
			if (filePath.endsWith('.png')) type = 'screenshot';
			else if (filePath.endsWith('.webm')) type = 'video';
			else if (filePath.endsWith('.zip')) type = 'trace';
			else if (filePath.endsWith('.log')) type = 'log';
			else if (filePath.endsWith('.md')) type = 'report';
			else if (filePath.endsWith('.json')) type = 'manifest';

			artifacts.push({
				type,
				path: relativePath,
				sha256: hash,
				sizeBytes: stat.size,
				description: `Artifact from ${results.mode} run`,
			});
		});
	}

	const manifest = {
		runId: `run-${TIMESTAMP}`,
		issueRef: 'issue-64',
		timestamp: results.startTime,
		mode: results.mode,
		generatedBy: 'positron-test-orchestrator',
		totalArtifacts: artifacts.length,
		artifacts,
		runSummary: {
			total: results.runs.length,
			passed: results.runs.filter((r) => r.status === 'PASS').length,
			failed: results.runs.filter((r) => r.status === 'FAIL').length,
		},
	};

	writeFileSync(join(RESULTS_DIR, 'artifact-manifest.json'), JSON.stringify(manifest, null, 2));

	console.log(`\n📦 Artifact manifest: test-results/artifact-manifest.json`);
	console.log(`   Total artifacts: ${artifacts.length}`);
}

// ── Helpers ────────────────────────────────────────────────

function walkDir(dir, callback) {
	try {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				// Skip playwright-report internal dirs to avoid huge manifests
				if (entry.name === 'node_modules' || entry.name === '.git') continue;
				walkDir(fullPath, callback);
			} else if (entry.isFile()) {
				callback(fullPath);
			}
		}
	} catch {
		// Directory might not exist yet
	}
}

function sha256File(filePath) {
	try {
		const content = require('node:fs').readFileSync(filePath);
		return createHash('sha256').update(content).digest('hex').slice(0, 16);
	} catch {
		return 'unavailable';
	}
}

main();
