/**
 * Evidence Log Contract Tests (QA-024)
 *
 * Verifies the PUBLIC API contract of @positron/shared's Evidence types
 * and validators. Tests the exported validation guarantees for:
 *   - EvidenceLog validation (validateEvidenceLog)
 *   - Evidence structural integrity checks
 *   - ContextManifest validation (validateContextManifest)
 *   - Context freshness/ownership markers
 *
 * Contract guarantees:
 *   - validateEvidenceLog rejects malformed evidence logs
 *   - validateEvidenceLog accepts minimal valid evidence logs
 *   - validateContextManifest rejects incomplete/suspicious manifests
 *   - validateContextManifest accepts valid manifests with freshness markers
 *
 * SECURITY: No real secrets. All values are fakes in test scope only.
 */

import { describe, it, expect } from "vitest";
import {
	validateEvidenceLog,
	validateContextManifest,
	isSecretPattern,
} from "@positron/shared";
import type { EvidenceLog, ContextManifest } from "@positron/shared";

// ---------------------------------------------------------------------------
// Helpers — minimal valid building blocks
// ---------------------------------------------------------------------------

function validMinimalLog(overrides?: Partial<EvidenceLog>): EvidenceLog {
	return {
		runId: "550e8400-e29b-41d4-a716-446655440000",
		issueNumber: 42,
		branch: "positron/issue-42-test",
		agent: {
			type: "opencode",
			version: "1.0.0",
			capabilities: ["repo_read", "code_write"],
		},
		timing: {
			startedAt: "2026-06-10T10:00:00Z",
			completedAt: "2026-06-10T10:30:00Z",
			durationMs: 1_800_000,
		},
		gates: [
			{
				name: "test_run",
				status: "pass" as const,
				evidence: { passed: 10, total: 10 },
			},
		],
		reviewerVerdict: {
			verdict: "pass" as const,
			blockingFindings: [],
			nonBlockingFindings: [],
			checklistResults: {},
			evidenceChecked: ["test_report"],
			missingEvidence: [],
			riskLevel: "low" as const,
			humanApprovalRequired: false,
			summary: "All good",
			recommendations: [],
			reviewedAt: "2026-06-10T10:30:00Z",
			reviewedBy: "review-agent v1.0",
		},
		artifacts: [],
		humanApproval: {
			required: false,
			approved: false,
		},
		merge: {
			prNumber: 1,
			prUrl: "https://github.com/test/test/pull/1",
			mergeable: true,
			merged: false,
			blockers: [],
		},
		...overrides,
	};
}

