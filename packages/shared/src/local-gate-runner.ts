// Positron — Local Gate Runner (Issue #279 Phase 1E)
// Schema, validation helpers and report logic for local verification gates.
// Pure functions only. No shell execution, no network, no mutations.
// Command execution is injected via the LocalCommandRunner interface.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Classification of a local gate. */
export type LocalGateKind = 'required' | 'format' | 'advisory';

/** Status of a single gate after execution. */
export type LocalGateStatus = 'PASS' | 'WARN' | 'FAIL' | 'SKIPPED';

/** Definition of a single local gate to run. */
export interface LocalGateDefinition {
	/** Unique identifier for this gate (e.g., "build", "typecheck"). */
	id: string;
	/** Human-readable label. */
	label: string;
	/** Gate classification. */
	kind: LocalGateKind;
	/** Command to execute (e.g., "npm"). */
	command: string;
	/** Arguments for the command (e.g., ["run", "build"]). */
	args: string[];
	/** Optional working directory. */
	cwd?: string;
	/** Optional timeout in milliseconds. */
	timeoutMs?: number;
}

/** Result of executing a single local gate. */
export interface LocalGateResult {
	id: string;
	label: string;
	kind: LocalGateKind;
	command: string;
	args: string[];
	status: LocalGateStatus;
	exitCode: number | null;
	durationMs: number;
	stdoutSnippet?: string;
	stderrSnippet?: string;
	error?: string;
}

/** Aggregated report from running all local gates. */
export interface LocalGateReport {
	/** Overall status: FAIL if any required gate failed. */
	status: 'PASS' | 'WARN' | 'FAIL';
	total: number;
	passed: number;
	warned: number;
	failed: number;
	skipped: number;
	results: LocalGateResult[];
}

