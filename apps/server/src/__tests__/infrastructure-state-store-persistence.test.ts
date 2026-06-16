// Positron — Infrastructure State Store Persistence Tests
// PR 13: Tests for SQLite-backed persistence, store mode selection,
// re-creation survival, and database safety.
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import {
	createInfrastructureStateStoresForServer,
	type InfrastructureStoreMode,
	type CreateStoresForServerOptions,
} from '../infrastructure/create-stores-for-server.js';
import { createSqliteInfrastructureStateStores } from '../infrastructure/infrastructure-state-store-sqlite.js';
import {
	ensureInfrastructureStateSchema,
} from '../infrastructure/infrastructure-state-store-sqlite.js';
import type { InfrastructureStateStores } from '@positron/shared';

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

interface TestProviderDetection {
	evidenceId: string;
	detectionStatus: 'version_checked' | 'not_installed' | 'error' | 'not_requested';
	installStatus: 'not_requested' | 'requested' | 'installed' | 'failed';
	runtimeStatus: 'not_started' | 'installed_verified' | 'error';
	version: string;
	helpAvailable: boolean;
	secretsDetected: boolean;
	privatePathsDetected: boolean;
	redactionApplied: boolean;
	blockedReasons: string[];
	createdAt: string;
}

interface TestModelProfile {
	profileId: string;
	displayName: string;
	providerId: string;
	modelId: string;
	opencodeModelRef: string;
	costClass: string;
	executionClass: string;
	baseURL: string;
	requiresApiKey: boolean;
	apiKeyStoragePolicy: string;
	allowedForDemo: boolean;
	allowedForRealRuns: boolean;
	capabilities: string[];
	requiresWarmup: boolean;
	warmupStatus: string;
	warmupLevel: number;
	maxRiskLevel: string;
	notes: string[];
}

interface TestProviderProfile {
	profileId: string;
	opencodeBinaryPath: string;
	opencodeVersion: string;
	opencodeConfigPath: string;
	opencodeModelProfileId: string;
	opencodeModelRef: string;
	specKitBinaryPath: string;
	specKitVersion: string;
	specKitInstallSource: 'github/spec-kit';
	specKitInstallRef: string;
	specKitMode: 'adapter_bridge';
	mcpWarmupStatus: 'pass' | 'partial' | 'fail' | 'unknown';
	modelWarmupStatus: 'pass' | 'partial' | 'fail' | 'unknown';
	specKitSyncStatus: 'unknown' | 'synced' | 'needs_resync' | 'partial' | 'blocked' | 'fail';
	providerProfileReadiness: 'not_ready' | 'ready_for_demo' | 'ready_for_real' | 'blocked';
	readyForDemoRuns: boolean;
	readyForRealRuns: boolean;
	reSyncReasons: string[];
}

interface TestMcpPhaseResult {
	phase: string;
	status: 'unknown' | 'pending' | 'pass' | 'partial' | 'fail' | 'blocked';
	message: string;
}

interface TestMcpEvidence {
	evidenceId: string;
	serverId: string;
	status: 'unknown' | 'pending' | 'pass' | 'partial' | 'fail' | 'blocked';
	startedAt: string;
	phases: TestMcpPhaseResult[];
	listedTools: string[];
	forbiddenToolChecks: { toolName: string; expected: 'absent' | 'forbidden' | 'requires_human_approval'; actual: 'absent' | 'allowed' | 'forbidden' | 'requires_human_approval'; status: 'pass' | 'fail' }[];
	redactionApplied: boolean;
	secretsDetected: boolean;
	privatePathsDetected: boolean;
	realRunAllowed: boolean;
	blockedReasons: string[];
}

