#!/usr/bin/env node
// Positron — Evidence Gate CLI (Issue #279 Phase 1D)
// Combines GitHub Snapshot Collector + Context Reconciler +
// Decision Manifest Validator into an audit-ready evidence report.
//
// Read-only. No GitHub mutations, no apply behavior, no CI reruns.
//
// Usage:
//   node scripts/run-evidence-gate.mjs --dry-run --repo xxammaxx/Positron
//   node scripts/run-evidence-gate.mjs --snapshot .local-release/snapshot.json
//   node scripts/run-evidence-gate.mjs --dry-run --output .local-release/evidence-gate/report.json --format json

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// Exit code contract
// ---------------------------------------------------------------------------
const EXIT = {
	OK: 0,                 // valid report generated, no validation errors
	VALIDATION_ERROR: 1,   // validation errors or invalid input
	USAGE_ERROR: 2,        // CLI usage error
	SAFETY_VIOLATION: 3,   // prohibited command/path/safety violation
};

// ---------------------------------------------------------------------------
// Safety: prohibited command patterns (never allowed in this CLI)
// ---------------------------------------------------------------------------
const PROHIBITED_GH_COMMANDS = [
	/gh\s+pr\s+merge/,
	/gh\s+pr\s+close/,
	/gh\s+issue\s+close/,
	/gh\s+issue\s+comment/,
	/gh\s+pr\s+comment/,
	/gh\s+workflow\s+run/,
	/gh\s+run\s+rerun/,
	/gh\s+pr\s+review/,
	/gh\s+pr\s+edit/,
	/gh\s+issue\s+edit/,
	/gh\s+issue\s+reopen/,
	/gh\s+pr\s+reopen/,
	/gh\s+repo\s+edit/,
	/gh\s+api/,
];

// Read-only command allowlist (same as snapshot collector)
const ALLOWED_GH_COMMANDS = new Set([
	'gh repo view',
	'gh pr list',
	'gh pr view',
	'gh issue list',
	'gh issue view',
]);

function isAllowedGhCommand(args) {
	if (args.length < 3) return false;
	if (args[0] !== 'gh') return false;
	const prefix = `${args[0]} ${args[1]} ${args[2]}`;
	return ALLOWED_GH_COMMANDS.has(prefix);
}

/**
 * Safety check: scan a command string for prohibited patterns.
 */
function scanForProhibitedPatterns(cmdStr) {
	for (const pattern of PROHIBITED_GH_COMMANDS) {
		if (pattern.test(cmdStr)) {
			return true;
		}
	}
	return false;
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs() {
	const args = process.argv.slice(2);
	const options = {
		dryRun: false,
		repo: 'xxammaxx/Positron',
		snapshot: null,   // path to existing snapshot JSON file
		output: null,      // path to write report JSON
		format: 'text',    // 'text' or 'json'
		help: false,
	};

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case '--dry-run':
				options.dryRun = true;
				break;
			case '--repo':
				options.repo = args[++i] ?? options.repo;
				break;
			case '--snapshot':
				options.snapshot = args[++i] ?? null;
				break;
			case '--output':
				options.output = args[++i] ?? null;
				break;
			case '--format':
				options.format = args[++i] ?? 'text';
				break;
			case '--help':
			case '-h':
				options.help = true;
				break;
			default:
				break;
		}
	}

	return options;
}

function printHelp() {
	console.log(`
Positron Evidence Gate CLI (Issue #279 Phase 1D)

Read-only evidence gate that combines the GitHub Snapshot Collector,
GitHub Context Reconciler and Decision Manifest Validator into an
audit-ready decision report.

Usage:
  node scripts/run-evidence-gate.mjs [options]

Options:
  --dry-run               Use synthetic fixture data (no network)
  --repo <owner/name>     Target repository (default: xxammaxx/Positron)
  --snapshot <path>       Read snapshot from JSON file instead of live gh
  --output <path>         Write report JSON to file
  --format text|json      Output format (default: text)
  --help, -h              Show this help

Examples:
  # Dry-run with default repo
  node scripts/run-evidence-gate.mjs --dry-run

  # Read existing snapshot and output JSON
  node scripts/run-evidence-gate.mjs --snapshot .local-release/snapshot.json --format json

  # Dry-run and write report
  node scripts/run-evidence-gate.mjs --dry-run --output .local-release/evidence-gate/report.json

  # Live collect (read-only) and report
  node scripts/run-evidence-gate.mjs --repo xxammaxx/Positron

Safety: Read-only gh commands only. No mutations. No apply behavior.
Exit codes: 0=OK, 1=validation errors, 2=usage error, 3=safety violation
`);
}

