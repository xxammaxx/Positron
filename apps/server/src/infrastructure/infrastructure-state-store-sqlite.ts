// Positron — SQLite Infrastructure State Stores
// PR 12: SQLite-backed persistent stores for Provider/Model/SpecKit/MCP state
// ---------------------------------------------------------------------------
// Uses the existing better-sqlite3 Database instance from @positron/run-state.
// Stores status data only — NEVER starts any runtime.
//
// SQLITE SAFETY:
// - WAL mode (set by openDatabase in run-state)
// - busy_timeout (set by openDatabase in run-state)
// - BEGIN IMMEDIATE for write transactions
// - Short transactions
// - JSON validation before commit
// - NO DB/WAL/SHM files committed
// ---------------------------------------------------------------------------

import type Database from 'better-sqlite3';
import type {
	ProviderDetectionStore,
	ModelProfileStore,
	SpecKitSyncStateStore,
	McpWarmupEvidenceStore,
	InfrastructureStateStores,
} from '@positron/shared';
import {
	validateProviderDetectionStoreValue,
	validateModelProfileStoreValue,
	validateSpecKitSyncStoreValue,
	validateMcpWarmupEvidenceStoreValue,
} from '@positron/shared';
import type { OpenCodeProviderDetectionEvidence } from '@positron/shared';
import type { OpenCodeModelProfile } from '@positron/shared';
import type { PositronProviderProfile } from '@positron/shared';
import type { McpWarmupEvidence } from '@positron/shared';

// ═══════════════════════════════════════════════════════════════════════════
// Schema
// ═══════════════════════════════════════════════════════════════════════════

const SCHEMA_INFRASTRUCTURE_STATE = `
CREATE TABLE IF NOT EXISTS infrastructure_state (
	kind TEXT NOT NULL,
	key TEXT NOT NULL,
	value_json TEXT NOT NULL,
	evidence_ref TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	PRIMARY KEY (kind, key)
);
`;

/**
 * Ensures the infrastructure_state table exists.
 * Idempotent — safe to call on every startup.
 */
export function ensureInfrastructureStateSchema(db: Database.Database): void {
	db.exec(SCHEMA_INFRASTRUCTURE_STATE);
}

// ═══════════════════════════════════════════════════════════════════════════
// SQLite Infrastructure State Store Factory
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Store keys used in the infrastructure_state table.
 */
const KEY_PROVIDER_DETECTION = 'provider_detection_active';
const KEY_MODEL_PROFILE = 'model_profile_active';
const KEY_SPEC_KIT_SYNC = 'speckit_sync_active';
const MCP_EVIDENCE_KIND = 'mcp_warmup_evidence';

/**
 * Creates SQLite-backed infrastructure state stores.
 *
 * Uses the existing better-sqlite3 Database instance.
 *
 * SECURITY:
 * - Read operations are pure queries — no runtime started
 * - Write operations use BEGIN IMMEDIATE + short transactions
 * - JSON is validated before storage
 * - No runtime execution of any kind
 */
