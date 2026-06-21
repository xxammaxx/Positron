// Positron — DeterministicFixtureAgent (Issue #263)
//
// Provides deterministic, fixture-based agent execution for reproducible
// dogfood, prompt, adapter, and pipeline tests. No external LLM, network,
// or OpenCode CLI calls. Same input → same output every time.
//
// Stash Policy: No code from stash@{0} was applied. Implementation is
// original, based on the versioned SpecKit artifacts (spec.md, plan.md, tasks.md).

import fs from 'node:fs';
import path from 'node:path';
import type {
	OpenCodeRunInput,
	OpenCodePhase,
	OpenCodeCommandResult,
	ExecutionMode,
} from '@positron/shared';

// =============================================================================
// Types (package-local, per ADR-D)
// =============================================================================

/**
 * Structured evidence report for fixture execution.
 */
export interface EvidenceReport {
	runId: string;
	executionMode: ExecutionMode;
	timestamp: string;
	source: string;
	durationMs: number;
	status: 'success' | 'partial' | 'blocked' | 'failed';
	simulatedActions: string[];
	blockedActions: { operation: string; reason: string }[];
	reportedActions: string[];
	warnings: string[];
	changedFiles: string[];
	summary: string;
}

/**
 * A single fixture scenario containing ordered phase results.
 */
export interface Fixture {
	/** Human-readable scenario identifier */
	scenario: string;
	/** Ordered phase results to replay */
	phases: Array<{
		phase: OpenCodePhase;
		result: OpenCodeCommandResult;
	}>;
}

/**
 * Configuration for the DeterministicFixtureAgent.
 */
export interface FixtureAgentConfig {
	/** Map from scenario name to fixture data */
	fixtures: Map<string, Fixture>;
	/** Directory for evidence output (default: '.positron/evidence/') */
	evidenceDir?: string;
	/**
	 * Timestamp factory for deterministic testing.
	 * Default: () => new Date().toISOString().
	 * Override with a fixed value for reproducible tests.
	 */
	getTimestamp?: () => string;
}

// =============================================================================
// DeterministicFixtureAgent
// =============================================================================

/**
 * DeterministicFixtureAgent — fixture-driven adapter testing.
 *
 * Replays pre-defined fixture scenarios with deterministic results.
 * No external LLM, network, or CLI calls. Suitable for reproducible
 * test suites, CI, and dogfood validation.
 */
export class DeterministicFixtureAgent {
	private readonly fixtures: Map<string, Fixture>;
	private readonly evidenceDir: string;
	private readonly getTimestamp: () => string;

	constructor(config: FixtureAgentConfig) {
		this.fixtures = config.fixtures;
		this.evidenceDir = config.evidenceDir ?? '.positron/evidence/';
		this.getTimestamp = config.getTimestamp ?? (() => new Date().toISOString());
	}

	/**
	 * Execute a fixture scenario and produce an EvidenceReport.
	 *
	 * @param scenario — Name of the fixture scenario to execute
	 * @param input — OpenCodeRunInput context (runId, workspace, issue info)
	 * @returns EvidenceReport with executionMode='fixture'
	 */
	async execute(scenario: string, input: OpenCodeRunInput): Promise<EvidenceReport> {
		const startTime = Date.now();

		const fixture = this.fixtures.get(scenario);
		if (!fixture) {
			return this.buildReport(input.runId, {
				status: 'failed',
				durationMs: Date.now() - startTime,
				summary: `Fixture scenario "${scenario}" not found`,
				simulatedActions: [],
			});
		}

		// Map fixture phases to simulated actions
		const simulatedActions = fixture.phases.map((p) => p.phase);

		// Build evidence report — deterministic from fixture data
		const report = this.buildReport(input.runId, {
			status: 'success',
			durationMs: Date.now() - startTime,
			summary: `Fixture "${scenario}" executed: ${fixture.phases.length} phase(s) simulated`,
			simulatedActions,
		});

		// Write evidence to .positron/evidence/<runId>.json (controlled path)
		this.writeEvidence(report);

		return report;
	}

	/**
	 * Build an EvidenceReport with deterministic fields.
	 * Timestamps are generated once per call but are the ONLY non-fixture-derived
	 * value. For test determinism, tests should verify structural equality of all
	 * fields except the system-generated timestamp (or the agent should support
	 * timestamp override — currently timestamp is real ISO 8601).
	 */
	private buildReport(
		runId: string,
		opts: {
			status: EvidenceReport['status'];
			durationMs: number;
			summary: string;
			simulatedActions: string[];
		},
	): EvidenceReport {
		return {
			runId,
			executionMode: 'fixture',
			timestamp: this.getTimestamp(),
			source: 'DeterministicFixtureAgent',
			durationMs: opts.durationMs,
			status: opts.status,
			simulatedActions: opts.simulatedActions,
			blockedActions: [],
			reportedActions: [],
			warnings: [],
			changedFiles: [],
			summary: opts.summary,
		};
	}

	/**
	 * Write evidence to .positron/evidence/<runId>.json.
	 * This is the ONLY side effect — writing to a controlled path.
	 * No secrets, tokens, or env vars are included.
	 */
	private writeEvidence(report: EvidenceReport): void {
		try {
			const dir = this.evidenceDir;
			fs.mkdirSync(dir, { recursive: true });
			const filePath = path.join(dir, `${report.runId}.json`);
			fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
			// Evidence files are internal infrastructure, NOT user-visible changed files.
			// changedFiles remains empty for pure fixture runs.
		} catch {
			// Evidence write is non-critical — warn but don't fail
			report.warnings.push('Failed to write evidence file');
		}
	}
}
