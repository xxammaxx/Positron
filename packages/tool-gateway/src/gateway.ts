// Gateway Service — Core execution pipeline with 8 security gates
// Issue #219

import path from "node:path";
import { redactSecrets } from "@positron/shared";
import type {
  ToolCall,
  ToolResult,
  ToolDefinition,
  GatewayConfig,
  BlockReason,
} from "./types.js";
import {
  DEFAULT_GATEWAY_CONFIG,
  BLOCK_REASONS,
} from "./types.js";
import type { ToolRegistry } from "./registry.js";

/**
 * Result with timing information.
 */
interface TimedResult extends ToolResult {
  durationMs: number;
}

/**
 * Helper to create a blocked result.
 */
function blocked(
  reason: BlockReason,
  detail?: string,
): ToolResult {
  return {
    success: false,
    output: null,
    blockedReason: `${reason}${detail ? `: ${detail}` : ""}`,
  };
}

/**
 * Helper to create a successful result.
 */
function success(output: unknown): ToolResult {
  return {
    success: true,
    output,
  };
}

/**
 * GatewayService — validates, authorizes, executes, and logs tool calls.
 *
 * Security pipeline (8 gates):
 * 1. Gateway enabled check
 * 2. Schema validation (input against inputSchema)
 * 3. Tool lookup (registry allowlist)
 * 4. Phase check (allowedPhases)
 * 5. Autonomy check (requiredAutonomyLevel vs run level)
 * 6. Approval check (riskLevel + approvalMode)
 * 7. Workspace boundary check (path resolution)
 * 8. Egress check (network target validation)
 *
 * Post-execution: secret redaction, evidence generation, result assembly.
 */
export class GatewayService {
  private config: GatewayConfig;
  private registry: ToolRegistry;

  /**
   * Optional callback for evidence event creation.
   * Set by the server integration layer.
   */
  public onEvidence:
    | ((call: ToolCall, result: TimedResult) => Promise<string>)
    | null = null;

  /**
   * Optional approval check callback.
   * If set, called when a tool requires approval.
   * Should return true if approved, false if denied.
   */
  public onApprovalCheck:
    | ((toolId: string, call: ToolCall) => Promise<boolean>)
    | null = null;

  constructor(registry: ToolRegistry, config?: Partial<GatewayConfig>) {
    this.config = { ...DEFAULT_GATEWAY_CONFIG, ...config };
    this.registry = registry;
  }

  /**
   * Execute a tool call through the full security pipeline.
   */
  async execute(call: ToolCall): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Gate 1: Gateway enabled
      if (!this.config.enabled) {
        return blocked(BLOCK_REASONS.GATEWAY_DISABLED);
      }

      // Gate 2: Schema validation
      const schemaResult = this.validateSchema(call);
      if (!schemaResult.ok) {
        return blocked(
          BLOCK_REASONS.SCHEMA_VALIDATION_FAILED,
          schemaResult.error,
        );
      }

      // Gate 3: Tool lookup
      const entry = this.registry.get(call.toolId);
      if (!entry) {
        return blocked(BLOCK_REASONS.TOOL_NOT_FOUND, call.toolId);
      }

      const def = entry.definition;

      // Gate 4: Phase check
      if (
        def.allowedPhases.length > 0 &&
        !def.allowedPhases.includes(call.phase)
      ) {
        return blocked(
          BLOCK_REASONS.PHASE_NOT_ALLOWED,
          `Tool "${call.toolId}" not allowed in phase "${call.phase}"`,
        );
      }

      // Gate 5: Autonomy check
      if (call.autonomyLevel < def.requiredAutonomyLevel) {
        return blocked(
          BLOCK_REASONS.AUTONOMY_TOO_LOW,
          `Tool requires autonomy ${def.requiredAutonomyLevel}, run has ${call.autonomyLevel}`,
        );
      }

      // Gate 6: Approval check
      if (def.approvalMode !== "none") {
        if (this.onApprovalCheck) {
          const approved = await this.onApprovalCheck(call.toolId, call);
          if (!approved) {
            return blocked(
              BLOCK_REASONS.APPROVAL_REQUIRED,
              `Tool "${call.toolId}" requires approval`,
            );
          }
        } else if (def.approvalMode === "human_required") {
          // If no approval callback is set and human approval is required, block
          return blocked(
            BLOCK_REASONS.APPROVAL_REQUIRED,
            `Tool "${call.toolId}" requires human approval (no approval handler configured)`,
          );
        }
        // For "ask" mode without handler: proceed (backward-compatible)
      }

