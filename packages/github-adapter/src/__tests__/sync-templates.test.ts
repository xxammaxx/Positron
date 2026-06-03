// Positron — Sync Templates: Comprehensive branch coverage tests
// Covers: syncMarker, renderSyncAccepted, renderSyncPhaseUpdate,
//         renderSyncTestReport, renderSyncBlocked, renderSyncFailed,
//         renderSyncDone, truncateComment, renderEvidenceSection,
//         renderLlmMetadataSection, renderSyncPrCreated, renderSyncMerged

import { describe, expect, test } from "vitest";
import {
	syncMarker,
	renderSyncAccepted,
	renderSyncPhaseUpdate,
	renderSyncTestReport,
	renderSyncBlocked,
	renderSyncFailed,
	renderSyncDone,
	truncateComment,
	renderEvidenceSection,
	renderLlmMetadataSection,
	renderSyncPrCreated,
	renderSyncMerged,
} from "../sync-templates.js";
import type { EvidenceItem, SafeLlmRunMetadata } from "../sync-types.js";

const runId = "run-abc-123";
const issueNumber = 42;

// ---------------------------------------------------------------------------
// syncMarker
// ---------------------------------------------------------------------------
describe("syncMarker", () => {
	test("generates marker with runId, phase, kind", () => {
		const marker = syncMarker(runId, "TEST", "test-report");
		expect(marker).toContain(runId);
		expect(marker).toContain("TEST");
		expect(marker).toContain("test-report");
		expect(marker).toContain("<!--");
		expect(marker).toContain("-->");
	});
});

// ---------------------------------------------------------------------------
// renderSyncAccepted
// ---------------------------------------------------------------------------
describe("renderSyncAccepted", () => {
	test("includes runId, issueNumber, and marker", () => {
		const output = renderSyncAccepted(runId, issueNumber);
		expect(output).toContain(runId);
		expect(output).toContain("#42");
		expect(output).toContain("Run Accepted");
		expect(output).toContain("<!-- positron:");
	});

	test("excludes branch line when branchName is undefined", () => {
		const output = renderSyncAccepted(runId, issueNumber);
		expect(output).not.toContain("**Branch:**");
	});

  test("includes branch line when branchName is provided", () => {
    const output = renderSyncAccepted(runId, issueNumber, "positron/issue-42-test");
    expect(output).toContain("**Branch:**");
    expect(output).toContain("positron/issue-42-test");
  });

	test("no null or undefined in output", () => {
		const output = renderSyncAccepted(runId, issueNumber);
		expect(output).not.toContain("null");
		expect(output).not.toContain("undefined");
	});
});

// ---------------------------------------------------------------------------
// renderSyncPhaseUpdate
// ---------------------------------------------------------------------------
describe("renderSyncPhaseUpdate", () => {
	test("includes phase and status", () => {
		const output = renderSyncPhaseUpdate(runId, "TEST", "running", "Tests executing");
		expect(output).toContain("TEST");
		expect(output).toContain("running");
		expect(output).toContain("Tests executing");
		expect(output).toContain("Phase Update");
	});

	test("excludes message line when message is empty string", () => {
		const output = renderSyncPhaseUpdate(runId, "TEST", "running", "");
		expect(output).not.toContain("Message:");
	});

  test("includes message line when message is provided", () => {
    const output = renderSyncPhaseUpdate(runId, "TEST", "running", "custom message");
    expect(output).toContain("**Message:** custom message");
  });

	test("no null or undefined in output", () => {
		const output = renderSyncPhaseUpdate(runId, "TEST", "running", "msg");
		expect(output).not.toContain("null");
		expect(output).not.toContain("undefined");
	});
});

// ---------------------------------------------------------------------------
// renderSyncTestReport
// ---------------------------------------------------------------------------
describe("renderSyncTestReport", () => {
	const makeReport = (status: "passed" | "failed" | "skipped") => ({
		status,
		passed: 10,
		failed: status === "passed" ? 0 : 2,
		total: 12,
		durationMs: 1500,
		summary: "10/12 tests passed",
	});

	test("shows passed icon for passed report", () => {
		const output = renderSyncTestReport(runId, makeReport("passed"));
		expect(output).toContain("✅");
		expect(output).not.toContain("❌");
		expect(output).not.toContain("⏭️");
	});

	test("shows failed icon for failed report", () => {
		const output = renderSyncTestReport(runId, makeReport("failed"));
		expect(output).toContain("❌");
	});

	test("shows skip icon for skipped report", () => {
		const output = renderSyncTestReport(runId, makeReport("skipped"));
		expect(output).toContain("⏭️");
	});

  test("includes branch when provided", () => {
    const output = renderSyncTestReport(runId, makeReport("passed"), "positron/issue-42-test");
    expect(output).toContain("**Branch:**");
    expect(output).toContain("positron/issue-42-test");
  });

	test("excludes branch when undefined", () => {
		const output = renderSyncTestReport(runId, makeReport("passed"));
		expect(output).not.toContain("**Branch:**");
	});

	test("no null or undefined in output", () => {
		const output = renderSyncTestReport(runId, makeReport("passed"));
		expect(output).not.toContain("null");
		expect(output).not.toContain("undefined");
	});
});

