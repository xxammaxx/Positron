// Built-in Tool Tests: evidence.append
// Issue #219 — T-011

import { describe, it, expect } from "vitest";
import type { ToolCall } from "../../types.js";
import { evidenceAppendHandler } from "../../tools/evidence.js";

// ─── Helpers ─────────────────────────────────────────────────────────

function makeCall(overrides: Partial<ToolCall> = {}): ToolCall {
  return {
    toolId: "evidence.append",
    arguments: {
      kind: "test_result",
      summary: "All tests passed",
      status: "pass",
    },
    runId: "run-test",
    phase: "TEST",
    autonomyLevel: 2,
    workspaceRoot: "/tmp/workspace",
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("evidence.append", () => {
  it("should create evidence with pass status", async () => {
    const call = makeCall();

    const result = await evidenceAppendHandler(call);
    expect(result.success).toBe(true);

    const output = result.output as Record<string, unknown>;
    expect(output.evidenceId).toBeDefined();
    expect(output.timestamp).toBeDefined();
    expect(output.summary).toBe("All tests passed");
  });

  it("should create evidence with fail status", async () => {
    const call = makeCall({
      arguments: {
        kind: "test_result",
        summary: "Tests failed",
        status: "fail",
      },
    });

    const result = await evidenceAppendHandler(call);
    expect(result.success).toBe(true);

    const output = result.output as Record<string, unknown>;
    expect(output.summary).toBe("Tests failed");
  });

  it("should create evidence with blocked status", async () => {
    const call = makeCall({
      arguments: {
        kind: "gate_check",
        summary: "Gate blocked",
        status: "blocked",
      },
    });

    const result = await evidenceAppendHandler(call);
    expect(result.success).toBe(true);
  });

  it("should create evidence with skipped status", async () => {
    const call = makeCall({
      arguments: {
        kind: "e2e_test",
        summary: "E2E tests skipped",
        status: "skipped",
      },
    });

    const result = await evidenceAppendHandler(call);
    expect(result.success).toBe(true);
  });

  it("should reject invalid status", async () => {
    const call = makeCall({
      arguments: {
        kind: "test",
        summary: "Test",
        status: "invalid_status",
      },
    });

    const result = await evidenceAppendHandler(call);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid status");
  });

  it("should include artifact path when provided", async () => {
    const call = makeCall({
      arguments: {
        kind: "screenshot",
        summary: "Screenshot captured",
        status: "pass",
        artifactPath: "/tmp/screenshot.png",
      },
    });

    const result = await evidenceAppendHandler(call);
    expect(result.success).toBe(true);
  });

  it("should generate unique IDs for multiple calls", async () => {
    const call1 = makeCall();
    const call2 = makeCall();

    const result1 = await evidenceAppendHandler(call1);
    const result2 = await evidenceAppendHandler(call2);

    const id1 = (result1.output as Record<string, unknown>).evidenceId;
    const id2 = (result2.output as Record<string, unknown>).evidenceId;
    expect(id1).not.toBe(id2);
  });
});