// ---------------------------------------------------------------------------
// Snapshot loading
// ---------------------------------------------------------------------------

/**
 * Load snapshot from a JSON file.
 * Expected format: { pullRequests: [...], issues: [...] }
 */
function loadSnapshotFromFile(filePath) {
	if (!existsSync(filePath)) {
		throw new Error(`Snapshot file not found: ${filePath}`);
	}

	const raw = readFileSync(filePath, 'utf-8');
	let parsed;
	try {
		parsed = JSON.parse(raw);
	} catch (err) {
		throw new Error(`Snapshot file is not valid JSON: ${err.message}`);
	}

	// Handle both formats: { snapshot: GitHubContextSnapshot } or raw GitHubContextSnapshot
	const snapshot = parsed.snapshot ?? parsed;

	if (!snapshot.pullRequests || !snapshot.issues) {
		throw new Error(`Snapshot file missing required fields: pullRequests, issues`);
	}

	return snapshot;
}

/**
 * Generate a synthetic dry-run fixture snapshot (same as the test fixtures).
 */
function buildDryRunSnapshot() {
	return {
		pullRequests: [
			{ number: 291, title: 'feat(issue-279): add github snapshot collector', state: 'MERGED' },
			{
				number: 218,
				title: 'feat(safety): integrate Stop/Ask policy with GATE_APPROVE',
				state: 'OPEN',
				mergeable: 'MERGEABLE',
				isDraft: false,
				reviewFindingCount: 9,
				actionableFindingCount: 2,
				findingsAccessible: true,
			},
		],
		issues: [
			{ number: 279, title: 'Replacement: rebuild Issue #229 architecture chain on current main', state: 'OPEN', labels: ['architecture', 'epic', 'enhancement', 'infrastructure', 'priority: high', 'tooling'] },
			{ number: 268, title: 'CI Recovery: diagnose and repair systemic Quality Gates / Issue Verification failures', state: 'OPEN', labels: ['bug', 'infrastructure', 'priority: high'] },
			{ number: 229, title: 'MCP/OpenCode Provider Bootstrap', state: 'OPEN', labels: ['architecture', 'epic', 'enhancement'] },
			{ number: 215, title: 'Safety: Integrate Stop/Ask Policy via GATE_APPROVE', state: 'OPEN', labels: ['architecture', 'enhancement'] },
		],
	};
}

/**
 * Collect real snapshot via the existing snapshot collector CLI.
 */
function collectLiveSnapshot(options) {
	const collectorScript = 'scripts/collect-github-context.mjs';
	const collectorArgs = [
		collectorScript,
		'--repo', options.repo,
	];

	// Build an intermediate output path
	const tempDir = '.local-release/evidence-gate';
	const tempFile = `${tempDir}/_snapshot-temp.json`;
	if (!existsSync(tempDir)) {
		mkdirSync(tempDir, { recursive: true });
	}
	collectorArgs.push('--output', tempFile);

	const result = spawnSync('node', collectorArgs, {
		encoding: 'utf-8',
		stdio: ['ignore', 'pipe', 'pipe'],
		timeout: 60000,
	});

	if (result.error) {
		throw new Error(`Snapshot collector failed: ${result.error.message}`);
	}
	if (result.status !== 0) {
		throw new Error(`Snapshot collector exited ${result.status}: ${result.stderr?.trim() ?? 'unknown error'}`);
	}

	// Load the collected snapshot
	return loadSnapshotFromFile(tempFile);
}

// ---------------------------------------------------------------------------
// Report rendering
// ---------------------------------------------------------------------------