// ---------------------------------------------------------------------------
// renderSyncBlocked
// ---------------------------------------------------------------------------
describe("renderSyncBlocked", () => {
	test("includes reason", () => {
		const output = renderSyncBlocked(runId, "TEST", "blocked reason");
		expect(output).toContain("blocked reason");
		expect(output).toContain("Run Blocked");
	});

	test("excludes evidence when undefined", () => {
		const output = renderSyncBlocked(runId, "TEST", "reason");
		expect(output).not.toContain("Evidence");
	});

	test("includes evidence when provided", () => {
		const output = renderSyncBlocked(runId, "TEST", "reason", "some evidence");
		expect(output).toContain("some evidence");
	});

	test("no null or undefined in output without evidence", () => {
		const output = renderSyncBlocked(runId, "TEST", "reason");
		expect(output).not.toContain("null");
		expect(output).not.toContain("undefined");
	});
});

// ---------------------------------------------------------------------------
// renderSyncFailed
// ---------------------------------------------------------------------------
describe("renderSyncFailed", () => {
	test("includes reason and phase", () => {
		const output = renderSyncFailed(runId, "IMPLEMENT", "build error");
		expect(output).toContain("build error");
		expect(output).toContain("IMPLEMENT");
		expect(output).toContain("Run Failed");
	});

	test("excludes evidence when undefined", () => {
		const output = renderSyncFailed(runId, "TEST", "reason");
		expect(output).not.toContain("Evidence");
	});

	test("includes evidence when provided", () => {
		const output = renderSyncFailed(runId, "TEST", "reason", "error trace");
		expect(output).toContain("error trace");
	});
});

// ---------------------------------------------------------------------------
// renderSyncDone
// ---------------------------------------------------------------------------
describe("renderSyncDone", () => {
	test("includes runId and marker", () => {
		const output = renderSyncDone(runId, "all good");
		expect(output).toContain(runId);
		expect(output).toContain("Run Completed");
	});

	test("handles undefined evidence gracefully", () => {
		const output = renderSyncDone(runId, undefined);
		// nullish coalescing should produce empty string, not "null" or "undefined"
		expect(output).not.toContain("undefined");
		// Empty evidence is filtered out by .filter(Boolean)
	});

  test("includes branch when provided", () => {
    const output = renderSyncDone(runId, "evidence", "positron/issue-42-test");
    expect(output).toContain("**Branch:**");
    expect(output).toContain("positron/issue-42-test");
  });

	test("excludes branch when undefined", () => {
		const output = renderSyncDone(runId, "evidence");
		expect(output).not.toContain("**Branch:**");
	});
});

// ---------------------------------------------------------------------------
// truncateComment
// ---------------------------------------------------------------------------
describe("truncateComment", () => {
	test("returns unchanged if under maxLength", () => {
		const body = "short body";
		const result = truncateComment(body, 100);
		expect(result).toBe(body);
	});

	test("truncates if over maxLength", () => {
		const body = "a".repeat(100);
		const result = truncateComment(body, 50);
		expect(result.length).toBeLessThan(100);
		expect(result).toContain("<!-- truncated -->");
	});

	test("uses default maxLength of 64000", () => {
		const body = "short";
		const result = truncateComment(body);
		expect(result).toBe(body);
	});

	test("truncation preserves prefix content", () => {
		const body = "BEGIN-" + "x".repeat(100) + "-END";
		const result = truncateComment(body, 20);
		expect(result).toContain("BEGIN");
		expect(result).not.toContain("END");
	});
});