function makeProviderDetection(overrides: Partial<TestProviderDetection> = {}): TestProviderDetection {
	return {
		evidenceId: 'ev-provider-test-001',
		detectionStatus: 'version_checked',
		installStatus: 'not_requested',
		runtimeStatus: 'installed_verified',
		version: '1.0.0',
		helpAvailable: true,
		secretsDetected: false,
		privatePathsDetected: false,
		redactionApplied: true,
		blockedReasons: [],
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

function makeModelProfile(overrides: Partial<TestModelProfile> = {}): TestModelProfile {
	return {
		profileId: 'free-local-ollama',
		displayName: 'Ollama (Local)',
		providerId: 'ollama',
		modelId: 'gemma3:12b',
		opencodeModelRef: 'ollama/gemma3:12b',
		costClass: 'free_local',
		executionClass: 'local',
		baseURL: 'http://localhost:11434',
		requiresApiKey: false,
		apiKeyStoragePolicy: 'not_required',
		allowedForDemo: true,
		allowedForRealRuns: true,
		capabilities: ['code_generation', 'tool_calling'],
		requiresWarmup: true,
		warmupStatus: 'pass',
		warmupLevel: 4,
		maxRiskLevel: 'medium',
		notes: ['Local model via Ollama'],
		...overrides,
	};
}

function makeProviderProfile(overrides: Partial<TestProviderProfile> = {}): TestProviderProfile {
	return {
		profileId: 'profile-test-001',
		opencodeBinaryPath: '/opt/positron/tools/bin/opencode',
		opencodeVersion: '1.0.0',
		opencodeConfigPath: '/opt/positron/tools/config/opencode.json',
		opencodeModelProfileId: 'free-local-ollama',
		opencodeModelRef: 'ollama/gemma3:12b',
		specKitBinaryPath: '/opt/positron/tools/bin/speckit',
		specKitVersion: '2.0.0',
		specKitInstallSource: 'github/spec-kit',
		specKitInstallRef: 'v2.0.0',
		specKitMode: 'adapter_bridge',
		mcpWarmupStatus: 'pass',
		modelWarmupStatus: 'pass',
		specKitSyncStatus: 'synced',
		providerProfileReadiness: 'ready_for_real',
		readyForDemoRuns: true,
		readyForRealRuns: true,
		reSyncReasons: [],
		...overrides,
	};
}

function makeMcpEvidence(overrides: Partial<TestMcpEvidence> = {}): TestMcpEvidence {
	return {
		evidenceId: 'ev-mcp-test-001',
		serverId: 'test-mcp-server',
		status: 'pass',
		startedAt: new Date().toISOString(),
		phases: [
			{ phase: 'connect', status: 'pass', message: 'Connected successfully' },
			{ phase: 'initialize', status: 'pass', message: 'Initialized' },
			{ phase: 'list_tools', status: 'pass', message: 'Tools listed' },
			{ phase: 'capability_manifest', status: 'pass', message: 'Capability manifest loaded' },
			{ phase: 'allowlist_check', status: 'pass', message: 'Allowlist valid' },
			{ phase: 'read_smoke', status: 'pass', message: 'Read smoke passed' },
			{ phase: 'write_smoke_temp_workspace', status: 'pass', message: 'Write smoke passed' },
			{ phase: 'forbidden_tool_check', status: 'pass', message: 'No forbidden tools' },
			{ phase: 'redaction_check', status: 'pass', message: 'Redaction OK' },
			{ phase: 'evidence_written', status: 'pass', message: 'Evidence generated' },
		],
		listedTools: ['tool1', 'tool2', 'tool3'],
		forbiddenToolChecks: [],
		redactionApplied: true,
		secretsDetected: false,
		privatePathsDetected: false,
		realRunAllowed: true,
		blockedReasons: [],
		...overrides,
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests: createInfrastructureStateStoresForServer
// ═══════════════════════════════════════════════════════════════════════════

describe('createInfrastructureStateStoresForServer', () => {
	describe('store mode resolution', () => {
		it('returns memory mode when no DB is provided', () => {
			const result = createInfrastructureStateStoresForServer({});
			expect(result.mode).toBe('memory');
			expect(result.reason).toContain('memory');
			expect(result.stores).toBeDefined();
			expect(result.stores.providerDetection).toBeDefined();
			expect(result.stores.modelProfile).toBeDefined();
			expect(result.stores.specKitSync).toBeDefined();
			expect(result.stores.mcpWarmupEvidence).toBeDefined();
		});

		it('returns sqlite mode when DB is provided', () => {
			const db = new Database(':memory:');
			try {
				const result = createInfrastructureStateStoresForServer({ db });
				expect(result.mode).toBe('sqlite');
				expect(result.reason).toContain('SQLite');
				expect(result.stores).toBeDefined();
			} finally {
				db.close();
			}
		});

		it('respects explicit mode: memory', () => {
			const result = createInfrastructureStateStoresForServer({ mode: 'memory' });
			expect(result.mode).toBe('memory');
			expect(result.reason).toContain('Explicit');
		});

		it('respects explicit mode: sqlite (requires DB)', () => {
			const db = new Database(':memory:');
			try {
				const result = createInfrastructureStateStoresForServer({ mode: 'sqlite', db });
				expect(result.mode).toBe('sqlite');
				expect(result.reason).toContain('Explicit');
			} finally {
				db.close();
			}
		});

		it('falls back to memory when sqlite mode is set but no DB', () => {
			// Simulate env var setting sqlite but no DB
			const original = process.env['POSITRON_INFRASTRUCTURE_STORE'];
			process.env['POSITRON_INFRASTRUCTURE_STORE'] = 'sqlite';
			try {
				const result = createInfrastructureStateStoresForServer({});
				expect(result.mode).toBe('memory');
				expect(result.reason).toContain('falling back');
			} finally {
				if (original !== undefined) {
					process.env['POSITRON_INFRASTRUCTURE_STORE'] = original;
				} else {
					delete process.env['POSITRON_INFRASTRUCTURE_STORE'];
				}
			}
		});

		it('respects POSITRON_INFRASTRUCTURE_STORE=memory env var', () => {
			const original = process.env['POSITRON_INFRASTRUCTURE_STORE'];
			process.env['POSITRON_INFRASTRUCTURE_STORE'] = 'memory';
			try {
				const db = new Database(':memory:');
				try {
					const result = createInfrastructureStateStoresForServer({ db });
					expect(result.mode).toBe('memory');
					expect(result.reason).toContain('POSITRON_INFRASTRUCTURE_STORE=memory');
				} finally {
					db.close();
				}
			} finally {
				if (original !== undefined) {
					process.env['POSITRON_INFRASTRUCTURE_STORE'] = original;
				} else {
					delete process.env['POSITRON_INFRASTRUCTURE_STORE'];
				}
			}
		});

		it('ignores invalid POSITRON_INFRASTRUCTURE_STORE values', () => {
			const original = process.env['POSITRON_INFRASTRUCTURE_STORE'];
			process.env['POSITRON_INFRASTRUCTURE_STORE'] = 'invalid_value';
			try {
				const result = createInfrastructureStateStoresForServer({});
				expect(result.mode).toBe('memory');
				expect(result.reason).not.toContain('invalid_value');
			} finally {
				if (original !== undefined) {
					process.env['POSITRON_INFRASTRUCTURE_STORE'] = original;
				} else {
					delete process.env['POSITRON_INFRASTRUCTURE_STORE'];
				}
			}
		});
	});

	describe('env var priority', () => {
		it('explicit mode option overrides env var', () => {
			const original = process.env['POSITRON_INFRASTRUCTURE_STORE'];
			process.env['POSITRON_INFRASTRUCTURE_STORE'] = 'sqlite';
			try {
				const result = createInfrastructureStateStoresForServer({ mode: 'memory' });
				expect(result.mode).toBe('memory');
				expect(result.reason).toContain('Explicit');
			} finally {
				if (original !== undefined) {
					process.env['POSITRON_INFRASTRUCTURE_STORE'] = original;
				} else {
					delete process.env['POSITRON_INFRASTRUCTURE_STORE'];
				}
			}
		});
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Tests: SQLite Persistence
// ═══════════════════════════════════════════════════════════════════════════

describe('SQLite Infrastructure State Store Persistence', () => {
	let db: ReturnType<typeof Database>;

	beforeEach(() => {
		db = new Database(':memory:');
		ensureInfrastructureStateSchema(db);
	});

	afterEach(() => {
		db.close();
	});

	describe('provider detection persistence', () => {
		it('can persist provider detection and read after store recreation', async () => {
			// Create stores with the DB
			const stores1 = createSqliteInfrastructureStateStores(db);
			const detection = makeProviderDetection({ evidenceId: 'ev-persist-001', version: '2.0.0' });

			await stores1.providerDetection.upsert(detection as any);

			// Re-create stores with the SAME DB
			const stores2 = createSqliteInfrastructureStateStores(db);
			const read = await stores2.providerDetection.getLatest();

			expect(read).toBeDefined();
			expect(read!.evidenceId).toBe('ev-persist-001');
			expect(read!.version).toBe('2.0.0');
			expect(read!.detectionStatus).toBe('version_checked');
		});

		it('returns undefined for never-stored provider detection', async () => {
			const stores = createSqliteInfrastructureStateStores(db);
			const read = await stores.providerDetection.getLatest();
			expect(read).toBeUndefined();
		});

		it('upsert overwrites previous provider detection', async () => {
			const stores = createSqliteInfrastructureStateStores(db);

			await stores.providerDetection.upsert(makeProviderDetection({ version: '1.0.0' }) as any);
			await stores.providerDetection.upsert(makeProviderDetection({ version: '2.0.0' }) as any);

			const read = await stores.providerDetection.getLatest();
			expect(read!.version).toBe('2.0.0');
		});
	});

	describe('model profile persistence', () => {
		it('can persist model profile and read after store recreation', async () => {
			const stores1 = createSqliteInfrastructureStateStores(db);
			const profile = makeModelProfile({ profileId: 'free-local-lmstudio', modelId: 'qwen2.5:14b' });

			await stores1.modelProfile.setActive(profile as any);

			const stores2 = createSqliteInfrastructureStateStores(db);
			const read = await stores2.modelProfile.getActive();

			expect(read).toBeDefined();
			expect(read!.profileId).toBe('free-local-lmstudio');
			expect(read!.modelId).toBe('qwen2.5:14b');
		});

		it('returns undefined for never-set model profile', async () => {
			const stores = createSqliteInfrastructureStateStores(db);
			const read = await stores.modelProfile.getActive();
			expect(read).toBeUndefined();
		});

		it('setActive overwrites previous model profile', async () => {
			const stores = createSqliteInfrastructureStateStores(db);

			await stores.modelProfile.setActive(makeModelProfile({ profileId: 'first' }) as any);
			await stores.modelProfile.setActive(makeModelProfile({ profileId: 'second' }) as any);

			const read = await stores.modelProfile.getActive();
			expect(read!.profileId).toBe('second');
		});
	});

	describe('SpecKit sync profile persistence', () => {
		it('can persist and read after store recreation', async () => {
			const stores1 = createSqliteInfrastructureStateStores(db);
			const profile = makeProviderProfile({ profileId: 'sync-test-001', specKitVersion: '3.0.0' });

			await stores1.specKitSync.setActive(profile as any);

			const stores2 = createSqliteInfrastructureStateStores(db);
			const read = await stores2.specKitSync.getActive();

			expect(read).toBeDefined();
			expect(read!.profileId).toBe('sync-test-001');
			expect(read!.specKitVersion).toBe('3.0.0');
		});

		it('returns undefined for never-set sync profile', async () => {
			const stores = createSqliteInfrastructureStateStores(db);
			const read = await stores.specKitSync.getActive();
			expect(read).toBeUndefined();
		});
	});

	describe('MCP warm-up evidence persistence', () => {
		it('can persist and list after store recreation', async () => {
			const stores1 = createSqliteInfrastructureStateStores(db);
			const evidence = makeMcpEvidence({ serverId: 'mcp-persist-test', evidenceId: 'ev-mcp-persist' });

			await stores1.mcpWarmupEvidence.upsert(evidence as any);

			const stores2 = createSqliteInfrastructureStateStores(db);
			const list = await stores2.mcpWarmupEvidence.listLatest();

			expect(list).toHaveLength(1);
			expect(list[0].serverId).toBe('mcp-persist-test');
			expect(list[0].evidenceId).toBe('ev-mcp-persist');
		});

		it('returns empty array when no evidence stored', async () => {
			const stores = createSqliteInfrastructureStateStores(db);
			const list = await stores.mcpWarmupEvidence.listLatest();
			expect(list).toEqual([]);
		});

		it('upsert for same server overwrites previous evidence', async () => {
			const stores = createSqliteInfrastructureStateStores(db);

			await stores.mcpWarmupEvidence.upsert(makeMcpEvidence({ serverId: 'same-server', warmupStatus: 'fail' }) as any);
			await stores.mcpWarmupEvidence.upsert(makeMcpEvidence({ serverId: 'same-server', warmupStatus: 'pass' }) as any);

			const list = await stores.mcpWarmupEvidence.listLatest();
			expect(list).toHaveLength(1);
			expect(list[0].warmupStatus).toBe('pass');
		});

		it('can store evidence for multiple different servers', async () => {
			const stores = createSqliteInfrastructureStateStores(db);

			await stores.mcpWarmupEvidence.upsert(makeMcpEvidence({ serverId: 'server-a' }) as any);
			await stores.mcpWarmupEvidence.upsert(makeMcpEvidence({ serverId: 'server-b' }) as any);
			await stores.mcpWarmupEvidence.upsert(makeMcpEvidence({ serverId: 'server-c' }) as any);

			const list = await stores.mcpWarmupEvidence.listLatest();
			expect(list).toHaveLength(3);
			const ids = list.map(e => e.serverId).sort();
			expect(ids).toEqual(['server-a', 'server-b', 'server-c']);
		});
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Tests: Sequential Writes (No database-is-locked)
// ═══════════════════════════════════════════════════════════════════════════

describe('SQLite Store Sequential Write Safety', () => {
	let db: ReturnType<typeof Database>;

	beforeEach(() => {
		db = new Database(':memory:');
		ensureInfrastructureStateSchema(db);
	});

	afterEach(() => {
		db.close();
	});

	it('sequential writes do not produce database-is-locked', async () => {
		const stores = createInfrastructureStateStoresForServer({ mode: 'sqlite', db }).stores;

		// Write 20 records sequentially — no error
		for (let i = 0; i < 20; i++) {
			await stores.providerDetection.upsert(
				makeProviderDetection({ evidenceId: `ev-seq-${i}`, version: `${i}.0.0` }) as any,
			);
		}

		const read = await stores.providerDetection.getLatest();
		expect(read).toBeDefined();
		expect(read!.evidenceId).toBe('ev-seq-19');
	});

	it('sequential writes across different store kinds do not lock', async () => {
		const stores = createInfrastructureStateStoresForServer({ mode: 'sqlite', db }).stores;

		// Interleave writes to different stores
		for (let i = 0; i < 10; i++) {
			await stores.providerDetection.upsert(
				makeProviderDetection({ evidenceId: `ev-mix-${i}` }) as any,
			);
			await stores.modelProfile.setActive(
				makeModelProfile({ profileId: `mix-${i}` }) as any,
			);
			await stores.mcpWarmupEvidence.upsert(
				makeMcpEvidence({ serverId: `mix-server-${i}`, evidenceId: `ev-mix-mcp-${i}` }) as any,
			);
		}

		// All stores should have their latest values
		const detection = await stores.providerDetection.getLatest();
		const profile = await stores.modelProfile.getActive();
		const mcpList = await stores.mcpWarmupEvidence.listLatest();

		expect(detection).toBeDefined();
		expect(profile).toBeDefined();
		expect(mcpList.length).toBe(10);
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Tests: Invalid Payload Fails Before Commit
// ═══════════════════════════════════════════════════════════════════════════

describe('SQLite Store Data Integrity', () => {
	let db: ReturnType<typeof Database>;

	beforeEach(() => {
		db = new Database(':memory:');
		ensureInfrastructureStateSchema(db);
	});

	afterEach(() => {
		db.close();
	});

	it('invalid provider detection (no redaction) fails before commit', async () => {
		const stores = createSqliteInfrastructureStateStores(db);

		// First, store valid data
		await stores.providerDetection.upsert(
			makeProviderDetection({ evidenceId: 'ev-valid' }) as any,
		);

		// Try to store invalid data (redactionApplied: false)
		// Validation throws synchronously before any DB write
		let threw = false;
		try {
			await stores.providerDetection.upsert(
				makeProviderDetection({ evidenceId: 'ev-invalid', redactionApplied: false }) as any,
			);
		} catch {
			threw = true;
		}
		expect(threw).toBe(true);

		// Valid data should still be intact (no write was attempted)
		const read = await stores.providerDetection.getLatest();
		expect(read).toBeDefined();
		expect(read!.evidenceId).toBe('ev-valid');
	});

	it('invalid model profile data does not corrupt existing data', async () => {
		const stores = createSqliteInfrastructureStateStores(db);

		await stores.modelProfile.setActive(
			makeModelProfile({ profileId: 'valid-profile' }) as any,
		);

		// Try null (should fail validation synchronously, no DB write)
		let threw = false;
		try {
			await stores.modelProfile.setActive(null as any);
		} catch {
			threw = true;
		}
		expect(threw).toBe(true);

		// Original valid data intact
		const read = await stores.modelProfile.getActive();
		expect(read).toBeDefined();
		expect(read!.profileId).toBe('valid-profile');
	});

	it('corrupted JSON in database is handled gracefully', async () => {
		// Directly insert corrupted JSON into the table
		db.prepare(
			`INSERT INTO infrastructure_state (kind, key, value_json, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?)`,
		).run('provider_detection', 'provider_detection_active', 'not-valid-json{{{', new Date().toISOString(), new Date().toISOString());

		const stores = createSqliteInfrastructureStateStores(db);
		const read = await stores.providerDetection.getLatest();

		// Should return undefined for corrupted JSON
		expect(read).toBeUndefined();
	});

	it('missing table is handled (schema creation is idempotent)', () => {
		// ensureInfrastructureStateSchema should not throw on second call
		expect(() => ensureInfrastructureStateSchema(db)).not.toThrow();
		// Third call — still no error
		expect(() => ensureInfrastructureStateSchema(db)).not.toThrow();
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Tests: Multiple Store Instances with Same DB
// ═══════════════════════════════════════════════════════════════════════════

describe('SQLite Store Cross-Instance Visibility', () => {
	let db: ReturnType<typeof Database>;

	beforeEach(() => {
		db = new Database(':memory:');
		ensureInfrastructureStateSchema(db);
	});

	afterEach(() => {
		db.close();
	});

	it('two store instances on same DB see each others writes', async () => {
		const storesA = createSqliteInfrastructureStateStores(db);
		const storesB = createSqliteInfrastructureStateStores(db);

		// Write from A
		await storesA.providerDetection.upsert(
			makeProviderDetection({ evidenceId: 'ev-from-a' }) as any,
		);

		// Read from B
		const readB = await storesB.providerDetection.getLatest();
		expect(readB).toBeDefined();
		expect(readB!.evidenceId).toBe('ev-from-a');

		// Write from B
		await storesB.modelProfile.setActive(
			makeModelProfile({ profileId: 'from-b' }) as any,
		);

		// Read from A
		const readA = await storesA.modelProfile.getActive();
		expect(readA).toBeDefined();
		expect(readA!.profileId).toBe('from-b');
	});

	it('two store instances with different DBs are isolated', async () => {
		const db1 = new Database(':memory:');
		const db2 = new Database(':memory:');
		ensureInfrastructureStateSchema(db1);
		ensureInfrastructureStateSchema(db2);

		try {
			const stores1 = createSqliteInfrastructureStateStores(db1);
			const stores2 = createSqliteInfrastructureStateStores(db2);

			// Write to DB1
			await stores1.providerDetection.upsert(
				makeProviderDetection({ evidenceId: 'ev-db1' }) as any,
			);

			// DB2 should not see DB1's data
			const read2 = await stores2.providerDetection.getLatest();
			expect(read2).toBeUndefined();

			// Write to DB2
			await stores2.providerDetection.upsert(
				makeProviderDetection({ evidenceId: 'ev-db2' }) as any,
			);

			// DB1 should still have its own data, not DB2's
			const read1 = await stores1.providerDetection.getLatest();
			expect(read1).toBeDefined();
			expect(read1!.evidenceId).toBe('ev-db1');
		} finally {
			db1.close();
			db2.close();
		}
	});
});

// ═══════════════════════════════════════════════════════════════════════════
// Tests: createInfrastructureStateStoresForServer integration
// ═══════════════════════════════════════════════════════════════════════════

describe('createInfrastructureStateStoresForServer with SQLite DB', () => {
	let db: ReturnType<typeof Database>;

	beforeEach(() => {
		db = new Database(':memory:');
	});

	afterEach(() => {
		db.close();
	});

	it('returns sqlite mode and working stores', async () => {
		const result = createInfrastructureStateStoresForServer({ db });
		expect(result.mode).toBe('sqlite');
		expect(result.stores).toBeDefined();

		// Verify stores work
		await result.stores.providerDetection.upsert(
			makeProviderDetection() as any,
		);
		const read = await result.stores.providerDetection.getLatest();
		expect(read).toBeDefined();
	});

	it('data persists when re-creating stores with same DB (server restart simulation)', async () => {
		// First "server startup" — create stores and populate
		const result1 = createInfrastructureStateStoresForServer({ db });
		await result1.stores.providerDetection.upsert(
			makeProviderDetection({ evidenceId: 'ev-restart-001' }) as any,
		);
		await result1.stores.modelProfile.setActive(
			makeModelProfile({ profileId: 'restart-profile' }) as any,
		);
		await result1.stores.specKitSync.setActive(
			makeProviderProfile({ profileId: 'restart-sync' }) as any,
		);

		// "Server restart" — create new stores with same DB
		const result2 = createInfrastructureStateStoresForServer({ db });

		// All data should survive
		const detection = await result2.stores.providerDetection.getLatest();
		const profile = await result2.stores.modelProfile.getActive();
		const sync = await result2.stores.specKitSync.getActive();

		expect(detection!.evidenceId).toBe('ev-restart-001');
		expect(profile!.profileId).toBe('restart-profile');
		expect(sync!.profileId).toBe('restart-sync');
	});

	it('explicit memory mode ignores the DB', async () => {
		const result = createInfrastructureStateStoresForServer({ mode: 'memory', db });
		expect(result.mode).toBe('memory');

		// Stores work but are in-memory
		await result.stores.providerDetection.upsert(
			makeProviderDetection() as any,
		);

		// With a fresh memory store creation (no DB), data is gone
		const freshResult = createInfrastructureStateStoresForServer({ mode: 'memory' });
		const read = await freshResult.stores.providerDetection.getLatest();
		expect(read).toBeUndefined();
	});
});