export function createSqliteInfrastructureStateStores(
	db: Database.Database,
): InfrastructureStateStores {
	// Ensure schema exists
	ensureInfrastructureStateSchema(db);

	// ── Provider Detection Store ────────────────────────────────────────
	const providerDetectionStore: ProviderDetectionStore = {
		getLatest(): Promise<OpenCodeProviderDetectionEvidence | undefined> {
			const row = db
				.prepare(
					'SELECT value_json FROM infrastructure_state WHERE kind = ? AND key = ?',
				)
				.get(
					'provider_detection',
					KEY_PROVIDER_DETECTION,
				) as { value_json: string } | undefined;

			if (!row) return undefined;

			try {
				return JSON.parse(row.value_json) as OpenCodeProviderDetectionEvidence;
			} catch {
				return undefined;
			}
		},

		upsert(value: OpenCodeProviderDetectionEvidence): Promise<void> {
			// Validate before storing
			const validation = validateProviderDetectionStoreValue(value);
			if (!validation.valid) {
				throw new Error(
					`Invalid provider detection evidence: ${validation.reasons.join('; ')}`,
				);
			}

			const now = new Date().toISOString();
			const valueJson = JSON.stringify(value);

			// Check if row exists
			const existing = db
				.prepare(
					'SELECT kind FROM infrastructure_state WHERE kind = ? AND key = ?',
				)
				.get('provider_detection', KEY_PROVIDER_DETECTION);

			// BEGIN IMMEDIATE for write safety
			db.prepare('BEGIN IMMEDIATE').run();

			try {
				if (existing) {
					db.prepare(
						`UPDATE infrastructure_state
						 SET value_json = ?, evidence_ref = ?, updated_at = ?
						 WHERE kind = ? AND key = ?`,
					).run(
						valueJson,
						value.evidenceId,
						now,
						'provider_detection',
						KEY_PROVIDER_DETECTION,
					);
				} else {
					db.prepare(
						`INSERT INTO infrastructure_state
						 (kind, key, value_json, evidence_ref, created_at, updated_at)
						 VALUES (?, ?, ?, ?, ?, ?)`,
					).run(
						'provider_detection',
						KEY_PROVIDER_DETECTION,
						valueJson,
						value.evidenceId,
						now,
						now,
					);
				}
				db.prepare('COMMIT').run();
			} catch (err) {
				db.prepare('ROLLBACK').run();
				throw err;
			}
		},
	};

	// ── Model Profile Store ─────────────────────────────────────────────
	const modelProfileStore: ModelProfileStore = {
		getActive(): Promise<OpenCodeModelProfile | undefined> {
			const row = db
				.prepare(
					'SELECT value_json FROM infrastructure_state WHERE kind = ? AND key = ?',
				)
				.get('model_profile', KEY_MODEL_PROFILE) as
				| { value_json: string }
				| undefined;

			if (!row) return undefined;

			try {
				return JSON.parse(row.value_json) as OpenCodeModelProfile;
			} catch {
				return undefined;
			}
		},

		setActive(value: OpenCodeModelProfile): Promise<void> {
			const validation = validateModelProfileStoreValue(value);
			if (!validation.valid) {
				throw new Error(
					`Invalid model profile: ${validation.reasons.join('; ')}`,
				);
			}

			const now = new Date().toISOString();
			const valueJson = JSON.stringify(value);

			const existing = db
				.prepare(
					'SELECT kind FROM infrastructure_state WHERE kind = ? AND key = ?',
				)
				.get('model_profile', KEY_MODEL_PROFILE);

			db.prepare('BEGIN IMMEDIATE').run();
			try {
				if (existing) {
					db.prepare(
						`UPDATE infrastructure_state
						 SET value_json = ?, evidence_ref = ?, updated_at = ?
						 WHERE kind = ? AND key = ?`,
					).run(
						valueJson,
						value.profileId,
						now,
						'model_profile',
						KEY_MODEL_PROFILE,
					);
				} else {
					db.prepare(
						`INSERT INTO infrastructure_state
						 (kind, key, value_json, evidence_ref, created_at, updated_at)
						 VALUES (?, ?, ?, ?, ?, ?)`,
					).run(
						'model_profile',
						KEY_MODEL_PROFILE,
						valueJson,
						value.profileId,
						now,
						now,
					);
				}
				db.prepare('COMMIT').run();
			} catch (err) {
				db.prepare('ROLLBACK').run();
				throw err;
			}
		},
	};

	// ── Spec Kit Sync Store ─────────────────────────────────────────────
	const specKitSyncStore: SpecKitSyncStateStore = {
		getActive(): Promise<PositronProviderProfile | undefined> {
			const row = db
				.prepare(
					'SELECT value_json FROM infrastructure_state WHERE kind = ? AND key = ?',
				)
				.get('speckit_sync', KEY_SPEC_KIT_SYNC) as
				| { value_json: string }
				| undefined;

			if (!row) return undefined;

			try {
				return JSON.parse(row.value_json) as PositronProviderProfile;
			} catch {
				return undefined;
			}
		},

		setActive(value: PositronProviderProfile): Promise<void> {
			const validation = validateSpecKitSyncStoreValue(value);
			if (!validation.valid) {
				throw new Error(
					`Invalid SpecKit sync profile: ${validation.reasons.join('; ')}`,
				);
			}

			const now = new Date().toISOString();
			const valueJson = JSON.stringify(value);

			const existing = db
				.prepare(
					'SELECT kind FROM infrastructure_state WHERE kind = ? AND key = ?',
				)
				.get('speckit_sync', KEY_SPEC_KIT_SYNC);

			db.prepare('BEGIN IMMEDIATE').run();
			try {
				if (existing) {
					db.prepare(
						`UPDATE infrastructure_state
						 SET value_json = ?, evidence_ref = ?, updated_at = ?
						 WHERE kind = ? AND key = ?`,
					).run(
						valueJson,
						value.profileId,
						now,
						'speckit_sync',
						KEY_SPEC_KIT_SYNC,
					);
				} else {
					db.prepare(
						`INSERT INTO infrastructure_state
						 (kind, key, value_json, evidence_ref, created_at, updated_at)
						 VALUES (?, ?, ?, ?, ?, ?)`,
					).run(
						'speckit_sync',
						KEY_SPEC_KIT_SYNC,
						valueJson,
						value.profileId,
						now,
						now,
					);
				}
				db.prepare('COMMIT').run();
			} catch (err) {
				db.prepare('ROLLBACK').run();
				throw err;
			}
		},
	};

	// ── MCP Warm-up Evidence Store ──────────────────────────────────────
	const mcpWarmupEvidenceStore: McpWarmupEvidenceStore = {
		listLatest(): Promise<McpWarmupEvidence[]> {
			const rows = db
				.prepare(
					'SELECT value_json FROM infrastructure_state WHERE kind = ?',
				)
				.all(MCP_EVIDENCE_KIND) as { value_json: string }[];

			return rows
				.map((row) => {
					try {
						return JSON.parse(row.value_json) as McpWarmupEvidence;
					} catch {
						return null;
					}
				})
				.filter((v): v is McpWarmupEvidence => v !== null);
		},

		upsert(value: McpWarmupEvidence): Promise<void> {
			const validation = validateMcpWarmupEvidenceStoreValue(value);
			if (!validation.valid) {
				throw new Error(
					`Invalid MCP warm-up evidence: ${validation.reasons.join('; ')}`,
				);
			}

			const now = new Date().toISOString();
			const valueJson = JSON.stringify(value);
			const key = `mcp_${value.serverId}`;

			const existing = db
				.prepare(
					'SELECT kind FROM infrastructure_state WHERE kind = ? AND key = ?',
				)
				.get(MCP_EVIDENCE_KIND, key);

			db.prepare('BEGIN IMMEDIATE').run();
			try {
				if (existing) {
					db.prepare(
						`UPDATE infrastructure_state
						 SET value_json = ?, evidence_ref = ?, updated_at = ?
						 WHERE kind = ? AND key = ?`,
					).run(
						valueJson,
						value.evidenceId,
						now,
						MCP_EVIDENCE_KIND,
						key,
					);
				} else {
					db.prepare(
						`INSERT INTO infrastructure_state
						 (kind, key, value_json, evidence_ref, created_at, updated_at)
						 VALUES (?, ?, ?, ?, ?, ?)`,
					).run(
						MCP_EVIDENCE_KIND,
						key,
						valueJson,
						value.evidenceId,
						now,
						now,
					);
				}
				db.prepare('COMMIT').run();
			} catch (err) {
				db.prepare('ROLLBACK').run();
				throw err;
			}
		},
	};

	return {
		providerDetection: providerDetectionStore,
		modelProfile: modelProfileStore,
		specKitSync: specKitSyncStore,
		mcpWarmupEvidence: mcpWarmupEvidenceStore,
	};
}
