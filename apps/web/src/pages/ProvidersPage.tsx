// Positron — ProvidersPage
// Issue #229: Operator-facing Provider/Model/SpecKit/MCP/Gate status dashboard
// ---------------------------------------------------------------------------
// READ-ONLY display. NO Run/Execute/Install/Push/Merge buttons.
// All data comes from GET endpoints. No runtime execution triggered.
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';

// ── Types ────────────────────────────────────────────────────────────

interface GateResult {
	kind: string;
	status: string;
	message: string;
	source: string;
	evidenceRefs: string[];
	blockedReasons: string[];
	checkedAt: string;
}

interface GatesStatus {
	overall: string;
	readyForDemo: boolean;
	readyForReal: boolean;
	gates: GateResult[];
	blockedReasons: string[];
	checkedAt: string;
}

interface StateStatus extends GatesStatus {
	runtimeStarted: boolean;
	note: string;
}

// ── Color helpers ────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
	pass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700',
	partial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300 dark:border-amber-700',
	fail: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700',
	blocked: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-300 dark:border-rose-700',
	not_checked: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-600',
	missing: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-600',
};

const STATUS_DOT_COLORS: Record<string, string> = {
	pass: 'bg-green-500',
	partial: 'bg-amber-500',
	fail: 'bg-red-500',
	blocked: 'bg-rose-500',
	not_checked: 'bg-slate-400',
	missing: 'bg-slate-300',
};

const GATE_LABELS: Record<string, string> = {
	provider_detection: 'OpenCode Provider',
	model_profile: 'Model Profile',
	model_warmup: 'Model Warm-up',
	speckit_sync: 'Spec Kit Sync',
	mcp_warmup: 'MCP Warm-up',
	tool_gateway: 'Tool Gateway',
	human_approval: 'Human Approval',
	security: 'Security',
};

const GATE_ICONS: Record<string, string> = {
	provider_detection: '🔌',
	model_profile: '🧠',
	model_warmup: '🌡️',
	speckit_sync: '📐',
	mcp_warmup: '🔧',
	tool_gateway: '🚪',
	human_approval: '👤',
	security: '🛡️',
};

const SOURCE_LABELS: Record<string, string> = {
	store: 'Store',
	evidence: 'Evidence',
	config: 'Config',
	derived: 'Derived',
	missing: 'Missing',
};

// ── Sub-components ───────────────────────────────────────────────────

/** Single gate row in the infrastructure gate table */
function GateRow({ gate }: { gate: GateResult }): React.ReactElement {
	return (
		<tr className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
			<td className="px-4 py-3 whitespace-nowrap">
				<div className="flex items-center gap-2">
					<span className="text-lg" title={GATE_LABELS[gate.kind] ?? gate.kind}>
						{GATE_ICONS[gate.kind] ?? '❓'}
					</span>
					<span className="text-sm font-medium text-slate-800 dark:text-slate-200">
						{GATE_LABELS[gate.kind] ?? gate.kind}
					</span>
				</div>
			</td>
			<td className="px-4 py-3 whitespace-nowrap">
				<span
					className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[gate.status] ?? STATUS_COLORS['not_checked']}`}
				>
					<span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[gate.status] ?? STATUS_DOT_COLORS['not_checked']}`} />
					{gate.status}
				</span>
			</td>
			<td className="px-4 py-3">
				<span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
					{SOURCE_LABELS[gate.source] ?? gate.source}
				</span>
			</td>
			<td className="px-4 py-3 max-w-md">
				<p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
					{gate.message}
				</p>
				{gate.blockedReasons.length > 0 && (
					<div className="mt-1.5 space-y-0.5">
						{gate.blockedReasons.map((reason, i) => (
							<p
								key={i}
								className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded"
							>
								🚫 {reason}
							</p>
						))}
					</div>
				)}
			</td>
		</tr>
	);
}

