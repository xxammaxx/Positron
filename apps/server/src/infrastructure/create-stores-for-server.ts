// Positron — Infrastructure State Store Factory for Server Startup
// PR 13: Wires the SQLite-backed infrastructure state stores from PR 12/PR 241
// into the server startup. Defaults to SQLite when a DB is available,
// falls back to in-memory for tests or when no DB is configured.
// ---------------------------------------------------------------------------
// SECURITY:
// - Read-only gate evaluation — NEVER starts runtime
// - Store mode selection is pure config — no side effects
// - SQLite transactions use BEGIN IMMEDIATE + ROLLBACK (enforced in adapter)
// - No DB/WAL/SHM files committed
// - Missing state → gates report missing/not_checked
// - No fake PASS states
// ---------------------------------------------------------------------------

import type Database from 'better-sqlite3';
import type { InfrastructureStateStores } from '@positron/shared';
import { createInMemoryInfrastructureStateStores } from '@positron/shared';
import { createSqliteInfrastructureStateStores } from './infrastructure-state-store-sqlite.js';

/**
 * Store mode configuration.
 *
 * - `sqlite`: Uses the existing better-sqlite3 Database from @positron/run-state.
 *   Schema is created idempotently on first use.
 * - `memory`: Uses fully in-memory stores. Data is lost on restart.
 *   Suitable for tests and environments without a persistent DB.
 */
export type InfrastructureStoreMode = 'sqlite' | 'memory';

/**
 * Options for creating infrastructure state stores for the server.
 */
export interface CreateStoresForServerOptions {
	/** Store mode — defaults to 'sqlite' if DB is provided, otherwise 'memory'. */
	mode?: InfrastructureStoreMode;
	/** The better-sqlite3 Database instance (required for 'sqlite' mode). */
	db?: Database.Database;
	/** Optional timestamp function for deterministic testing. */
	now?: () => string;
}

/**
 * Result of creating infrastructure state stores for the server.
 */
export interface CreateStoresForServerResult {
	/** The infrastructure state stores (read-only gate evaluation, no runtime). */
	stores: InfrastructureStateStores;
	/** The mode that was actually used (resolved from env or explicit option). */
	mode: InfrastructureStoreMode;
	/** Human-readable reason for the mode selection (for logging/debugging). */
	reason: string;
}

/**
 * Resolves the store mode from environment and options.
 *
 * Priority:
 * 1. Explicit `mode` option passed to function
 * 2. `POSITRON_INFRASTRUCTURE_STORE` environment variable
 * 3. Default: `sqlite` if database is provided, `memory` otherwise
 *
 * Tests set `POSITRON_INFRASTRUCTURE_STORE=memory` to avoid persistent DB dependency.
 */
function resolveStoreMode(
	options: CreateStoresForServerOptions,
): { mode: InfrastructureStoreMode; reason: string } {
	// 1. Explicit option takes highest priority
	if (options.mode) {
		return {
			mode: options.mode,
			reason: `Explicit mode option: ${options.mode}`,
		};
	}

	// 2. Environment variable
	const envMode = process.env['POSITRON_INFRASTRUCTURE_STORE'];
	if (envMode === 'sqlite' || envMode === 'memory') {
		if (envMode === 'sqlite' && !options.db) {
			return {
				mode: 'memory',
				reason:
					'POSITRON_INFRASTRUCTURE_STORE=sqlite but no database provided — falling back to memory',
			};
		}
		return {
			mode: envMode,
			reason: `POSITRON_INFRASTRUCTURE_STORE=${envMode}`,
		};
	}

	// 3. Default: SQLite if DB available, memory otherwise
	if (options.db) {
		return {
			mode: 'sqlite',
			reason: 'Default: SQLite (database available)',
		};
	}

	return {
		mode: 'memory',
		reason: 'Default: memory (no database provided, e.g., test environment)',
	};
}

/**
 * Creates infrastructure state stores for the Positron server.
 *
 * This is the SINGLE point of store creation for the server process.
 * All gate evaluation (infrastructure gates status endpoint, blueprint handoff)
 * reads from these stores. Missing state → gates report missing/not_checked.
 *
 * ## Store Modes
 *
 * ### `sqlite` (default for server with DB)
 * - Uses the existing better-sqlite3 Database from @positron/run-state
 * - Schema is created idempotently (CREATE TABLE IF NOT EXISTS)
 * - Data persists across server restarts
 * - All writes use BEGIN IMMEDIATE with ROLLBACK on error
 * - busy_timeout and WAL mode inherited from run-state DB config
 *
 * ### `memory` (default for tests, fallback)
 * - Fully in-memory — data is lost on restart
 * - No filesystem access required
 * - Suitable for unit tests and CI environments
 *
 * ## Env Configuration
 *
 * | Variable | Values | Default |
 * |---|---|---|
 * | `POSITRON_INFRASTRUCTURE_STORE` | `sqlite`, `memory` | `sqlite` (if DB) / `memory` (no DB) |
 *
 * ## Safety
 * - NEVER starts any runtime (OpenCode, MCP, SpecKit, Tool Gateway)
 * - NEVER installs or downloads anything
 * - Read operations are pure queries
 * - Missing stores → undefined (gates will report missing/not_checked)
 * - No fake PASS values
 */
export function createInfrastructureStateStoresForServer(
	options: CreateStoresForServerOptions = {},
): CreateStoresForServerResult {
	const { mode, reason } = resolveStoreMode(options);

	let stores: InfrastructureStateStores;

	switch (mode) {
		case 'sqlite': {
			if (!options.db) {
				// This should not happen — resolveStoreMode handles the fallback
				throw new Error(
					'SQLite mode requested but no database instance provided',
				);
			}
			stores = createSqliteInfrastructureStateStores(options.db);
			break;
		}

		case 'memory':
		default: {
			stores = createInMemoryInfrastructureStateStores();
			break;
		}
	}

	return { stores, mode, reason };
}
