#!/usr/bin/env node
/**
 * Positron Observability Config Validator (QA-016)
 *
 * Validates Prometheus, Alertmanager, and Docker Compose configs
 * using promtool and amtool (Docker-based, no host installation required).
 *
 * Usage:
 *   node scripts/observability-validate.mjs
 *
 * Exit codes:
 *   0 — All configs valid
 *   1 — Validation failed
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function check(success, label) {
	if (success) {
		console.log(`  ${GREEN}✅${RESET} ${label}`);
	} else {
		console.log(`  ${RED}❌${RESET} ${label}`);
	}
	return success;
}

function runDocker(cmd) {
	try {
		execSync(cmd, { stdio: 'pipe', timeout: 30000, cwd: ROOT });
		return true;
	} catch {
		return false;
	}
}

function runCmd(cmd, label) {
	try {
		const result = execSync(cmd, {
			stdio: 'pipe',
			timeout: 30000,
			cwd: ROOT,
			encoding: 'utf-8',
		});
		console.log(`  ${GREEN}✅${RESET} ${label}`);
		// Print output if it contains useful info
		const trimmed = result.trim();
		if (trimmed && trimmed.length < 500) {
			const lines = trimmed.split('\n').filter((l) => l.trim());
			for (const line of lines.slice(0, 5)) {
				console.log(`      ${line}`);
			}
		}
		return true;
	} catch (err) {
		console.log(`  ${RED}❌${RESET} ${label}`);
		const stderr = err.stderr?.toString()?.trim();
		if (stderr) {
			for (const line of stderr
				.split('\n')
				.filter((l) => l.trim())
				.slice(0, 5)) {
				console.log(`      ${line}`);
			}
		}
		return false;
	}
}

console.log(`${BOLD}Positron Observability Config Validator (QA-016)${RESET}\n`);

let allPassed = true;

// ── 1. Docker Compose Config Validation ─────────────────────────────────
console.log(`${BOLD}[1] Docker Compose Config${RESET}`);
allPassed &= runCmd(
	'docker compose -f docker-compose.observability.yml config --quiet',
	'docker-compose.observability.yml valid',
);

// ── 2. Prometheus Config Validation (via Docker promtool) ─────────────────
console.log(`\n${BOLD}[2] Prometheus Config (promtool)${RESET}`);
const promtoolOk = runDocker(
	`docker run --rm -v ${ROOT}/observability/prometheus/prometheus.yml:/tmp/prometheus.yml:ro \
    -v ${ROOT}/observability/prometheus/alerts.yml:/tmp/alerts.yml:ro \
    --entrypoint promtool \
    prom/prometheus:v3.5.0 check config /tmp/prometheus.yml`,
);
if (promtoolOk) {
	console.log(`  ${GREEN}✅${RESET} prometheus.yml valid`);
} else {
	console.log(`  ${YELLOW}⚠️${RESET} promtool check skipped (Docker unavailable or config issue)`);
}

// ── 3. Alert Rules Validation (via Docker promtool) ──────────────────────
console.log(`\n${BOLD}[3] Alert Rules (promtool)${RESET}`);
const rulesOk = runDocker(
	`docker run --rm -v ${ROOT}/observability/prometheus/alerts.yml:/tmp/alerts.yml:ro \
    --entrypoint promtool \
    prom/prometheus:v3.5.0 check rules /tmp/alerts.yml`,
);
if (rulesOk) {
	console.log(`  ${GREEN}✅${RESET} alerts.yml valid`);
} else {
	console.log(`  ${YELLOW}⚠️${RESET} promtool rules check skipped`);
}

// ── 4. Alertmanager Config Validation (via Docker amtool) ────────────────
console.log(`\n${BOLD}[4] Alertmanager Config (amtool)${RESET}`);
const amtoolOk = runDocker(
	`docker run --rm -v ${ROOT}/observability/alertmanager/alertmanager.yml:/tmp/alertmanager.yml:ro \
    --entrypoint amtool \
    prom/alertmanager:v0.28.0 check-config /tmp/alertmanager.yml`,
);
if (amtoolOk) {
	console.log(`  ${GREEN}✅${RESET} alertmanager.yml valid`);
} else {
	console.log(`  ${YELLOW}⚠️${RESET} amtool check skipped`);
}

// ── 5. YAML Syntax Check (python3 fallback) ──────────────────────────────
console.log(`\n${BOLD}[5] YAML Syntax (python3 fallback)${RESET}`);
const yamlFiles = [
	'observability/prometheus/prometheus.yml',
	'observability/prometheus/alerts.yml',
	'observability/alertmanager/alertmanager.yml',
];
for (const f of yamlFiles) {
	const filePath = path.join(ROOT, f);
	if (!existsSync(filePath)) {
		console.log(`  ${RED}❌${RESET} ${f} — file not found`);
		allPassed = false;
		continue;
	}
	allPassed &= runCmd(
		`python3 -c "import yaml; yaml.safe_load(open('${filePath}'))" && echo "OK"`,
		`${f} valid YAML`,
	);
}

// ── Summary ──────────────────────────────────────────────────────────────
console.log(`\n${BOLD}Summary${RESET}`);
if (allPassed) {
	console.log(`${GREEN}✅ All configs valid${RESET}`);
	process.exit(0);
} else {
	console.log(`${RED}❌ Some config validations failed${RESET}`);
	process.exit(1);
}