// ---------------------------------------------------------------------------
// renderEvidenceSection
// ---------------------------------------------------------------------------
describe("renderEvidenceSection", () => {
	test("returns empty string for empty array", () => {
		const result = renderEvidenceSection([], runId);
		expect(result).toBe("");
	});

	test("renders table for non-empty evidence", () => {
		const evidence: EvidenceItem[] = [
			{ kind: "test", status: "pass", summary: "Tests passed" },
		];
		const result = renderEvidenceSection(evidence, runId);
		expect(result).toContain("✅");
		expect(result).toContain("Tests passed");
		expect(result).toContain("| Kind | Status | Summary |");
	});

	test("renders fail status icon", () => {
		const evidence: EvidenceItem[] = [
			{ kind: "test", status: "fail", summary: "Tests failed" },
		];
		const result = renderEvidenceSection(evidence, runId);
		expect(result).toContain("❌");
	});

	test("renders blocked status icon", () => {
		const evidence: EvidenceItem[] = [
			{ kind: "gate", status: "blocked", summary: "Gate blocked" },
		];
		const result = renderEvidenceSection(evidence, runId);
		expect(result).toContain("🚫");
	});

	test("renders unknown status as skip icon", () => {
		const evidence: EvidenceItem[] = [
			{ kind: "audit", status: "unknown" as unknown as EvidenceItem["status"], summary: "Unknown" },
		];
		const result = renderEvidenceSection(evidence, runId);
		expect(result).toContain("⏭️");
	});

	test("renders multiple items", () => {
		const evidence: EvidenceItem[] = [
			{ kind: "test", status: "pass", summary: "T1" },
			{ kind: "lint", status: "fail", summary: "L1" },
		];
		const result = renderEvidenceSection(evidence, runId);
		expect(result).toContain("T1");
		expect(result).toContain("L1");
	});
});

// ---------------------------------------------------------------------------
// renderLlmMetadataSection
// ---------------------------------------------------------------------------
describe("renderLlmMetadataSection", () => {
	test("returns empty string (stub)", () => {
		const result = renderLlmMetadataSection([], runId);
		expect(result).toBe("");
	});
});

// ---------------------------------------------------------------------------
// renderSyncPrCreated
// ---------------------------------------------------------------------------
describe("renderSyncPrCreated", () => {
	test("includes runId and marker", () => {
		const output = renderSyncPrCreated(runId);
		expect(output).toContain(runId);
		expect(output).toContain("Pull Request Created");
	});

	test("includes prNumber when provided", () => {
		const output = renderSyncPrCreated(runId, 120);
		expect(output).toContain("#120");
	});

	test("excludes prNumber when undefined", () => {
		const output = renderSyncPrCreated(runId);
		expect(output).not.toContain("PR:");
	});

	test("includes prUrl when provided", () => {
		const output = renderSyncPrCreated(runId, undefined, "https://github.com/test/pr/1");
		expect(output).toContain("https://github.com/test/pr/1");
	});

	test("excludes prUrl when undefined", () => {
		const output = renderSyncPrCreated(runId);
		expect(output).not.toContain("URL:");
	});

	test("includes branch and issue when provided", () => {
		const output = renderSyncPrCreated(
			runId, 120, "https://example.com", "positron/issue-42-test", 42,
		);
    expect(output).toContain("**Branch:**");
    expect(output).toContain("positron/issue-42-test");
    expect(output).toContain("**Closes:**");
	});

	test("no null or undefined in output when all optional fields are missing", () => {
		const output = renderSyncPrCreated(runId);
		expect(output).not.toContain("null");
		expect(output).not.toContain("undefined");
	});
});

// ---------------------------------------------------------------------------
// renderSyncMerged
// ---------------------------------------------------------------------------
describe("renderSyncMerged", () => {
	test("includes runId", () => {
		const output = renderSyncMerged(runId);
		expect(output).toContain(runId);
		expect(output).toContain("Pull Request Merged");
	});

	test("includes prNumber when provided", () => {
		const output = renderSyncMerged(runId, 120);
		expect(output).toContain("#120");
	});

	test("excludes prNumber when undefined", () => {
		const output = renderSyncMerged(runId);
		expect(output).not.toContain("PR:");
	});

	test("includes prUrl when provided", () => {
		const output = renderSyncMerged(runId, undefined, "https://github.com/test/pr/1");
		expect(output).toContain("https://github.com/test/pr/1");
	});

	test("includes branchOrSha when provided", () => {
		const output = renderSyncMerged(runId, undefined, undefined, "abc123def");
		expect(output).toContain("abc123def");
	});

	test("excludes branchOrSha when undefined", () => {
		const output = renderSyncMerged(runId);
		expect(output).not.toContain("Branch/SHA:");
	});

	test("no null or undefined in output when all optional fields are missing", () => {
		const output = renderSyncMerged(runId);
		expect(output).not.toContain("null");
		expect(output).not.toContain("undefined");
	});
});
