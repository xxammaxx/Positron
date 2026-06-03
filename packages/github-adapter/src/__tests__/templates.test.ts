// Positron — GitHub Templates: Comprehensive branch coverage tests
// Covers: renderAccepted, renderStatusUpdate, renderBlocked, renderDone

import { describe, expect, test } from "vitest";
import {
	renderAccepted,
	renderStatusUpdate,
	renderBlocked,
	renderDone,
} from "../templates.js";

const runId = "run-abc-123";
const issueNumber = 42;

// ---------------------------------------------------------------------------
// renderAccepted
// ---------------------------------------------------------------------------
describe("renderAccepted", () => {
	test("includes runId and issueNumber", () => {
		const output = renderAccepted(runId, issueNumber);
		expect(output).toContain(runId);
		expect(output).toContain("#42");
		expect(output).toContain("Positron accepted this issue");
	});

	test("excludes branch line when branchName is undefined", () => {
		const output = renderAccepted(runId, issueNumber);
		expect(output).not.toContain("**Branch:**");
	});

  test("includes branch line when branchName is provided", () => {
    const output = renderAccepted(runId, issueNumber, "positron/issue-42-test");
    expect(output).toContain("**Branch:**");
    expect(output).toContain("positron/issue-42-test");
  });

	test("does not contain null or undefined strings in output", () => {
		const output = renderAccepted(runId, issueNumber, undefined);
		expect(output).not.toContain("null");
		expect(output).not.toContain("undefined");
	});

	test("output is stable and readable", () => {
		const out1 = renderAccepted(runId, issueNumber);
		const out2 = renderAccepted(runId, issueNumber);
		expect(out1).toBe(out2);
		expect(out1.length).toBeGreaterThan(0);
	});

	test("includes v3.0 footer", () => {
		const output = renderAccepted(runId, issueNumber);
		expect(output).toContain("Automated by Positron v3.0");
	});
});

// ---------------------------------------------------------------------------
// renderStatusUpdate
// ---------------------------------------------------------------------------
describe("renderStatusUpdate", () => {
	test("includes runId, phase, and status", () => {
		const output = renderStatusUpdate(runId, "TEST", "running");
		expect(output).toContain(runId);
		expect(output).toContain("TEST");
		expect(output).toContain("running");
		expect(output).toContain("Status Update");
	});

	test("excludes branch line when branchName is undefined", () => {
		const output = renderStatusUpdate(runId, "IMPLEMENT", "in_progress");
		expect(output).not.toContain("**Branch:**");
	});

  test("includes branch line when branchName is provided", () => {
    const output = renderStatusUpdate(runId, "IMPLEMENT", "in_progress", "positron/issue-99-test");
    expect(output).toContain("**Branch:**");
    expect(output).toContain("positron/issue-99-test");
  });

	test("does not contain null or undefined in output", () => {
		const output = renderStatusUpdate(runId, "TEST", "running");
		expect(output).not.toContain("null");
		expect(output).not.toContain("undefined");
	});
});

// ---------------------------------------------------------------------------
// renderBlocked
// ---------------------------------------------------------------------------
describe("renderBlocked", () => {
	test("includes runId and reason", () => {
		const output = renderBlocked(runId, "Tests failed");
		expect(output).toContain(runId);
		expect(output).toContain("Tests failed");
		expect(output).toContain("Positron blocked");
	});

	test("handles empty reason", () => {
		const output = renderBlocked(runId, "");
		expect(output).toContain(runId);
		// Should not crash with empty reason
		expect(output.length).toBeGreaterThan(0);
	});

	test("output is stable", () => {
		const out1 = renderBlocked(runId, "reason");
		const out2 = renderBlocked(runId, "reason");
		expect(out1).toBe(out2);
	});
});

// ---------------------------------------------------------------------------
// renderDone
// ---------------------------------------------------------------------------
describe("renderDone", () => {
	test("includes runId and summary", () => {
		const output = renderDone(runId, "All tests passed");
		expect(output).toContain(runId);
		expect(output).toContain("All tests passed");
		expect(output).toContain("Positron completed");
	});

	test("excludes branch line when branchName is undefined", () => {
		const output = renderDone(runId, "done summary");
		expect(output).not.toContain("**Branch:**");
	});

  test("includes branch line when branchName is provided", () => {
    const output = renderDone(runId, "done summary", "positron/issue-42-test");
    expect(output).toContain("**Branch:**");
    expect(output).toContain("positron/issue-42-test");
  });

	test("does not contain null or undefined strings in output", () => {
		const output = renderDone(runId, "summary");
		expect(output).not.toContain("null");
		expect(output).not.toContain("undefined");
	});
});