/** Display provider detection evidence (OpenCode binary, path mismatch, version) */
function ProviderStatusPanel({ gates }: { gates: GateResult[] }): React.ReactElement {
	const gate = gates.find((g) => g.kind === 'provider_detection');
	if (!gate) return <EmptyPanel title="OpenCode Provider" />;

	return (
		<div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
			<h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
				<span>🔌</span> OpenCode Provider Detection
			</h3>
			<div className="space-y-2">
				<StatusBadge status={gate.status} />
				<p className="text-sm text-slate-600 dark:text-slate-400">{gate.message}</p>
				{gate.blockedReasons.length > 0 && (
					<ul className="mt-2 space-y-1">
						{gate.blockedReasons.map((r, i) => (
							<li key={i} className="text-xs text-rose-600 dark:text-rose-400 flex items-start gap-1">
								<span className="mt-0.5 shrink-0">⚠️</span> {r}
							</li>
						))}
					</ul>
				)}
				<div className="text-xs text-slate-400 dark:text-slate-500 mt-2">
					Source: {SOURCE_LABELS[gate.source] ?? gate.source} · Checked: {new Date(gate.checkedAt).toLocaleString()}
				</div>
			</div>
		</div>
	);
}

/** Display model profile state (active profile, warm-up, readiness) */
function ModelProfilePanel({ gates }: { gates: GateResult[] }): React.ReactElement {
	const profileGate = gates.find((g) => g.kind === 'model_profile');
	const warmupGate = gates.find((g) => g.kind === 'model_warmup');

	return (
		<div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
			<h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
				<span>🧠</span> Model Profile &amp; Warm-up
			</h3>
			<div className="space-y-3">
				{profileGate && (
					<div>
						<div className="flex items-center gap-2 mb-1">
							<span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Profile</span>
							<StatusBadge status={profileGate.status} />
						</div>
						<p className="text-sm text-slate-600 dark:text-slate-400">{profileGate.message}</p>
						{profileGate.blockedReasons.map((r, i) => (
							<p key={i} className="text-xs text-rose-600 dark:text-rose-400 mt-1">⚠️ {r}</p>
						))}
					</div>
				)}
				{warmupGate && (
					<div>
						<div className="flex items-center gap-2 mb-1">
							<span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Warm-up</span>
							<StatusBadge status={warmupGate.status} />
						</div>
						<p className="text-sm text-slate-600 dark:text-slate-400">{warmupGate.message}</p>
						{warmupGate.blockedReasons.map((r, i) => (
							<p key={i} className="text-xs text-rose-600 dark:text-rose-400 mt-1">⚠️ {r}</p>
						))}
					</div>
				)}
				{!profileGate && !warmupGate && <EmptyPanel title="Model Profile" />}
			</div>
		</div>
	);
}

/** Display Spec Kit sync status */
function SpecKitStatusPanel({ gates }: { gates: GateResult[] }): React.ReactElement {
	const gate = gates.find((g) => g.kind === 'speckit_sync');
	if (!gate) return <EmptyPanel title="Spec Kit Sync" />;

	return (
		<div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
			<h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
				<span>📐</span> Spec Kit Sync
			</h3>
			<div className="space-y-2">
				<StatusBadge status={gate.status} />
				<p className="text-sm text-slate-600 dark:text-slate-400">{gate.message}</p>
				{gate.blockedReasons.map((r, i) => (
					<p key={i} className="text-xs text-rose-600 dark:text-rose-400">⚠️ {r}</p>
				))}
				<div className="text-xs text-slate-400 dark:text-slate-500 mt-2">
					Source: {SOURCE_LABELS[gate.source] ?? gate.source}
				</div>
			</div>
		</div>
	);
}