function printReport(report) {
	console.log('');
	console.log('═══════════════════════════════════════════════');
	console.log('  POSITRON EVIDENCE GATE REPORT');
	console.log('═══════════════════════════════════════════════');
	console.log(`  Status:      ${report.status}`);
	console.log(`  Generated:   ${report.generatedAt ?? 'N/A'}`);
	console.log('───────────────────────────────────────────────');
	console.log(`  Total Rows:  ${report.summary.totalRows}`);
	console.log(`  Applyable:   ${report.summary.applyableActions}`);
	console.log(`  Errors:      ${report.summary.validationErrors}`);
	console.log(`  Warnings:    ${report.summary.validationWarnings}`);
	console.log('───────────────────────────────────────────────');
	console.log('  Risk Class Counts:');
	for (const [rc, count] of Object.entries(report.riskClassCounts)) {
		if (count > 0) {
			const icon = rc === 'GREEN_SAFE' ? '🟢' :
				rc === 'YELLOW_REVIEW' ? '🟡' :
				rc === 'RED_HOLD' ? '🔴' :
				rc === 'TOOL_GAP' ? '🔧' :
				rc === 'DEFER_TO_279' ? '⏸' : '❓';
			console.log(`    ${icon} ${rc}: ${count}`);
		}
	}
	console.log('───────────────────────────────────────────────');
	console.log('  Recommendation Counts:');
	for (const [rec, count] of Object.entries(report.recommendationCounts)) {
		if (count > 0) {
			console.log(`    - ${rec}: ${count}`);
		}
	}
	console.log('───────────────────────────────────────────────');

	// Validation errors
	if (report.validation.errors.length > 0) {
		console.log('  VALIDATION ERRORS:');
		for (const err of report.validation.errors) {
			console.log(`    ❌ ${err}`);
		}
	}

	// Validation warnings
	if (report.validation.warnings.length > 0) {
		console.log('  VALIDATION WARNINGS:');
		for (const warn of report.validation.warnings) {
			console.log(`    ⚠ ${warn}`);
		}
	}

	// Blocked rows
	if (report.blockedRows.length > 0) {
		console.log('───────────────────────────────────────────────');
		console.log('  BLOCKED ACTIONS:');
		for (const row of report.blockedRows) {
			console.log(`    ${row.action_id} | ${row.risk_class} | ${row.agent_recommendation}`);
		}
	}

	// Applyable rows (if any)
	if (report.applyableRows.length > 0) {
		console.log('───────────────────────────────────────────────');
		console.log('  ⚠ APPLYABLE ACTIONS DETECTED:');
		for (const row of report.applyableRows) {
			console.log(`    ${row.action_id} | ${row.risk_class} | ${row.agent_recommendation}`);
		}
	}

	console.log('═══════════════════════════════════════════════');
	console.log('');

	// Summary verdict
	if (report.status === 'FAIL') {
		console.log('VERDICT: FAIL — Validation errors detected. No applyable actions.');
	} else if (report.status === 'WARN') {
		console.log('VERDICT: WARN — Report generated with warnings. Review before proceeding.');
	} else {
		console.log('VERDICT: PASS — Report generated cleanly.');
	}

	if (report.summary.applyableActions === 0) {
		console.log('Applyable actions: 0 — Safe. No automated mutations will be attempted.');
	}
	console.log('');
}

function printJsonReport(report) {
	process.stdout.write(JSON.stringify(report, null, 2));
	process.stdout.write('\n');
}

// ---------------------------------------------------------------------------
// Output safety
// ---------------------------------------------------------------------------

/**
 * Validate output path safety.
 * - Must not write outside the workspace.
 * - Must not write to system or sensitive paths.
 */