/** Injectable command runner interface (for testing and dry-run). */
export interface LocalCommandRunner {
	run(
		command: string,
		args: string[],
		options: { cwd?: string; timeoutMs?: number },
	): Promise<{
		exitCode: number | null;
		stdout: string;
		stderr: string;
		durationMs: number;
		error?: string;
	}>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Commands allowed for local gate execution. */
const ALLOWED_COMMANDS: ReadonlySet<string> = new Set(['git', 'npm', 'npx']);

/** Max length of stdout/stderr snippets before truncation. */
const MAX_SNIPPET_LENGTH = 2000;

/**
 * Dangerous npm sub-commands that must never be used as local gates.
 */
const DANGEROUS_NPM_SUBCOMMANDS: ReadonlySet<string> = new Set([
	'install',
	'update',
	'audit',
	'init',
	'uninstall',
	'link',
	'publish',
]);

/**
 * Dangerous git sub-commands (stash operations are explicitly forbidden).
 */
const DANGEROUS_GIT_SUBCOMMANDS: ReadonlySet<string> = new Set([
	'stash',
	'push',
	'commit',
	'merge',
	'rebase',
	'cherry-pick',
	'tag',
]);

/**
 * Args that contain dangerous patterns (checked by substring).
 * --write is the primary concern for auto-fix commands.
 */
const DANGEROUS_ARG_PATTERNS: ReadonlyArray<string> = ['--write', '--fix', '--force'];

/**
 * Explicitly blocked command+args combinations (joint check).
 * Format: "command::arg0::arg1" — checked against first 3 tokens.
 */
const BLOCKED_COMMAND_COMBOS: ReadonlySet<string> = new Set([
	// git stash operations
	'git::stash::apply',
	'git::stash::pop',
	'git::stash::drop',
	'git::stash::push',
	// npm dangerous operations
	'npm::install::',
	'npm::update::',
	'npm::audit::',
	'npm::uninstall::',
	'npm::publish::',
]);

// ---------------------------------------------------------------------------
// Default gate definitions
// ---------------------------------------------------------------------------

/**
 * Returns the default set of local gates for the Positron project.
 *
 * Required: git diff --check, build, typecheck, test, test --workspace apps/web
 * Format: npx biome format .
 * Advisory: npx biome check ., npx biome lint .
 */
export function getDefaultLocalGateDefinitions(): LocalGateDefinition[] {
	return [
		{
			id: 'git-diff-check',
			label: 'Git Diff Check',
			kind: 'required',
			command: 'git',
			args: ['diff', '--check'],
		},
		{
			id: 'build',
			label: 'Build',
			kind: 'required',
			command: 'npm',
			args: ['run', 'build'],
		},
		{
			id: 'typecheck',
			label: 'Typecheck',
			kind: 'required',
			command: 'npm',
			args: ['run', 'typecheck'],
		},
		{
			id: 'test',
			label: 'Tests (all packages)',
			kind: 'required',
			command: 'npm',
			args: ['test'],
		},
		{
			id: 'test-web',
			label: 'Tests (apps/web)',
			kind: 'required',
			command: 'npm',
			args: ['test', '--workspace', 'apps/web'],
		},
		{
			id: 'format',
			label: 'Biome Format',
			kind: 'format',
			command: 'npx',
			args: ['biome', 'format', '.'],
		},
		{
			id: 'biome-check',
			label: 'Biome Check (advisory)',
			kind: 'advisory',
			command: 'npx',
			args: ['biome', 'check', '.'],
		},
		{
			id: 'biome-lint',
			label: 'Biome Lint (advisory)',
			kind: 'advisory',
			command: 'npx',
			args: ['biome', 'lint', '.'],
		},
	];
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Truncate a string to MAX_SNIPPET_LENGTH.
 * Appends "... (truncated)" if truncation occurred.
 */
export function truncateSnippet(text: string): string {
	if (text.length <= MAX_SNIPPET_LENGTH) {
		return text;
	}
	return text.slice(0, MAX_SNIPPET_LENGTH) + `\n... (truncated, ${text.length} total chars)`;
}

/**
 * Validate a local gate definition for safety.
 *
 * Checks:
 * - Command is on the allowlist (git, npm, npx).
 * - No dangerous npm/git sub-commands.
 * - No dangerous arg patterns (--write, --fix, --force).
 * - No blocked command combinations.
 *
 * @param gate - The gate definition to validate.
 * @returns Array of error strings. Empty array means the gate is valid.
 */
export function validateLocalGateDefinition(gate: LocalGateDefinition): string[] {
	const errors: string[] = [];

	// Command must be on the allowlist
	if (!ALLOWED_COMMANDS.has(gate.command)) {
		errors.push(
			`Command "${gate.command}" is not in the allowlist. Allowed: ${[...ALLOWED_COMMANDS].join(', ')}`,
		);
		return errors;
	}

	// Check dangerous npm sub-commands
	if (gate.command === 'npm') {
		const subCmd = gate.args[0];
		if (subCmd && DANGEROUS_NPM_SUBCOMMANDS.has(subCmd)) {
			errors.push(`Dangerous npm sub-command: "${subCmd}". This is never allowed as a local gate.`);
		}
	}

	// Check dangerous git sub-commands
	if (gate.command === 'git') {
		const subCmd = gate.args[0];
		if (subCmd && DANGEROUS_GIT_SUBCOMMANDS.has(subCmd)) {
			errors.push(`Dangerous git sub-command: "${subCmd}". This is never allowed as a local gate.`);
		}
	}

	// Check blocked command combinations
	const args0 = gate.args[0] ?? '';
	const args1 = gate.args[1] ?? '';
	const comboKey = `${gate.command}::${args0}::${args1}`;
	if (BLOCKED_COMMAND_COMBOS.has(comboKey)) {
		errors.push(
			`Blocked command combination: ${gate.command} ${gate.args.slice(0, 3).join(' ')}`.trim(),
		);
	}

	// Check dangerous arg patterns
	for (const arg of gate.args) {
		for (const pattern of DANGEROUS_ARG_PATTERNS) {
			if (arg.includes(pattern)) {
				errors.push(
					`Dangerous argument pattern: "${arg}" contains "${pattern}". Auto-fix commands are not allowed.`,
				);
			}
		}
	}

	return errors;
}

// ---------------------------------------------------------------------------
// Report creation
// ---------------------------------------------------------------------------

/**
 * Compute gate status from exit code.
 *
 * Rules:
 * - exitCode null → SKIPPED (command not executed)
 * - exitCode 0 → PASS
 * - exitCode non-zero + kind "advisory" → WARN
 * - exitCode non-zero + kind "required"/"format" → FAIL
 */
export function computeGateStatus(kind: LocalGateKind, exitCode: number | null): LocalGateStatus {
	if (exitCode === null) {
		return 'SKIPPED';
	}
	if (exitCode === 0) {
		return 'PASS';
	}
	if (kind === 'advisory') {
		return 'WARN';
	}
	return 'FAIL';
}

/**
 * Create a structured LocalGateReport from individual gate results.
 *
 * Overall status:
 * - FAIL if any required or format gate has FAIL status
 * - WARN if any advisory gate has WARN status (and no required/failed)
 * - PASS otherwise
 *
 * @param results - Array of gate results.
 * @returns Aggregated LocalGateReport.
 */
export function createLocalGateReport(results: LocalGateResult[]): LocalGateReport {
	const passed = results.filter((r) => r.status === 'PASS').length;
	const warned = results.filter((r) => r.status === 'WARN').length;
	const failed = results.filter((r) => r.status === 'FAIL').length;
	const skipped = results.filter((r) => r.status === 'SKIPPED').length;

	let status: LocalGateReport['status'] = 'PASS';

	// Any required or format FAIL → overall FAIL
	if (results.some((r) => r.status === 'FAIL' && (r.kind === 'required' || r.kind === 'format'))) {
		status = 'FAIL';
	} else if (warned > 0 || failed > 0) {
		// Advisory warnings or format warnings → WARN
		status = 'WARN';
	}

	return {
		status,
		total: results.length,
		passed,
		warned,
		failed,
		skipped,
		results,
	};
}

/**
 * Create a dry-run local gate report.
 * All gates are marked as SKIPPED (no real commands executed).
 * Default gates are used if none provided.
 *
 * @param gates - Optional custom gate definitions (uses defaults if not provided).
 * @returns LocalGateReport with all gates SKIPPED.
 */
export function createDryRunLocalGateReport(gates?: LocalGateDefinition[]): LocalGateReport {
	const definitions = gates ?? getDefaultLocalGateDefinitions();

	const results: LocalGateResult[] = definitions.map((gate) => ({
		id: gate.id,
		label: gate.label,
		kind: gate.kind,
		command: gate.command,
		args: gate.args,
		status: 'SKIPPED' as LocalGateStatus,
		exitCode: null,
		durationMs: 0,
		stdoutSnippet: '[DRY-RUN] Gate not executed in dry-run mode.',
	}));

	return createLocalGateReport(results);
}

/**
 * Classify a gate result (exit code based) and update the result in-place.
 *
 * Used by the CLI after executing a real command.
 *
 * @param result - Mutable result object to update.
 * @param exitCode - Exit code from the command.
 */
export function classifyLocalGateResult(result: LocalGateResult, exitCode: number | null): void {
	result.exitCode = exitCode;
	result.status = computeGateStatus(result.kind, exitCode);
}
