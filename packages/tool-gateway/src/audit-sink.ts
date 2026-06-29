// Audit Sink — Local structured audit log for tool executions
// Issue #322: Wired into server/worker runtime via GatewayService.onAudit
//
// Design:
// - Local JSONL file sink (no remote sinks, no network)
// - Written BEFORE tool execution (enforces pre-execution audit)
// - Fail-closed: throws on write failure, which GatewayService catches via Gate 9
// - No tool arguments in audit entries (may contain secrets)
// - Safe metadata only: toolId, runId, phase, source, decision

import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import type { ToolCall } from './types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditSinkOptions {
	/** Run ID for audit traceability */
	runId: string;
	/** Workspace root directory (defaults to CWD/.opencode/audit) */
	workspacePath?: string;
	/** Source identifier: 'server' or 'worker' */
	source: 'server' | 'worker';
}

export interface AuditEntry {
	ts: string;
	runId: string;
	phase: string;
	toolId: string;
	requiresAuditLog: boolean;
	decision: 'ALLOW' | 'BLOCK';
	reason?: string;
	evidenceId?: string;
	meta: {
		tool: string;
		source: 'server' | 'worker';
	};
}

// ---------------------------------------------------------------------------
// Default Workspace Path
// ---------------------------------------------------------------------------

function defaultAuditDir(): string {
	const cwd = process.cwd();
	return path.join(cwd, '.opencode', 'audit');
}

// ---------------------------------------------------------------------------
// Sink Creation
// ---------------------------------------------------------------------------

/**
 * Creates an onAudit callback compatible with GatewayService.onAudit.
 *
 * The returned callback:
 * 1. Creates an audit entry with safe metadata (no tool arguments)
 * 2. Appends the entry to a local JSONL file
 * 3. Returns a unique evidence ID (UUID) on success
 * 4. Throws on any write failure — fail-closed via GatewayService Gate 9
 *
 * File path: {workspacePath}/audit-{runId}-{date}.jsonl
 *
 * @param options - Audit sink configuration
 * @returns An onAudit callback function
 */
export function createAuditSink(
	options: AuditSinkOptions,
): (call: ToolCall) => Promise<string> {
	const { runId, source } = options;
	const workspacePath = options.workspacePath ?? defaultAuditDir();
	const auditDir = path.resolve(workspacePath);

	// Ensure the audit directory exists (fail-fast on creation error)
	if (!existsSync(auditDir)) {
		mkdirSync(auditDir, { recursive: true });
	}

	// File name includes date for log rotation
	const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
	const auditFile = path.join(auditDir, `audit-${runId}-${dateStr}.jsonl`);

	/**
	 * Audit callback — called BEFORE tool execution by GatewayService.
	 *
	 * @param call - The tool call (arguments intentionally excluded from audit)
	 * @returns A unique evidence event ID
	 * @throws If audit file write fails (ensures fail-closed via Gate 9)
	 */
	return async (call: ToolCall): Promise<string> => {
		const evidenceId = createEvidenceId();
		const entry: AuditEntry = {
			ts: new Date().toISOString(),
			runId: call.runId || runId,
			phase: call.phase,
			toolId: call.toolId,
			requiresAuditLog: true,
			decision: 'ALLOW',
			evidenceId,
			meta: {
				tool: call.toolId,
				source,
			},
		};

		try {
			// Append to JSONL file — one line per audit entry
			// Uses appendFileSync for crash-safety (each line is a complete JSON object)
			appendFileSync(auditFile, `${JSON.stringify(entry)}\n`, 'utf-8');
		} catch (err) {
			// Fail-closed: throw so GatewayService blocks via Gate 9
			throw new Error(
				`Audit sink write failed for tool "${call.toolId}": ${err instanceof Error ? err.message : String(err)}`,
			);
		}

		return evidenceId;
	};
}

/**
 * Creates a unique evidence event ID using UUID v4.
 * Deterministic prefix "evt-" for filtering.
 */
function createEvidenceId(): string {
	return `evt-${randomUUID()}`;
}

/**
 * Creates a blocked audit entry (for recording blocks without throwing).
 * Used for audit trail completeness when GatewayService blocks a tool.
 */
export function createBlockedAuditEntry(
	call: ToolCall,
	blockReason: string,
	options: AuditSinkOptions,
): AuditEntry {
	return {
		ts: new Date().toISOString(),
		runId: call.runId || options.runId,
		phase: call.phase,
		toolId: call.toolId,
		requiresAuditLog: true,
		decision: 'BLOCK',
		reason: blockReason,
		meta: {
			tool: call.toolId,
			source: options.source,
		},
	};
}

// ---------------------------------------------------------------------------
// Content Hash (for evidence verification)
// ---------------------------------------------------------------------------

/**
 * Computes a SHA-256 hash of an audit entry for cross-session verification.
 */
export function hashAuditEntry(entry: AuditEntry): string {
	const normalized = JSON.stringify(entry, Object.keys(entry).sort());
	return createHash('sha256').update(normalized).digest('hex');
}