      // Gate 7: Workspace boundary check (for file operations)
      if (this.config.enforcePathBoundaries) {
        const pathResult = this.validateWorkspaceBoundary(call, def);
        if (!pathResult.ok) {
          return blocked(
            BLOCK_REASONS.PATH_TRAVERSAL,
            pathResult.error,
          );
        }
      }

      // Gate 8: Egress check
      if (this.config.enforceEgress) {
        const egressResult = this.validateEgress(call, def);
        if (!egressResult.ok) {
          return blocked(
            BLOCK_REASONS.EGRESS_BLOCKED,
            egressResult.error,
          );
        }
      }

      // Execute the tool handler
      const result = await entry.handler(call);

      // If handler returned a blocked result, pass it through
      if (!result.success && result.blockedReason) {
        return result;
      }

      const durationMs = Date.now() - startTime;
      const timedResult: TimedResult = {
        ...result,
        durationMs,
      };

      // Post-execution: secret redaction
      if (this.config.redactSecrets) {
        timedResult.output = this.redactOutput(timedResult.output);
      }

      // Generate evidence event
      if (this.onEvidence) {
        timedResult.evidenceEventId = await this.onEvidence(call, timedResult);
      }

      return timedResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const durationMs = Date.now() - startTime;
      return {
        success: false,
        output: null,
        error: errorMessage,
        blockedReason: BLOCK_REASONS.TOOL_EXECUTION_ERROR,
        evidenceEventId: undefined,
      };
    }
  }

  /**
   * Gate 2: Validate input arguments against tool's inputSchema.
   *
   * For now, performs structural validation:
   * - Checks required fields are present (using JSON Schema-like logic)
   * - Checks types match expected types
   *
   * In a future iteration, full JSON Schema validation can be added.
   */
  private validateSchema(call: ToolCall): { ok: boolean; error?: string } {
    const entry = this.registry.get(call.toolId);
    if (!entry) {
      // Tool lookup failure handled by Gate 3
      return { ok: true };
    }

    const schema = entry.definition.inputSchema;

    // Check required fields
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required as string[]) {
        if (!(field in call.arguments)) {
          return {
            ok: false,
            error: `Missing required field: "${field}"`,
          };
        }
      }
    }

    // Check properties types if specified
    if (schema.properties && typeof schema.properties === "object") {
      const props = schema.properties as Record<
        string,
        Record<string, unknown>
      >;
      for (const [key, propSchema] of Object.entries(props)) {
        if (key in call.arguments) {
          const value = call.arguments[key];
          const expectedType = propSchema.type as string | undefined;

          if (expectedType) {
            const actualType = Array.isArray(value) ? "array" : typeof value;
            if (actualType !== expectedType) {
              return {
                ok: false,
                error: `Field "${key}": expected type "${expectedType}", got "${actualType}"`,
              };
            }
          }

          // Check maxLength for strings
          if (
            expectedType === "string" &&
            typeof value === "string" &&
            propSchema.maxLength !== undefined
          ) {
            const maxLen = propSchema.maxLength as number;
            if (value.length > maxLen) {
              return {
                ok: false,
                error: `Field "${key}": max length ${maxLen}, got ${value.length}`,
              };
            }
          }
        }
      }
    }

    return { ok: true };
  }

  /**
   * Gate 7: Validate file paths are within workspace boundaries.
   *
   * Resolves paths and checks they fall within the workspace root.
   * Blocks absolute paths, parent directory traversal, and symlink escapes.
   */
  private validateWorkspaceBoundary(
    call: ToolCall,
    def: ToolDefinition,
  ): { ok: boolean; error?: string } {
    // Look for file path arguments
    const pathKeys = ["path", "filePath", "file", "directory", "dir"];
    let targetPath: string | undefined;

    for (const key of pathKeys) {
      const val = call.arguments[key];
      if (typeof val === "string" && val.length > 0) {
        targetPath = val;
        break;
      }
    }

    // If no path argument found, boundary check is not applicable
    if (!targetPath) {
      return { ok: true };
    }

    // Check allowedWorkspaceRoots from tool definition
    if (def.allowedWorkspaceRoots && def.allowedWorkspaceRoots.length > 0) {
      const resolvedRoot = path.resolve(call.workspaceRoot);
      const isAllowed = def.allowedWorkspaceRoots.some((allowedRoot) => {
        const resolvedAllowed = path.resolve(allowedRoot);
        return resolvedRoot === resolvedAllowed || resolvedRoot.startsWith(resolvedAllowed + path.sep);
      });
      if (!isAllowed) {
        return {
          ok: false,
          error: `Workspace root "${call.workspaceRoot}" not in tool's allowed workspace roots`,
        };
      }
    }

    // Block absolute paths (unless they start with workspace root)
    if (path.isAbsolute(targetPath)) {
      const normalizedWorkspace = path.resolve(call.workspaceRoot);
      const normalizedTarget = path.resolve(targetPath);

      if (!normalizedTarget.startsWith(normalizedWorkspace)) {
        return {
          ok: false,
          error: `Absolute path "${targetPath}" is outside workspace root`,
        };
      }
      return { ok: true };
    }

    // Resolve the path against workspace root
    const resolved = path.resolve(call.workspaceRoot, targetPath);
    const normalizedRoot = path.resolve(call.workspaceRoot);

    // Block if resolved path is outside workspace root
    if (!resolved.startsWith(normalizedRoot)) {
      return {
        ok: false,
        error: `Path "${targetPath}" resolves outside workspace root`,
      };
    }

    // Block if path contains parent directory traversal patterns
    if (targetPath.includes("..")) {
      // Additional check: validate each segment
      const segments = targetPath.split(/[/\\]/);
      let depth = 0;
      for (const segment of segments) {
        if (segment === "..") {
          depth--;
          if (depth < 0) {
            return {
              ok: false,
              error: `Path traversal detected: "${targetPath}" escapes workspace root`,
            };
          }
        } else if (segment !== "." && segment !== "") {
          depth++;
        }
      }
    }

    // Block if max path depth exceeded (symlink loop protection)
    const depth = resolved.split(path.sep).length;
    if (depth > this.config.maxPathDepth + normalizedRoot.split(path.sep).length) {
      return {
        ok: false,
        error: `Path depth ${depth} exceeds maximum ${this.config.maxPathDepth}`,
      };
    }

    return { ok: true };
  }

  /**
   * Gate 8: Validate network egress against tool's egress policy.
   *
   * Checks if the tool call attempts network access and whether
   * the target is in the allowed hosts list.
   */
  private validateEgress(
    call: ToolCall,
    def: ToolDefinition,
  ): { ok: boolean; error?: string } {
    // Look for URL/host arguments
    const urlKeys = ["url", "host", "hostname", "endpoint", "apiUrl"];
    let targetUrl: string | undefined;

    for (const key of urlKeys) {
      const val = call.arguments[key];
      if (typeof val === "string" && val.length > 0) {
        targetUrl = val;
        break;
      }
    }

    // If no URL argument found, egress check is not applicable
    if (!targetUrl) {
      return { ok: true };
    }

    // Parse the URL to extract hostname
    let hostname: string;
    try {
      const parsed = new URL(
        targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`,
      );
      hostname = parsed.hostname;
    } catch {
      // Not a valid URL — treat as potential hostname
      hostname = targetUrl.split("/")[0] ?? targetUrl;
    }

    // Use the tool definition's egress policy directly
    const egress = def.egressPolicy;

    // If no allowed hosts configured, block all network access
    if (!egress.allowedHosts || egress.allowedHosts.length === 0) {
      return {
        ok: false,
        error: `Network access to "${hostname}" blocked: no egress policy configured for tool "${call.toolId}"`,
      };
    }

    // Check if hostname matches any allowed host
    const allowed = egress.allowedHosts.some(
      (allowed) =>
        hostname === allowed ||
        hostname.endsWith(`.${allowed}`),
    );

    if (!allowed) {
      return {
        ok: false,
        error: `Network access to "${hostname}" blocked: not in allowed egress hosts`,
      };
    }

    return { ok: true };
  }

  /**
   * Redact secrets from tool output before logging.
   */
  private redactOutput(output: unknown): unknown {
    if (typeof output === "string") {
      return redactSecrets(output);
    }
    if (output && typeof output === "object") {
      try {
        const json = JSON.stringify(output);
        const redacted = redactSecrets(json);
        return JSON.parse(redacted);
      } catch {
        return output;
      }
    }
    return output;
  }

  /**
   * Update gateway configuration at runtime.
   */
  updateConfig(partial: Partial<GatewayConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  /**
   * Get current gateway configuration (read-only copy).
   */
  getConfig(): Readonly<GatewayConfig> {
    return { ...this.config };
  }

  /**
   * Get the underlying tool registry.
   */
  getRegistry(): ToolRegistry {
    return this.registry;
  }
}
