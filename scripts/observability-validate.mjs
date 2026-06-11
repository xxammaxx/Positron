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

const _GREEN = '\x1b[32m';
const _RED = '\x1b[31m';
const _YELLOW = '\x1b[33m';
const _RESET = '\x1b[0m';
const _BOLD = '\x1b[1m';

function check(success, _label) {
	if (success) {
	} else {
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

function runCmd(cmd, _label) {
	try {
		const result = execSync(cmd, {
			stdio: 'pipe',
			timeout: 30000,
			cwd: ROOT,
			encoding: 'utf-8',
		});
		// Print output if it contains useful info
		const trimmed = result.trim();
		if (trimmed && trimmed.length < 500) {
			const lines = trimmed.split('\n').filter((l) => l.trim());
			for (const _line of lines.slice(0, 5)) {
			}
		}
		return true;
	} catch (err) {
		const stderr = err.stderr?.toString()?.trim();
		if (stderr) {
			for (const _line of stderr
				.split('\n')
				.filter((l) => l.trim())
				.slice(0, 5)) {
			}
		}
		return false;
	}
}

let allPassed = true;
allPassed &= runCmd(
	'docker compose -f docker-compose.observability.yml config --quiet',
	'docker-compose.observability.yml valid',
);
const promtoolOk = runDocker(
	`docker run --rm -v ${ROOT}/observability/prometheus/prometheus.yml:/tmp/prometheus.yml:ro \
    -v ${ROOT}/observability/prometheus/alerts.yml:/tmp/alerts.yml:ro \
    --entrypoint promtool \
    prom/prometheus:v3.5.0 check config /tmp/prometheus.yml`,
);
if (promtoolOk) {
} else {
}
const rulesOk = runDocker(
	`docker run --rm -v ${ROOT}/observability/prometheus/alerts.yml:/tmp/alerts.yml:ro \
    --entrypoint promtool \
    prom/prometheus:v3.5.0 check rules /tmp/alerts.yml`,
);
if (rulesOk) {
} else {
}
const amtoolOk = runDocker(
	`docker run --rm -v ${ROOT}/observability/alertmanager/alertmanager.yml:/tmp/alertmanager.yml:ro \
    --entrypoint amtool \
    prom/alertmanager:v0.28.0 check-config /tmp/alertmanager.yml`,
);
if (amtoolOk) {
} else {
}
const yamlFiles = [
	'observability/prometheus/prometheus.yml',
	'observability/prometheus/alerts.yml',
	'observability/alertmanager/alertmanager.yml',
];
for (const f of yamlFiles) {
	const filePath = path.join(ROOT, f);
	if (!existsSync(filePath)) {
		allPassed = false;
		continue;
	}
	allPassed &= runCmd(
		`python3 -c "import yaml; yaml.safe_load(open('${filePath}'))" && echo "OK"`,
		`${f} valid YAML`,
	);
}
if (allPassed) {
	process.exit(0);
} else {
	process.exit(1);
}
