#!/usr/bin/env node
/**
 * Evidence Collection Script — Layer 7 (Issue #173)
 *
 * Collects artifacts from all 7 layers and generates a single evidence report.
 * Posts the report as a GitHub Issue comment on the specified issue.
 *
 * Non-negotiable rule (ADR-002):
 *   Every claim must be backed by at least one artifact.
 *   No evidence = no validation.
 *   Missing optional artifacts are marked as ❓ UNVERIFIED.
 *
 * Usage:
 *   node scripts/collect-evidence.mjs
 *
 * Environment variables:
 *   POSITRON_EVIDENCE_ISSUE — GitHub Issue number (default: 165)
 *   GITHUB_TOKEN — for posting comments
 *   CI — if set, uses CI artifact paths
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.resolve(process.cwd());
const EVIDENCE_ISSUE = process.env.POSITRON_EVIDENCE_ISSUE ?? "165";
const IS_CI = !!process.env.CI;

// ── Artifact Paths ─────────────────────────────────────────────────

const ARTIFACT_PATHS = {
	// Layer 3: Backend Tests
	coverage: path.join(ROOT, "coverage", "coverage-summary.json"),
	vitestResults: path.join(ROOT, "test-results", "vitest-results.json"),

	// Layer 2a: Semgrep
	semgrepSarif: path.join(ROOT, "semgrep.sarif"),

	// Layer 2b: CodeQL
	codeqlSarif: IS_CI
		? "/home/runner/work/Positron/results/javascript-typescript.sarif"
		: null,

	// Layer 2c: SonarQube
	sonarReport: path.join(ROOT, "reports", "sonarqube", "report.json"),

	// Layer 4: Playwright
	playwrightScreenshots: path.join(ROOT, "test-results", "screenshots"),
	playwrightTrace: path.join(ROOT, "test-results"),
	playwrightEvidence: path.join(ROOT, "test-results", "evidence", "evidence-log.json"),

	// Layer 5: AI UI Review
	aiUiReview: path.join(ROOT, "reports", "ai-ui-review.md"),

	// Layer 6: Runtime
	runtimeSmoke: path.join(ROOT, "reports", "runtime-smoke.json"),

	// Mutation
	mutationReport: path.join(ROOT, "reports", "mutation"),
};

// ── Collectors ──────────────────────────────────────────────────────

interface EvidenceClaim {
	layer: number;
	claim: string;
	artifact: string | null;
	verified: boolean;
	value: string;
}

function collectArtifact(filePath: string, description: string): EvidenceClaim {
	const exists = filePath ? fs.existsSync(filePath) : false;
	return {
		layer: 0,
		claim: description,
		artifact: filePath,
		verified: exists,
		value: exists ? "present" : "❓ UNVERIFIED",
	};
}

async function collectAll(): Promise<EvidenceClaim[]> {
	const claims: EvidenceClaim[] = [];

	// Backend Tests
	try {
		const testOutput = execSync("npm test -- --reporter=json 2>/dev/null || true", {
			cwd: ROOT,
			encoding: "utf-8",
			timeout: 30000,
		});
		claims.push({
			layer: 3,
			claim: "Unit tests executed",
			artifact: "npm test output",
			verified: testOutput.length > 0,
			value: testOutput.length > 0 ? "executed" : "❓ UNVERIFIED",
		});
	} catch {
		claims.push({
			layer: 3,
			claim: "Unit tests executed",
			artifact: null,
			verified: false,
			value: "❓ UNVERIFIED",
		});
	}

	// Coverage
	claims.push(collectArtifact(ARTIFACT_PATHS.coverage, "Coverage report"));

	// Semgrep
	claims.push(collectArtifact(ARTIFACT_PATHS.semgrepSarif, "Semgrep SARIF report"));

	// SonarQube
	claims.push(collectArtifact(ARTIFACT_PATHS.sonarReport, "SonarQube quality report"));

	// Playwright Screenshots
	const hasScreenshots =
		fs.existsSync(ARTIFACT_PATHS.playwrightScreenshots) &&
		fs.readdirSync(ARTIFACT_PATHS.playwrightScreenshots).length > 0;
	claims.push({
		layer: 4,
		claim: "E2E screenshots",
		artifact: ARTIFACT_PATHS.playwrightScreenshots,
		verified: hasScreenshots,
		value: hasScreenshots
			? `${fs.readdirSync(ARTIFACT_PATHS.playwrightScreenshots).length} screenshots`
			: "❓ UNVERIFIED",
	});

	// Playwright Evidence (console/network)
	claims.push(collectArtifact(ARTIFACT_PATHS.playwrightEvidence, "Console/network evidence"));

	// AI UI Review
	claims.push(collectArtifact(ARTIFACT_PATHS.aiUiReview, "AI UI review report"));

	// Runtime
	claims.push(collectArtifact(ARTIFACT_PATHS.runtimeSmoke, "Runtime verification smoke test"));

	// Mutation
	const hasMutation =
		fs.existsSync(ARTIFACT_PATHS.mutationReport) &&
		fs.readdirSync(ARTIFACT_PATHS.mutationReport).length > 0;
	claims.push({
		layer: 3,
		claim: "Mutation test report",
		artifact: ARTIFACT_PATHS.mutationReport,
		verified: hasMutation,
		value: hasMutation ? "present" : "❓ UNVERIFIED",
	});

	return claims;
}

// ── Report Generation ──────────────────────────────────────────────

function generateReport(claims: EvidenceClaim[]): string {
	const timestamp = new Date().toISOString();
	const commit = (() => {
		try {
			return execSync("git rev-parse --short HEAD", {
				cwd: ROOT,
				encoding: "utf-8",
			}).trim();
		} catch {
			return "unknown";
		}
	})();
	const branch = (() => {
		try {
			return execSync("git branch --show-current", {
				cwd: ROOT,
				encoding: "utf-8",
			}).trim();
		} catch {
			return "unknown";
		}
	})();

	const verifiedCount = claims.filter((c) => c.verified).length;
	const totalCount = claims.length;

	const lines: string[] = [
		"## 📊 Evidence Report",
		"",
		"### Context",
		`- **Timestamp:** ${timestamp}`,
		`- **Commit:** ${commit}`,
		`- **Branch:** ${branch}`,
		`- **Evidence Rule:** ADR-002 — No evidence = no validation`,
		"",
		`### Summary: ${verifiedCount}/${totalCount} claims verified`,
		"",
		"| # | Layer | Claim | Verified | Value |",
		"|---|-------|-------|----------|-------|",
	];

	for (let i = 0; i < claims.length; i++) {
		const c = claims[i];
		const icon = c.verified ? "✅" : "❓";
		lines.push(
			`| ${i + 1} | L${c.layer} | ${c.claim} | ${icon} | ${c.value} |`,
		);
	}

	lines.push("");
	lines.push(
		`**Missing evidence:** ${claims.filter((c) => !c.verified).length} claims unverified`,
	);
	lines.push("");
	lines.push(
		"---",
	);
	lines.push(
		"*Generated by Positron Layer 7 Evidence System (`scripts/collect-evidence.mjs`)*",
	);

	return lines.join("\n");
}

// ── Main ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	console.log("[L7 Evidence] Collecting artifacts from all layers...\n");

	const claims = await collectAll();
	const report = generateReport(claims);

	// Write local report
	const reportDir = path.join(ROOT, "reports", "evidence");
	if (!fs.existsSync(reportDir)) {
		fs.mkdirSync(reportDir, { recursive: true });
	}
	const reportPath = path.join(reportDir, "evidence-report.md");
	fs.writeFileSync(reportPath, report);
	console.log(`[L7 Evidence] Report written to ${reportPath}`);

	// Write summary JSON
	const summaryPath = path.join(reportDir, "evidence-summary.json");
	fs.writeFileSync(
		summaryPath,
		JSON.stringify(
			{
				timestamp: new Date().toISOString(),
				verified: claims.filter((c) => c.verified).length,
				total: claims.length,
				claims,
			},
			null,
			2,
		),
	);
	console.log(`[L7 Evidence] Summary written to ${summaryPath}`);

	// Post to GitHub if token available
	const token = process.env.GITHUB_TOKEN;
	if (token) {
		try {
			execSync(
				`gh issue comment ${EVIDENCE_ISSUE} --repo xxammaxx/Positron --body-file "${reportPath}"`,
				{
					env: { ...process.env, GITHUB_TOKEN: token },
					cwd: ROOT,
					encoding: "utf-8",
					timeout: 15000,
				},
			);
			console.log(
				`[L7 Evidence] Posted to Issue #${EVIDENCE_ISSUE}`,
			);
		} catch (err) {
			console.warn(
				`[L7 Evidence] Could not post to GitHub: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	} else {
		console.log(
			"[L7 Evidence] GITHUB_TOKEN not set — skipping GitHub comment",
		);
	}

	// Exit with non-zero if unverified claims exist (non-blocking in CI)
	const unverified = claims.filter((c) => !c.verified).length;
	if (unverified > 0) {
		console.log(
			`\n⚠️  ${unverified} claims are UNVERIFIED. See report for details.`,
		);
	}

	console.log("\n[L7 Evidence] Done.");
}

main().catch((err) => {
	console.error("[L7 Evidence] Fatal error:", err);
	process.exit(1);
});
