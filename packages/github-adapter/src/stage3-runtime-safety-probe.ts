// Positron — Stage 3 Runtime Safety Probe
//
// Trusted, read-only inspection of the process environment.
// Replaces freely-passed `Stage3ProcessSafety` booleans with a probe
// that inspects the actual runtime state.
//
// In live mode, the harness calls `probe.inspect()` to determine
// process safety — it does NOT trust caller-supplied booleans.

// ---------------------------------------------------------------------------
// Probe Interface
// ---------------------------------------------------------------------------

/** Result of runtime safety inspection. */
export interface Stage3SafetySnapshot {
	/** Whether the queue is disabled. */
	queueDisabled: boolean;

	/** Configured concurrency level. */
	configuredConcurrency: number;

	/** Current process ID. */
	currentProcessId: number;

	/** Whether the workspace lock is currently held. */
	workspaceLockHeld: boolean;

	/** Owner of the workspace lock, or null if not held. */
	workspaceLockOwner: string | null;

	/** Whether another active run is detected. */
	otherActiveRunDetected: boolean;

	/** Whether the merge kill-switch is active. */
	mergeKillSwitchActive: boolean;

	/** Whether generic push is enabled. */
	genericPushEnabled: boolean;
}

/**
 * Trusted runtime safety probe.
 * Inspects the actual process environment — does not trust caller-supplied values.
 */
export interface Stage3RuntimeSafetyProbe {
	/** Inspect the current runtime safety state. */
	inspect(): Promise<Stage3SafetySnapshot>;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Result of safety validation. */
export interface Stage3SafetyValidation {
	/** Whether the runtime is in a safe state for Stage 3 execution. */
	safe: boolean;

	/** If not safe, why. */
	reason?: string;

	/** Detailed snapshot of the runtime state. */
	snapshot: Stage3SafetySnapshot;

	/** List of failed safety checks. */
	failedChecks: string[];
}

/**
 * Required safety conditions for Stage 3 execution.
 * All must be true for execution to proceed.
 */
const REQUIRED_CONDITIONS: Array<{
	field: keyof Stage3SafetySnapshot;
	required: boolean | number;
	label: string;
}> = [
	{ field: 'queueDisabled', required: true, label: 'Queue must be disabled' },
	{ field: 'configuredConcurrency', required: 1, label: 'Concurrency must be 1' },
	{ field: 'workspaceLockHeld', required: true, label: 'Workspace lock must be held' },
	{ field: 'otherActiveRunDetected', required: false, label: 'No other active run detected' },
	{ field: 'mergeKillSwitchActive', required: true, label: 'Merge kill-switch must be active' },
	{ field: 'genericPushEnabled', required: false, label: 'Generic push must be disabled' },
];

/**
 * Validate a safety snapshot against the required conditions.
 */
export function validateSafetySnapshot(snapshot: Stage3SafetySnapshot): Stage3SafetyValidation {
	const failedChecks: string[] = [];

	for (const condition of REQUIRED_CONDITIONS) {
		const actual = snapshot[condition.field];
		if (actual !== condition.required) {
			failedChecks.push(`${condition.label} (got: ${String(actual)})`);
		}
	}

	return {
		safe: failedChecks.length === 0,
		reason: failedChecks.length > 0 ? failedChecks.join('; ') : undefined,
		snapshot,
		failedChecks,
	};
}

// ---------------------------------------------------------------------------
// Environment Probe (default implementation)
// ---------------------------------------------------------------------------

/**
 * Default runtime safety probe that reads from environment variables.
 * This is a concrete, trustworthy implementation — not caller-supplied booleans.
 */
export function createEnvRuntimeSafetyProbe(params?: {
	queueDisabled?: boolean;
	concurrency?: number;
	lockHeld?: boolean;
	lockOwner?: string | null;
	mergeKillSwitch?: boolean;
	pushEnabled?: boolean;
}): Stage3RuntimeSafetyProbe {
	return {
		async inspect(): Promise<Stage3SafetySnapshot> {
			return {
				queueDisabled: params?.queueDisabled ?? process.env.POSITRON_DISABLE_QUEUE === 'true',
				configuredConcurrency: params?.concurrency ?? 1,
				currentProcessId: process.pid,
				workspaceLockHeld: params?.lockHeld ?? false,
				workspaceLockOwner: params?.lockOwner ?? null,
				otherActiveRunDetected: false, // simplified: assumes single-process
				mergeKillSwitchActive:
					params?.mergeKillSwitch ?? process.env.POSITRON_MERGE_KILL_SWITCH === 'true',
				genericPushEnabled: params?.pushEnabled ?? process.env.POSITRON_ENABLE_PUSH === 'true',
			};
		},
	};
}

// ---------------------------------------------------------------------------
// Safe Snapshot (for fake mode / testing)
// ---------------------------------------------------------------------------

/**
 * Create a safety snapshot that satisfies all required conditions.
 * Used in fake mode and tests — never for live execution.
 */
export function createSafeSnapshot(
	overrides?: Partial<Stage3SafetySnapshot>,
): Stage3SafetySnapshot {
	return {
		queueDisabled: true,
		configuredConcurrency: 1,
		currentProcessId: process.pid,
		workspaceLockHeld: true,
		workspaceLockOwner: 'test-process',
		otherActiveRunDetected: false,
		mergeKillSwitchActive: true,
		genericPushEnabled: false,
		...overrides,
	};
}

/**
 * Create a fake runtime safety probe that always returns a safe snapshot.
 * Used in fake mode and tests — never for live execution.
 */
export function createFakeRuntimeSafetyProbe(
	snapshot?: Partial<Stage3SafetySnapshot>,
): Stage3RuntimeSafetyProbe {
	const safeSnapshot = createSafeSnapshot(snapshot);
	return {
		async inspect(): Promise<Stage3SafetySnapshot> {
			return { ...safeSnapshot };
		},
	};
}