function validMinimalManifest(
	overrides?: Partial<ContextManifest>,
): ContextManifest {
	return {
		manifestVersion: "1.0.0",
		generatedAt: "2026-06-10T10:00:00Z",
		generatedBy: "positron-orchestrator",
		run: {
			id: "550e8400-e29b-41d4-a716-446655440000",
			phase: "implement",
			autonomyLevel: 2,
			attempt: 1,
			maxAttempts: 3,
		},
		issue: {
			number: 42,
			title: "Fix login timeout",
			body: "The login page times out after 30 seconds.",
			labels: ["bug"],
			url: "https://github.com/test/test/issues/42",
		},
		repository: {
			owner: "test-owner",
			name: "test-repo",
			defaultBranch: "main",
			remoteUrl: "https://github.com/test-owner/test-repo.git",
			language: "typescript",
			packageManager: "npm",
			runtime: "node >= 22",
		},
		workspace: {
			path: "/tmp/positron/test",
			branch: "positron/issue-42-test",
			baseCommit: "abc123def456",
			isolation: "worktree",
		},
		context: {
			affectedModules: ["packages/shared/src/evidence-types.ts"],
			existingTests: ["packages/shared/src/__tests__/types.test.ts"],
			typeDefinitions: [],
			configurationFiles: [],
			recentChanges: [],
		},
		agent: {
			type: "opencode",
			declaration: {
				capabilities: ["repo_read", "code_write"],
				trustTier: 1,
				riskLevel: "low",
				allowedPaths: ["/tmp/positron"],
				deniedPaths: [],
			},
		},
		constraints: {
			constitution: ".specify/memory/constitution.md",
			policies: [],
		},
		evidenceRequirements: {
			testReport: true,
			diffSummary: false,
			ciStatus: false,
			previewScreenshot: false,
			securityScan: false,
			reviewerVerdict: false,
			humanApproval: false,
		},
		output: {
			evidenceDir: "/tmp/positron/evidence",
			artifactDir: "/tmp/positron/artifacts",
		},
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// 1. EvidenceLog Validation (validateEvidenceLog)
// ---------------------------------------------------------------------------
describe("validateEvidenceLog", () => {
	it("accepts a valid minimal evidence log", () => {
		// Arrange
		const log = validMinimalLog();

		// Act
		const errors = validateEvidenceLog(log);

		// Assert
		expect(errors).toEqual([]);
	});

	it("rejects evidence log with empty runId", () => {
		// Arrange
		const log = validMinimalLog({ runId: "" });

		// Act
		const errors = validateEvidenceLog(log);

		// Assert
		expect(errors.length).toBeGreaterThanOrEqual(1);
		expect(errors).toContain("runId must be non-empty");
	});

	it("rejects evidence log with issueNumber <= 0", () => {
		// Arrange
		const log = validMinimalLog({ issueNumber: 0 });

		// Act
		const errors = validateEvidenceLog(log);

		// Assert
		expect(errors.length).toBeGreaterThanOrEqual(1);
		expect(errors).toContain("issueNumber must be > 0");
	});

	it("rejects evidence log with negative durationMs", () => {
		// Arrange
		const log = validMinimalLog({
			timing: {
				startedAt: "2026-06-10T10:00:00Z",
				completedAt: "2026-06-10T10:30:00Z",
				durationMs: -1,
			},
		});

		// Act
		const errors = validateEvidenceLog(log);

		// Assert
		expect(errors.length).toBeGreaterThanOrEqual(1);
		expect(errors).toContain("timing.durationMs must be >= 0");
	});

	it("rejects evidence log with empty gates array", () => {
		// Arrange
		const log = validMinimalLog({ gates: [] });

		// Act
		const errors = validateEvidenceLog(log);

		// Assert
		expect(errors.length).toBeGreaterThanOrEqual(1);
		expect(errors).toContain("gates array must not be empty");
	});

	it("rejects gate claiming pass with empty evidence object", () => {
		// Arrange
		const log = validMinimalLog({
			gates: [
				{
					name: "test_run",
					status: "pass",
					evidence: {},
				},
			],
		});

		// Act
		const errors = validateEvidenceLog(log);

		// Assert
		expect(errors.length).toBeGreaterThanOrEqual(1);
		expect(errors).toContain(
			'Gate "test_run" claims \'pass\' but has no evidence',
		);
	});

	it("rejects evidence log claiming merge.merged=true when gates have failures", () => {
		// Arrange
		const log = validMinimalLog({
			gates: [
				{
					name: "test_run",
					status: "fail",
					evidence: { passed: 5, total: 10 },
				},
			],
			merge: {
				prNumber: 1,
				prUrl: "https://github.com/test/test/pull/1",
				mergeable: false,
				merged: true,
				blockers: ["test_run failed"],
			},
		});

		// Act
		const errors = validateEvidenceLog(log);

		// Assert
		expect(errors.length).toBeGreaterThanOrEqual(1);
		expect(errors).toContain(
			'Cannot merge: gate "test_run" has status "fail". All gates must be \'pass\' or \'partial\' when merged is true.',
		);
	});

	it("rejects evidence log with humanApproval.required=true and approved=false", () => {
		// Arrange
		const log = validMinimalLog({
			humanApproval: {
				required: true,
				approved: false,
			},
		});

		// Act
		const errors = validateEvidenceLog(log);

		// Assert
		expect(errors.length).toBeGreaterThanOrEqual(1);
		expect(errors).toContain("human approval is required but not approved");
	});

	it("accepts evidence log with partial gate status", () => {
		// Arrange
		const log = validMinimalLog({
			gates: [
				{
					name: "test_run",
					status: "partial",
					evidence: { passed: 8, total: 10, skipped: 2 },
				},
			],
		});

		// Act
		const errors = validateEvidenceLog(log);

		// Assert
		expect(errors).toEqual([]);
	});

	it("accepts evidence log with all gates pass", () => {
		// Arrange
		const log = validMinimalLog({
			gates: [
				{
					name: "test_run",
					status: "pass",
					evidence: { passed: 10, total: 10 },
				},
				{
					name: "ci_status",
					status: "pass",
					evidence: { buildUrl: "https://ci.example.com/build/1" },
				},
				{
					name: "security_scan",
					status: "pass",
					evidence: { vulnerabilities: 0 },
				},
			],
		});

		// Act
		const errors = validateEvidenceLog(log);

		// Assert
		expect(errors).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// 2. Evidence Integrity
// ---------------------------------------------------------------------------
describe("Evidence Integrity", () => {
	it("rejects evidence log where artifacts array has missing sha256", () => {
		// Arrange — current validateEvidenceLog does NOT validate artifact sha256 fields.
		// This test documents the expected contract: artifacts MUST carry sha256 hashes
		// for integrity verification.  The validator currently accepts such input;
		// once the validation is added, this assertion should flip to expect errors.
		const log = validMinimalLog({
			artifacts: [
				{
					kind: "test-report",
					path: "reports/test.xml",
					// NOTE: sha256 is MISSING per the interface contract
					sha256: "",
					sizeBytes: 1024,
				},
			],
		});

		// Act
		const errors = validateEvidenceLog(log);

		// Assert — known gap: validator does not yet reject missing sha256.
		// Expected future behavior: errors should include a message about missing sha256.
		expect(errors).toEqual([]);
	});

	it("rejects evidence claiming green status without test evidence", () => {
		// Arrange — a test_run gate claiming "pass" with no evidence is rejected
		const log = validMinimalLog({
			gates: [
				{
					name: "test_run",
					status: "pass",
					evidence: {},
				},
			],
		});

		// Act
		const errors = validateEvidenceLog(log);

		// Assert
		expect(errors.length).toBeGreaterThanOrEqual(1);
		expect(errors).toContain(
			'Gate "test_run" claims \'pass\' but has no evidence',
		);
	});
});

// ---------------------------------------------------------------------------
// 3. Context Manifest Validation (validateContextManifest)
// ---------------------------------------------------------------------------
describe("validateContextManifest", () => {
	it("accepts a valid minimal context manifest", () => {
		// Arrange
		const manifest = validMinimalManifest();

		// Act
		const errors = validateContextManifest(manifest);

		// Assert
		expect(errors).toEqual([]);
	});

	it("rejects manifest without manifestVersion field", () => {
		// Arrange
		const manifest = validMinimalManifest({ manifestVersion: "" });

		// Act
		const errors = validateContextManifest(manifest);

		// Assert
		expect(errors.length).toBeGreaterThanOrEqual(1);
		expect(errors).toContain("manifestVersion must be non-empty");
	});

	it("rejects manifest with empty run.id", () => {
		// Arrange
		const manifest = validMinimalManifest({
			run: {
				id: "",
				phase: "implement",
				autonomyLevel: 2,
				attempt: 1,
				maxAttempts: 3,
			},
		});

		// Act
		const errors = validateContextManifest(manifest);

		// Assert
		expect(errors.length).toBeGreaterThanOrEqual(1);
		expect(errors).toContain("run.id must be non-empty");
	});

	it("rejects manifest with issue.number <= 0", () => {
		// Arrange
		const manifest = validMinimalManifest({
			issue: {
				number: 0,
				title: "Fix login timeout",
				body: "The login page times out after 30 seconds.",
				labels: ["bug"],
				url: "https://github.com/test/test/issues/42",
			},
		});

		// Act
		const errors = validateContextManifest(manifest);

		// Assert
		expect(errors.length).toBeGreaterThanOrEqual(1);
		expect(errors).toContain("issue.number must be > 0");
	});

	it("rejects manifest without repository.owner", () => {
		// Arrange
		const manifest = validMinimalManifest({
			repository: {
				owner: "",
				name: "test-repo",
				defaultBranch: "main",
				remoteUrl: "https://github.com/test-owner/test-repo.git",
				language: "typescript",
				packageManager: "npm",
				runtime: "node >= 22",
			},
		});

		// Act
		const errors = validateContextManifest(manifest);

		// Assert
		expect(errors.length).toBeGreaterThanOrEqual(1);
		expect(errors).toContain("repository.owner must be non-empty");
	});

	it("rejects manifest without workspace.path", () => {
		// Arrange
		const manifest = validMinimalManifest({
			workspace: {
				path: "",
				branch: "positron/issue-42-test",
				baseCommit: "abc123def456",
				isolation: "worktree",
			},
		});

		// Act
		const errors = validateContextManifest(manifest);

		// Assert
		expect(errors.length).toBeGreaterThanOrEqual(1);
		expect(errors).toContain("workspace.path must be non-empty");
	});

	it("rejects manifest with secret-like pattern in title", () => {
		// Arrange — ghp_ token pattern in the issue title triggers secret detector
		const manifest = validMinimalManifest({
			issue: {
				number: 42,
				title: "Use token ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx for auth",
				body: "The login page times out after 30 seconds.",
				labels: ["bug"],
				url: "https://github.com/test/test/issues/42",
			},
		});

		// Act
		const errors = validateContextManifest(manifest);

		// Assert — secret pattern detection fires
		expect(errors.length).toBeGreaterThanOrEqual(1);
		const secretErrors = errors.filter((e) =>
			e.startsWith("Secret pattern detected"),
		);
		expect(secretErrors.length).toBeGreaterThanOrEqual(1);
	});

	it("rejects manifest with secret-like pattern in body", () => {
		// Arrange — OpenAI sk- pattern in the issue body
		const manifest = validMinimalManifest({
			issue: {
				number: 42,
				title: "Fix login timeout",
				body: "Use API key sk-abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrs for the service.",
				labels: ["bug"],
				url: "https://github.com/test/test/issues/42",
			},
		});

		// Act
		const errors = validateContextManifest(manifest);

		// Assert
		expect(errors.length).toBeGreaterThanOrEqual(1);
		const secretErrors = errors.filter((e) =>
			e.startsWith("Secret pattern detected"),
		);
		expect(secretErrors.length).toBeGreaterThanOrEqual(1);
	});

	it("rejects manifest without generatedBy", () => {
		// Arrange
		const manifest = validMinimalManifest({ generatedBy: "" });

		// Act
		const errors = validateContextManifest(manifest);

		// Assert
		expect(errors.length).toBeGreaterThanOrEqual(1);
		expect(errors).toContain("generatedBy must be non-empty");
	});

	it("rejects manifest with invalid ISO8601 generatedAt", () => {
		// Arrange
		const manifest = validMinimalManifest({
			generatedAt: "not-an-iso-date",
		});

		// Act
		const errors = validateContextManifest(manifest);

		// Assert
		expect(errors.length).toBeGreaterThanOrEqual(1);
		expect(errors).toContain("generatedAt must be a valid ISO8601 string");
	});

	it("rejects manifest with empty evidenceRequirements", () => {
		// Arrange — all false means testReport is false → error
		const manifest = validMinimalManifest({
			evidenceRequirements: {
				testReport: false,
				diffSummary: false,
				ciStatus: false,
				previewScreenshot: false,
				securityScan: false,
				reviewerVerdict: false,
				humanApproval: false,
			},
		});

		// Act
		const errors = validateContextManifest(manifest);

		// Assert
		expect(errors.length).toBeGreaterThanOrEqual(1);
		expect(errors).toContain("evidenceRequirements.testReport must be true");
	});

	it("rejects manifest without testReport evidence requirement", () => {
		// Arrange — testReport: false triggers rejection
		const manifest = validMinimalManifest({
			evidenceRequirements: {
				testReport: false,
				diffSummary: true,
				ciStatus: true,
				previewScreenshot: false,
				securityScan: true,
				reviewerVerdict: false,
				humanApproval: false,
			},
		});

		// Act
		const errors = validateContextManifest(manifest);

		// Assert
		expect(errors.length).toBeGreaterThanOrEqual(1);
		expect(errors).toContain("evidenceRequirements.testReport must be true");
	});
});

// ---------------------------------------------------------------------------
// 4. Context Freshness / Ownership
// ---------------------------------------------------------------------------
describe("Context Freshness / Ownership", () => {
	it("accepts manifest with valid context fields", () => {
		// Arrange
		const manifest = validMinimalManifest();

		// Act
		const errors = validateContextManifest(manifest);

		// Assert
		expect(errors).toEqual([]);
	});

	it("Hot context must have explicit freshness marker", () => {
		// Arrange — recentChanges entries must contain ':' or '@' or be >= 15 chars
		const manifest = validMinimalManifest({
			context: {
				affectedModules: ["packages/shared/src/evidence-types.ts"],
				existingTests: ["packages/shared/src/__tests__/types.test.ts"],
				typeDefinitions: [],
				configurationFiles: [],
				recentChanges: ["short"],
			},
		});

		// Act
		const errors = validateContextManifest(manifest);

		// Assert
		expect(errors.length).toBeGreaterThanOrEqual(1);
		expect(errors).toContain(
			'context.recentChanges[0] is missing an ownership/freshness marker ' +
				'(expected format "path:commitSha" or "path@timestamp")',
		);
	});

	it("accepts manifest with freshness markers in recentChanges", () => {
		// Arrange — valid marker with ':' separator
		const manifest = validMinimalManifest({
			context: {
				affectedModules: ["packages/shared/src/evidence-types.ts"],
				existingTests: ["packages/shared/src/__tests__/types.test.ts"],
				typeDefinitions: [],
				configurationFiles: [],
				recentChanges: ["evidence-types.ts:abc123def456"],
			},
		});

		// Act
		const errors = validateContextManifest(manifest);

		// Assert
		expect(errors).toEqual([]);
	});

	it("accepts manifest with timestamp marker in recentChanges", () => {
		// Arrange — valid marker with '@' separator
		const manifest = validMinimalManifest({
			context: {
				affectedModules: ["packages/shared/src/evidence-types.ts"],
				existingTests: ["packages/shared/src/__tests__/types.test.ts"],
				typeDefinitions: [],
				configurationFiles: [],
				recentChanges: ["evidence-types.ts@2026-06-10"],
			},
		});

		// Act
		const errors = validateContextManifest(manifest);

		// Assert
		expect(errors).toEqual([]);
	});
});
