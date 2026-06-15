// Built-in Tool: Evidence Append
// Issue #219
// evidence.append

import crypto from "node:crypto";
import type { ToolDefinition, ToolHandler, ToolResult } from "../types.js";

// ─── Tool Definition ─────────────────────────────────────────────────

export const evidenceAppendDef: ToolDefinition = {
  id: "evidence.append",
  title: "Append Evidence",
  description:
    "Append an evidence item to the current run. Evidence items are tracked for audit purposes.",
  inputSchema: {
    type: "object",
    properties: {
      kind: {
        type: "string",
        maxLength: 128,
        description: "Evidence kind (e.g., test_result, screenshot, log_capture)",
      },
      summary: {
        type: "string",
        maxLength: 2048,
        description: "Brief summary of the evidence",
      },
      status: {
        type: "string",
        maxLength: 32,
        description: "Status: pass, fail, blocked, skipped",
      },
      artifactPath: {
        type: "string",
        maxLength: 1024,
        description: "Optional path to evidence artifact",
      },
    },
    required: ["kind", "summary", "status"],
  },
  outputSchema: {
    type: "object",
    properties: {
      evidenceId: { type: "string" },
      timestamp: { type: "string" },
    },
  },
  riskLevel: "write",
  requiredAutonomyLevel: 1,
  approvalMode: "ask",
  allowedPhases: [],
  allowedWorkspaceRoots: [],
  egressPolicy: { allowedHosts: [], allowedPorts: [] },
  evidenceRequirements: {
    logArguments: true,
    logOutput: true,
    requireArtifact: false,
  },
};

// ─── Tool Handler ────────────────────────────────────────────────────

export const evidenceAppendHandler: ToolHandler = async (
  call,
): Promise<ToolResult> => {
  try {
    const kind = call.arguments.kind as string;
    const summary = call.arguments.summary as string;
    const status = call.arguments.status as string;
    const artifactPath = (call.arguments.artifactPath as string) || null;

    // Validate status
    const validStatuses = ["pass", "fail", "blocked", "skipped"];
    if (!validStatuses.includes(status)) {
      return {
        success: false,
        output: null,
        error: `Invalid status "${status}". Must be one of: ${validStatuses.join(", ")}`,
      };
    }

    const evidenceId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // The actual persistence is handled by the GatewayService's onEvidence callback.
    // This handler creates the evidence data and returns it.
    const evidenceItem = {
      id: evidenceId,
      kind,
      summary,
      status,
      artifactPath,
      timestamp,
      runId: call.runId,
      phase: call.phase,
    };

    return {
      success: true,
      output: {
        evidenceId,
        timestamp,
        summary,
      },
      // onEvidence callback in GatewayService will persist this
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      output: null,
      error: `Failed to append evidence: ${message}`,
    };
  }
};

/**
 * Evidence item type for persistence.
 */
export interface EvidenceItem {
  id: string;
  kind: string;
  summary: string;
  status: string;
  artifactPath: string | null;
  timestamp: string;
  runId: string;
  phase: string;
}