/** Display MCP warm-up evidence status */
function McpWarmupStatusPanel({ gates }: { gates: GateResult[] }): React.ReactElement {
	const gate = gates.find((g) => g.kind === 'mcp_warmup');
	if (!gate) return <EmptyPanel title="MCP Warm-up" />;

	return (
		<div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
			<h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
				<span>🔧</span> MCP Warm-up Evidence
			</h3>
			<div className="space-y-2">
				<StatusBadge status={gate.status} />
				<p className="text-sm text-slate-600 dark:text-slate-400">{gate.message}</p>
				{gate.blockedReasons.map((r, i) => (
					<p key={i} className="text-xs text-rose-600 dark:text-rose-400">⚠️ {r}</p>
				))}
				<div className="text-xs text-slate-400 dark:text-slate-500 mt-2">
					Source: {SOURCE_LABELS[gate.source] ?? gate.source}
				</div>
			</div>
		</div>
	);
}

/** Small status badge pill */
function StatusBadge({ status }: { status: string }): React.ReactElement {
	return (
		<span
			className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[status] ?? STATUS_COLORS['not_checked']}`}
		>
			<span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[status] ?? STATUS_DOT_COLORS['not_checked']}`} />
			{status}
		</span>
	);
}

/** Empty state for a panel when no data is available */
function EmptyPanel({ title }: { title: string }): React.ReactElement {
	return (
		<div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5">
			<h3 className="text-base font-semibold text-slate-400 dark:text-slate-500 mb-2">{title}</h3>
			<p className="text-sm text-slate-400 dark:text-slate-500">No data available from infrastructure stores.</p>
		</div>
	);
}

