#!/usr/bin/env node

/**
 * SonarQube Quality Gate Check
 * Layer 2c (Issue #169)
 *
 * Polls the SonarQube API for project quality gate status and exits
 * with code 0 (PASS) or 1 (FAIL). Used as a CI merge gate.
 *
 * Environment:
 *   SONAR_HOST_URL — SonarQube instance URL (default: http://localhost:9000)
 *   SONAR_TOKEN    — SonarQube user token (required)
 *
 * Usage:
 *   node scripts/sonarqube-quality-gate.mjs
 *
 * Exit codes:
 *   0 — Quality Gate PASSED (OK status)
 *   1 — Quality Gate FAILED (ERROR status)
 *   2 — Configuration error (missing token, unreachable host)
 *   3 — Timeout waiting for analysis (task not complete after timeout)
 */

const SONAR_HOST_URL = process.env.SONAR_HOST_URL || "http://localhost:9000";
const SONAR_TOKEN = process.env.SONAR_TOKEN;
const PROJECT_KEY = "positron";

// Polling configuration
const MAX_POLL_ATTEMPTS = 30; // 30 * 10s = 5 minutes max
const POLL_INTERVAL_MS = 10_000; // 10 seconds
const TASK_TIMEOUT_MS = 300_000; // 5 minutes for analysis to complete

if (!SONAR_TOKEN) {
	console.error(
		"❌ SONAR_TOKEN environment variable is required for quality gate check.",
	);
	console.error("   Generate a token in SonarQube: My Account → Security → Generate Token");
	process.exit(2);
}

/**
 * Make an authenticated request to the SonarQube API.
 */
async function sonarApi(path) {
	const url = `${SONAR_HOST_URL}/api/${path}`;
	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${SONAR_TOKEN}`,
			Accept: "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(
			`SonarQube API error (${response.status}): ${url}`,
		);
	}

	return response.json();
}

/**
 * Poll the quality gate status until a final state is reached.
 */
async function checkQualityGate() {
	console.log(`[SonarQube] Checking quality gate for project "${PROJECT_KEY}"...`);

	try {
		const result = await sonarApi(
			`qualitygates/project_status?projectKey=${encodeURIComponent(PROJECT_KEY)}`,
		);

		const status = result.projectStatus?.status;

		if (!status) {
			console.warn(
				"[SonarQube] No project status returned. Has the project been analyzed?",
			);
			return { passed: false, reason: "NO_STATUS" };
		}

		const conditions = result.projectStatus?.conditions || [];
		const failedConditions = conditions.filter(
			(c) => c.status === "ERROR",
		);

		console.log(`[SonarQube] Quality Gate Status: ${status}`);
		console.log(
			`[SonarQube] Conditions: ${conditions.length} total, ${failedConditions.length} failed`,
		);

		for (const condition of failedConditions) {
			console.log(
				`  ❌ ${condition.metricKey}: ${condition.actualValue} (threshold: ${condition.errorThreshold})`,
			);
		}

		for (const condition of conditions.filter(
			(c) => c.status === "OK",
		)) {
			console.log(
				`  ✅ ${condition.metricKey}: ${condition.actualValue}`,
			);
		}

		return {
			passed: status === "OK",
			reason: status === "OK" ? "PASSED" : `FAILED: ${failedConditions.length} condition(s)`,
			conditions,
			failedConditions,
		};
	} catch (err) {
		return {
			passed: false,
			reason: `API_ERROR: ${err.message}`,
		};
	}
}

/**
 * Wait for the latest analysis task to complete.
 */
async function waitForAnalysisCompletion() {
	console.log("[SonarQube] Waiting for analysis to complete...");

	const startTime = Date.now();

	for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
		try {
			const tasks = await sonarApi(
				`ce/activity?component=${encodeURIComponent(PROJECT_KEY)}&type=REPORT&ps=1`,
			);

			const latestTask = tasks.tasks?.[0];

			if (!latestTask) {
				console.log(
					`  [${attempt}/${MAX_POLL_ATTEMPTS}] No tasks found yet...`,
				);
			} else if (latestTask.status === "SUCCESS") {
				console.log(
					`  ✅ Analysis completed in ${latestTask.executionTimeMs}ms`,
				);
				return true;
			} else if (latestTask.status === "FAILED") {
				console.error(
					`  ❌ Analysis failed: ${latestTask.errorMessage || "Unknown error"}`,
				);
				return false;
			} else {
				console.log(
					`  [${attempt}/${MAX_POLL_ATTEMPTS}] Status: ${latestTask.status}...`,
				);
			}
		} catch (err) {
			console.warn(`  [${attempt}/${MAX_POLL_ATTEMPTS}] Poll error: ${err.message}`);
		}

		if (Date.now() - startTime > TASK_TIMEOUT_MS) {
			console.error("❌ Timed out waiting for analysis to complete.");
			return false;
		}

		await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
	}

	console.error("❌ Max poll attempts reached without analysis completion.");
	return false;
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
	console.log(`[SonarQube] Host: ${SONAR_HOST_URL}`);
	console.log(`[SonarQube] Project: ${PROJECT_KEY}`);

	// Verify SonarQube is reachable
	try {
		const health = await sonarApi("system/health");
		console.log(
			`[SonarQube] System health: ${health.health || "unknown"}`,
		);
	} catch (err) {
		console.error(
			`❌ Cannot reach SonarQube at ${SONAR_HOST_URL}: ${err.message}`,
		);
		console.error(
			"   Ensure SonarQube is running: docker compose -f docker-compose.sonarqube.yml up -d",
		);
		process.exit(2);
	}

	// Wait for analysis to complete (if scanner just ran)
	const analysisReady = await waitForAnalysisCompletion();
	if (!analysisReady) {
		console.error("❌ Analysis did not complete successfully.");
		process.exit(3);
	}

	// Check quality gate
	const result = await checkQualityGate();

	if (result.passed) {
		console.log("\n✅ Quality Gate PASSED — all conditions OK");
		process.exit(0);
	} else {
		console.error(`\n❌ Quality Gate FAILED: ${result.reason}`);
		process.exit(1);
	}
}

main().catch((err) => {
	console.error(`❌ Unhandled error: ${err.message}`);
	process.exit(2);
});
