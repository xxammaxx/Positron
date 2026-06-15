// Positron — Types: Comprehensive branch coverage tests
// Covers: isValidPhase, isTerminalPhase, isFailurePhase, parsePhase,
//         parseRunStatus, safeJsonParse

import { describe, expect, test } from "vitest";
import {
	isValidPhase,
	isTerminalPhase,
	isFailurePhase,
	parsePhase,
	parseRunStatus,
	safeJsonParse,
	ALL_PHASES,
	ALL_TOOL_CATEGORIES,
} from "../types.js";

// ---------------------------------------------------------------------------
// isValidPhase
// ---------------------------------------------------------------------------
describe("isValidPhase", () => {
	test("returns true for every canonical phase", () => {
		for (const phase of ALL_PHASES) {
			expect(isValidPhase(phase)).toBe(true);
		}
	});

	test("returns false for an invalid string", () => {
		expect(isValidPhase("NONSENSE")).toBe(false);
	});

	test("returns false for empty string", () => {
		expect(isValidPhase("")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// isTerminalPhase
// ---------------------------------------------------------------------------
describe("isTerminalPhase", () => {
	test("returns true for DONE", () => {
		expect(isTerminalPhase("DONE")).toBe(true);
	});

	test("returns true for FAILED", () => {
		expect(isTerminalPhase("FAILED")).toBe(true);
	});

	test("returns true for FAILED_BLOCKED", () => {
		expect(isTerminalPhase("FAILED_BLOCKED")).toBe(true);
	});

	test("returns true for FAILED_UNSAFE", () => {
		expect(isTerminalPhase("FAILED_UNSAFE")).toBe(true);
	});

	test("returns true for CLEANUP", () => {
		expect(isTerminalPhase("CLEANUP")).toBe(true);
	});

	test("returns false for a non-terminal phase", () => {
		expect(isTerminalPhase("QUEUED")).toBe(false);
	});

	test("returns false for IMPLEMENT", () => {
		expect(isTerminalPhase("IMPLEMENT")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// isFailurePhase
// ---------------------------------------------------------------------------
describe("isFailurePhase", () => {
	test("returns true for FAILED_TRANSIENT", () => {
		expect(isFailurePhase("FAILED_TRANSIENT")).toBe(true);
	});

	test("returns true for FAILED_BLOCKED", () => {
		expect(isFailurePhase("FAILED_BLOCKED")).toBe(true);
	});

	test("returns true for FAILED_UNSAFE", () => {
		expect(isFailurePhase("FAILED_UNSAFE")).toBe(true);
	});

	test("returns true for FAILED", () => {
		expect(isFailurePhase("FAILED")).toBe(true);
	});

	test("returns false for non-failure phase", () => {
		expect(isFailurePhase("DONE")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// parsePhase
// ---------------------------------------------------------------------------
describe("parsePhase", () => {
	test("returns valid phase unchanged", () => {
		expect(parsePhase("IMPLEMENT")).toBe("IMPLEMENT");
		expect(parsePhase("QUEUED")).toBe("QUEUED");
		expect(parsePhase("DONE")).toBe("DONE");
	});

	test("throws for invalid phase string", () => {
		expect(() => parsePhase("INVALID")).toThrow('Invalid phase: "INVALID"');
	});

	test("throws for empty string", () => {
		expect(() => parsePhase("")).toThrow("Invalid phase");
	});
});

// ---------------------------------------------------------------------------
// parseRunStatus
// ---------------------------------------------------------------------------
describe("parseRunStatus", () => {
	test("returns valid status unchanged", () => {
		expect(parseRunStatus("active")).toBe("active");
		expect(parseRunStatus("blocked")).toBe("blocked");
		expect(parseRunStatus("done")).toBe("done");
		expect(parseRunStatus("failed")).toBe("failed");
		expect(parseRunStatus("cancelled")).toBe("cancelled");
	});

	test("throws for invalid status string", () => {
		expect(() => parseRunStatus("INVALID")).toThrow('Invalid run status: "INVALID"');
	});

	test("throws for empty string", () => {
		expect(() => parseRunStatus("")).toThrow("Invalid run status");
	});
});

// ---------------------------------------------------------------------------
// safeJsonParse
// ---------------------------------------------------------------------------
describe("safeJsonParse", () => {
	test("returns null for null input", () => {
		expect(safeJsonParse(null)).toBeNull();
	});

	test("returns null for empty string", () => {
		expect(safeJsonParse("")).toBeNull();
	});

	test("returns parsed object for valid JSON", () => {
		expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
	});

	test("returns parsed object for valid JSON with strings", () => {
		expect(safeJsonParse('{"key":"value"}')).toEqual({ key: "value" });
	});

	test("returns null for invalid JSON", () => {
		expect(safeJsonParse("not json")).toBeNull();
	});

	test("returns null for malformed JSON", () => {
		expect(safeJsonParse('{"broken":')).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// ToolCategory & ALL_TOOL_CATEGORIES (Issue #229)
// ---------------------------------------------------------------------------
describe("ALL_TOOL_CATEGORIES", () => {
	test("contains exactly 13 categories", () => {
		expect(ALL_TOOL_CATEGORIES).toHaveLength(13);
	});

	test("includes all expected categories", () => {
		expect(ALL_TOOL_CATEGORIES).toContain('provider');
		expect(ALL_TOOL_CATEGORIES).toContain('filesystem');
		expect(ALL_TOOL_CATEGORIES).toContain('git');
		expect(ALL_TOOL_CATEGORIES).toContain('github');
		expect(ALL_TOOL_CATEGORIES).toContain('browser');
		expect(ALL_TOOL_CATEGORIES).toContain('shell');
		expect(ALL_TOOL_CATEGORIES).toContain('spec');
		expect(ALL_TOOL_CATEGORIES).toContain('storage');
		expect(ALL_TOOL_CATEGORIES).toContain('security');
		expect(ALL_TOOL_CATEGORIES).toContain('testing');
		expect(ALL_TOOL_CATEGORIES).toContain('oversight');
		expect(ALL_TOOL_CATEGORIES).toContain('blueprint');
		expect(ALL_TOOL_CATEGORIES).toContain('unknown');
	});

	test('contains no duplicate categories', () => {
		const unique = new Set(ALL_TOOL_CATEGORIES);
		expect(unique.size).toBe(ALL_TOOL_CATEGORIES.length);
	});
});