/** Overall readiness summary banner */
function ReadinessBanner({ gatesStatus, stateStatus }: {
	gatesStatus: GatesStatus | null;
	stateStatus: StateStatus | null;
}): React.ReactElement | null {
	const data = stateStatus ?? gatesStatus;
	if (!data) return null;

	const overallColor =
		data.overall === 'pass' ? 'border-green-400 bg-green-50 dark:bg-green-950/30' :
		data.overall === 'partial' ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' :
		'border-rose-400 bg-rose-50 dark:bg-rose-950/30';

	return (
		<div className={`rounded-xl border-2 ${overallColor} p-5 mb-6`}>
			<div className="flex flex-wrap items-center gap-4">
				<div className="flex items-center gap-2">
					<span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Overall:</span>
					<StatusBadge status={data.overall} />
				</div>
				<div className="flex items-center gap-3 text-sm">
					<span className={`flex items-center gap-1 ${data.readyForDemo ? 'text-green-700 dark:text-green-400' : 'text-slate-400'}`}>
						{data.readyForDemo ? '✅' : '❌'} Demo Ready
					</span>
					<span className={`flex items-center gap-1 ${data.readyForReal ? 'text-green-700 dark:text-green-400' : 'text-slate-400'}`}>
						{data.readyForReal ? '✅' : '❌'} Real-Run Ready
					</span>
				</div>
				{stateStatus && (
					<span className={`text-xs px-2 py-0.5 rounded-full ${stateStatus.runtimeStarted ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
						Runtime: {stateStatus.runtimeStarted ? 'ACTIVE' : 'stopped'}
					</span>
				)}
			</div>
			{data.blockedReasons.length > 0 && (
				<div className="mt-3 space-y-1">
					{data.blockedReasons.map((r, i) => (
						<p key={i} className="text-xs text-rose-600 dark:text-rose-400">🚫 {r}</p>
					))}
				</div>
			)}
		</div>
	);
}

/** Infrastructure gate table showing all 8 gates */
function InfrastructureGateTable({ gates }: { gates: GateResult[] }): React.ReactElement {
	if (gates.length === 0) {
		return (
			<div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-8 text-center">
				<p className="text-slate-400 dark:text-slate-500 text-sm">No infrastructure gates evaluated yet. Populate stores to see gate status.</p>
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
			<div className="overflow-x-auto">
				<table className="w-full text-left">
					<thead>
						<tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
							<th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Gate</th>
							<th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
							<th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Source</th>
							<th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Details</th>
						</tr>
					</thead>
					<tbody>
						{gates.map((gate) => (
							<GateRow key={gate.kind} gate={gate} />
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

/** Safety notice — always visible to remind operator of constraints */
function SafetyNotice(): React.ReactElement {
	return (
		<div className="mt-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
			<div className="flex items-start gap-3">
				<span className="text-xl shrink-0">⚠️</span>
				<div>
					<h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Safety Constraints Active</h4>
					<ul className="mt-2 space-y-1 text-xs text-amber-700 dark:text-amber-400">
						<li>No OpenCode coding run without human approval and all gates</li>
						<li>No Spec Kit runtime without human approval</li>
						<li>No MCP real run without warm-up + allowlist + human approval</li>
						<li>Tool Gateway sealed — no tool execution from this UI</li>
						<li>No auto-merge · No push to main/master</li>
						<li>All provider paths are redacted in evidence</li>
					</ul>
				</div>
			</div>
		</div>
	);
}

// ── Main Page Component ──────────────────────────────────────────────

export default function ProvidersPage(): React.ReactElement {
	const [gatesStatus, setGatesStatus] = useState<GatesStatus | null>(null);
	const [stateStatus, setStateStatus] = useState<StateStatus | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchStatus = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const [gates, state] = await Promise.all([
				api.getInfrastructureGatesStatus().catch((err) => {
					console.warn('Infrastructure gates status fetch failed:', err);
					return null;
				}),
				api.getInfrastructureStateStatus().catch((err) => {
					console.warn('Infrastructure state status fetch failed:', err);
					return null;
				}),
			]);
			setGatesStatus(gates as GatesStatus | null);
			setStateStatus(state as StateStatus | null);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load provider status');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchStatus();
	}, [fetchStatus]);

	// Use gates from the more complete source (state status preferred, then gates status)
	const activeGates = stateStatus?.gates ?? gatesStatus?.gates ?? [];

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			{/* Page Header */}
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
					Providers &amp; Infrastructure Gates
				</h1>
				<p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
					Operator overview of all provider detection, model profile, Spec Kit sync, MCP warm-up,
					and infrastructure gate states. Read-only — no runtime execution is triggered.
				</p>
			</div>

			{/* Loading State */}
			{loading && (
				<div className="flex items-center justify-center py-20">
					<div className="flex items-center gap-3 text-slate-400">
						<svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
							<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
							<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
						</svg>
						<span className="text-sm">Loading infrastructure status...</span>
					</div>
				</div>
			)}

			{/* Error State */}
			{!loading && error && (
				<div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-6 mb-6">
					<div className="flex items-start gap-3">
						<span className="text-xl shrink-0">❌</span>
						<div>
							<h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Connection Error</h3>
							<p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
							<p className="text-xs text-red-500 dark:text-red-500 mt-2">
								Ensure the Positron server is running with infrastructure stores configured.
							</p>
						</div>
					</div>
					<button
						onClick={fetchStatus}
						className="mt-4 px-4 py-2 text-sm font-medium rounded-lg border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
					>
						Retry
					</button>
				</div>
			)}

			{/* Content */}
			{!loading && !error && (
				<>
					{/* Readiness Banner */}
					<ReadinessBanner gatesStatus={gatesStatus} stateStatus={stateStatus} />

					{/* Status Panels Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
						<ProviderStatusPanel gates={activeGates} />
						<ModelProfilePanel gates={activeGates} />
						<SpecKitStatusPanel gates={activeGates} />
						<McpWarmupStatusPanel gates={activeGates} />
					</div>

					{/* Infrastructure Gate Table */}
					<div className="mb-6">
						<h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
							Infrastructure Gate Details
						</h2>
						<InfrastructureGateTable gates={activeGates} />
					</div>

					{/* State Status Note */}
					{stateStatus && (
						<div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4 mb-6">
							<p className="text-xs text-blue-700 dark:text-blue-400">{stateStatus.note}</p>
						</div>
					)}

					{/* Safety Notice */}
					<SafetyNotice />

					{/* Timestamp */}
					<div className="mt-4 text-xs text-slate-400 dark:text-slate-600 text-right">
						Last checked: {gatesStatus?.checkedAt ? new Date(gatesStatus.checkedAt).toLocaleString() : 'never'}
					</div>
				</>
			)}
		</div>
	);
}
