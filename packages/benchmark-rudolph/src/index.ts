// Positron — Rudolph Beacon Benchmark Package
//
// Deterministic benchmark system for Positron capability verification.
// Integrates with DeterministicFixtureAgent, OpenCodeDryRunAgent, and
// existing EvidenceReport / ExecutionMode types.

// Domain model
export type { ReindeerBeacon, BeaconStatus } from './beacon-domain.js';
export {
	classifyBeacon,
	isStale,
	createBeacon,
	BATTERY_GREEN_THRESHOLD,
	BATTERY_YELLOW_LOWER,
	RSSI_GREEN_THRESHOLD,
	RSSI_YELLOW_LOWER,
	STALE_MINUTES,
} from './beacon-domain.js';

// Fixtures / Scan Simulator
export type { BeaconScanEntry, BeaconScanResult } from './beacon-fixtures.js';
export { simulateBeaconScan, KNOWN_BEACONS } from './beacon-fixtures.js';

// Evidence Contract
export type {
	RudolphBenchmarkRunSummary,
	BenchmarkIssueResult,
	BenchmarkCommandResult,
	BlockedAction,
	BenchmarkConclusion,
	CapabilityDelta,
} from './evidence-contract.js';
export {
	redactSecrets,
	containsSecrets,
	createIssueResult,
	createCommandResult,
	determineConclusionStatus,
	validateRunSummary,
	VALID_EXECUTION_MODES,
} from './evidence-contract.js';

// Benchmark Runner
export { BenchmarkRunner } from './benchmark-runner.js';
export type { RudolphBenchmarkConfig } from './benchmark-runner.js';

// Traceability
export type { IssueTraceEntry, TraceabilityMap } from './traceability.js';
export {
	buildTraceabilityMap,
	validateTraceabilityMap,
	validateIssueIndependence,
} from './traceability.js';

// Controlled Real-Mode Probe
export type {
	ControlledRealProbeResult,
	ProbeGateCheck,
	CommitReadinessCheck,
} from './controlled-real-probe.js';
export {
	runControlledRealModeProbe,
	isRedHoldAction,
	checkCommitReadiness,
	isCommitReady,
} from './controlled-real-probe.js';