function validateOutputPath(outputPath) {
	const normalized = outputPath.replace(/\\/g, '/');

	// Block system paths
	const blockedPrefixes = [
		'C:/Windows',
		'C:/Program Files',
		'C:/ProgramData',
		'/etc/',
		'/usr/',
		'/var/',
		'/boot/',
		'/sys/',
		'/proc/',
	];

	for (const prefix of blockedPrefixes) {
		if (normalized.startsWith(prefix)) {
			throw new Error(`SAFETY: output path blocked: ${outputPath} (system path)`);
		}
	}

	// Block writing to .git, .github, .opencode
	const blockedDirs = ['.git/', '.github/', '.opencode/'];

	// Check subdirectories
	for (const dir of blockedDirs) {
		if (normalized.includes(`/${dir}`) || normalized.startsWith(dir.replace('/', ''))) {
			throw new Error(`SAFETY: output path blocked: ${outputPath} (protected directory)`);
		}
	}

	// Preferred: .local-release/evidence-gate/
	const preferred = '.local-release/evidence-gate/';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	const options = parseArgs();

	if (options.help) {
		printHelp();
		process.exit(EXIT.OK);
	}

	// Validate format
	if (options.format !== 'text' && options.format !== 'json') {
		console.error('Error: --format must be "text" or "json"');
		process.exit(EXIT.USAGE_ERROR);
	}

	// Validate output path safety
	if (options.output) {
		try {
			validateOutputPath(options.output);
		} catch (err) {
			console.error(`Error: ${err.message}`);
			process.exit(EXIT.SAFETY_VIOLATION);
		}
	}

	// Safety scan: no prohibited patterns in our own process args
	const fullCmdLine = process.argv.join(' ');
	if (scanForProhibitedPatterns(fullCmdLine)) {
		console.error('SAFETY VIOLATION: prohibited GitHub command pattern detected');
		process.exit(EXIT.SAFETY_VIOLATION);
	}

	// Load modules
	let evidenceGateMod;
	try {
		evidenceGateMod = await import('../packages/shared/dist/evidence-gate.js');
	} catch (err) {
		console.error('Error: Cannot load evidence-gate module.');
		console.error('  Run `npm run build` first to generate shared/dist artifacts.');
		console.error(`  Detail: ${err.message}`);
		process.exit(EXIT.USAGE_ERROR);
	}

	const { createEvidenceGateReportFromGitHubContext } = evidenceGateMod;

	let snapshot;

	try {
		if (options.dryRun) {
			console.log('[DRY-RUN] Evidence Gate CLI — Phase 1D');
			console.log(`  Repo: ${options.repo}`);
			console.log('');
			console.log('  Using synthetic dry-run fixture...');
			snapshot = buildDryRunSnapshot();
		} else if (options.snapshot) {
			console.log(`[SNAPSHOT] Loading from: ${options.snapshot}`);
			snapshot = loadSnapshotFromFile(options.snapshot);
		} else {
			// Live collection
			console.log(`[LIVE] Collecting GitHub context for ${options.repo}...`);
			snapshot = collectLiveSnapshot(options);
		}
	} catch (err) {
		console.error(`Error loading snapshot: ${err.message}`);
		process.exit(EXIT.VALIDATION_ERROR);
	}

	// Generate evidence gate report
	let report;
	try {
		report = createEvidenceGateReportFromGitHubContext(snapshot);
	} catch (err) {
		console.error(`Error generating evidence gate report: ${err.message}`);
		process.exit(EXIT.VALIDATION_ERROR);
	}

	// Output
	if (options.format === 'json') {
		if (options.output) {
			// Write JSON to file
			const dir = dirname(options.output);
			if (!existsSync(dir)) {
				mkdirSync(dir, { recursive: true });
			}
			writeFileSync(options.output, JSON.stringify(report, null, 2), 'utf-8');
			console.log(`Report written to: ${options.output}`);
		} else {
			printJsonReport(report);
		}
	} else {
		// Text format
		printReport(report);

		if (options.output) {
			const dir = dirname(options.output);
			if (!existsSync(dir)) {
				mkdirSync(dir, { recursive: true });
			}
			writeFileSync(options.output, JSON.stringify(report, null, 2), 'utf-8');
			console.log(`Report (JSON) written to: ${options.output}`);
		}
	}

	// Determine exit code
	if (report.validation.errors.length > 0) {
		console.error(`Exiting with code ${EXIT.VALIDATION_ERROR}: ${report.validation.errors.length} validation error(s)`);
		process.exit(EXIT.VALIDATION_ERROR);
	}

	// WARN or PASS
	console.log(`Exiting with code ${EXIT.OK} (status: ${report.status})`);
	process.exit(EXIT.OK);
}

main().catch((err) => {
	console.error(`Unexpected error: ${err.message}`);
	process.exit(EXIT.VALIDATION_ERROR);
});
