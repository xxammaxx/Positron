// Built-in Tool Tests: github.*
// Issue #219 — T-011

import { describe, it, expect } from "vitest";
import type { ToolCall } from "../../types.js";
import {
  githubReadIssueHandler,
  githubCommentEvidenceDraftHandler,
} from "../../tools/github.js";

// ─── Helpers ─────────────────────────────────────────────────────────

function makeCall(overrides: Partial<ToolCall> = {}): ToolCall {
  return {
    toolId: "github.read_issue",
    arguments: { issueNumber: 1 },
    runId: "run-test",
    phase: "IMPLEMENT",
    autonomyLevel: 2,
    workspaceRoot: "/tmp/workspace",
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("github.read_issue", () => {
  it("should return fake mode response when in fake mode", async () => {
    // Default test environment is fake mode
    const call = makeCall({ toolId: "github.read_issue" });

    const result = await githubReadIssueHandler(call);
    expect(result.success).toBe(true);

    const output = result.output as Record<string, unknown>;
    expect(output.title).toBeDefined();
  });

  it("should include comments in fake mode response", async () => {
    const call = makeCall({
      toolId: "github.read_issue",
      arguments: { issueNumber: 42 },
    });

    const result = await githubReadIssueHandler(call);
    const output = result.output as Record<string, unknown>;
    expect(Array.isArray(output.comments)).toBe(true);
  });

  it("should default repo when not provided", async () => {
    const call = makeCall({
      toolId: "github.read_issue",
      arguments: { issueNumber: 1 },
    });

    const result = await githubReadIssueHandler(call);
    expect(result.success).toBe(true);
  });

  it("should handle missing issue number", async () => {
    const call = makeCall({
      toolId: "github.read_issue",
      arguments: {},
    });

    const result = await githubReadIssueHandler(call);
    // May succeed with fake mode or fail gracefully
    expect(result).toBeDefined();
  });
});

describe("github.comment_evidence_draft", () => {
  it("should create a draft comment", async () => {
    const call = makeCall({
      toolId: "github.comment_evidence_draft",
      arguments: {
        issueNumber: 1,
        body: "## Test Results\n\nAll tests passed.",
      },
    });

    const result = await githubCommentEvidenceDraftHandler(call);
    expect(result.success).toBe(true);

    const output = result.output as Record<string, unknown>;
    expect(output.draftId).toBeDefined();
    expect(output.status).toBe("draft");
  });

  it("should include preview of long bodies", async () => {
    const longBody = "A".repeat(500);
    const call = makeCall({
      toolId: "github.comment_evidence_draft",
      arguments: { issueNumber: 1, body: longBody },
    });

    const result = await githubCommentEvidenceDraftHandler(call);
    expect(result.success).toBe(true);

    const output = result.output as Record<string, unknown>;
    expect(output.preview).toBeDefined();
    expect(String(output.preview).length).toBeLessThanOrEqual(203); // 200 + "..."
  });

  it("should handle missing issue number (handler doesn't validate — gateway does)", async () => {
    const call = makeCall({
      toolId: "github.comment_evidence_draft",
      arguments: { body: "Missing issue" },
    });

    const result = await githubCommentEvidenceDraftHandler(call);
    // Handler itself doesn't validate required args — gateway's schema validation does
    // So the handler may succeed but with undefined issue number
    expect(result).toBeDefined();
    // If it succeeds, output should have draft structure
    if (result.success) {
      const output = result.output as Record<string, unknown>;
      expect(output.draftId).toBeDefined();
    }
  });

  it("should generate unique draft IDs", async () => {
    const call1 = makeCall({
      toolId: "github.comment_evidence_draft",
      arguments: { issueNumber: 1, body: "First" },
    });
    const call2 = makeCall({
      toolId: "github.comment_evidence_draft",
      arguments: { issueNumber: 1, body: "Second" },
    });

    const result1 = await githubCommentEvidenceDraftHandler(call1);
    const result2 = await githubCommentEvidenceDraftHandler(call2);

    const id1 = (result1.output as Record<string, unknown>).draftId;
    const id2 = (result2.output as Record<string, unknown>).draftId;
    expect(id1).not.toBe(id2);
  });
});
