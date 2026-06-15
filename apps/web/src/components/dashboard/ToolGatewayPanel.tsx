import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api.js';
import type { ToolGatewayStatus, ToolGatewayTool } from '../../types.js';

// ── Visual helpers ──────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
	read: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
	write: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
	network: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
	secret_sensitive: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
	destructive: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
};

const APPROVAL_COLORS: Record<string, string> = {
	none: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
	ask: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
	human_required: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const AUTONOMY_LABELS: Record<number, string> = {
	0: 'L0 Observer',
	1: 'L1 Research',
	2: 'L2 Assist',
	3: 'L3 Co-Pilot',
	4: 'L4 Auto-PR',
};

const WARMUP_COLORS: Record<string, string> = {
	pass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
	partial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
	fail: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
	blocked: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
	pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
	unknown: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
	not_required: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

const PROVIDER_COLORS: Record<string, string> = {
	not_provider: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
	missing: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
	installed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
	configured: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
	warmup_required: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
	ready_for_demo: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
	ready_for_real: 'bg-green-200 text-green-900 dark:bg-green-800/40 dark:text-green-200',
	blocked: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
};

// ── Component ────────────────────────────────────────────────────────

export default function ToolGatewayPanel(): React.ReactElement {
	const [status, setStatus] = useState<ToolGatewayStatus | null>(null);
	const [tools, setTools] = useState<ToolGatewayTool[]>([]);
	const [total, setTotal] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadData = useCallback(async () => {
		try {
			setError(null);
			const [statusData, toolsData] = await Promise.all([
				api.getToolGatewayStatus(),
				api.getToolGatewayTools(),
			]);
			setStatus(statusData);
			setTools(toolsData.tools);
			setTotal(toolsData.total);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load tool gateway data');
			// Keep stale data if available
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadData();
	}, [loadData]);

	// ── Loading state ──────────────────────────────────────────────
	if (isLoading) {
		return (
			<div className="card animate-pulse">
				<div className="skeleton h-5 w-48 mb-4 rounded" />
				<div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
					{[1, 2, 3, 4, 5, 6].map((i) => (
						<div key={i} className="card">
							<div className="skeleton h-3 w-20 mb-2 rounded" />
							<div className="skeleton h-6 w-16 rounded" />
						</div>
					))}
				</div>
				<div className="skeleton h-4 w-full mb-2 rounded" />
				<div className="skeleton h-4 w-3/4 mb-2 rounded" />
				<div className="skeleton h-4 w-1/2 rounded" />
			</div>
		);
	}

	// ── Error state ────────────────────────────────────────────────
	if (error && !status) {
		return (
			<div className="card border-red-200 dark:border-red-800">
				<div className="flex items-center gap-3">
					<span className="text-red-500 text-lg">&#9888;</span>
					<div>
						<h3 className="text-red-600 dark:text-red-400">Tool Gateway Unavailable</h3>
						<p className="text-sm text-slate-500 mt-1">{error}</p>
					</div>
				</div>
			</div>
		);
	}

	// ── Data display ───────────────────────────────────────────────
	const gatewayActive = status?.gatewayEnabled && !status?.sealed;
	const gatewayLabel = gatewayActive ? 'Active' : 'Inactive (Safe Default)';

	return (
		<div className="space-y-4">
			{/* Status Summary Cards */}
			<div className="card">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Tool Gateway</h2>
					{error && (
						<span className="text-xs text-amber-500" title={error}>
							&#9888; Stale data
						</span>
					)}
				</div>

				<div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
					{/* Gateway Status */}
					<div
						className={`card !border-l-4 ${gatewayActive ? 'border-l-green-400' : 'border-l-amber-400'}`}
					>
						<p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							Gateway
						</p>
						<p
							className={`text-lg font-bold mt-1 ${gatewayActive ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}
						>
							{status?.gatewayEnabled ? 'Enabled' : 'Disabled'}
						</p>
						<p className="text-xs text-slate-400 mt-0.5">{gatewayLabel}</p>
					</div>

					{/* MCP Exposure */}
					<div
						className={`card !border-l-4 ${status?.mcpExposeEnabled ? 'border-l-amber-400' : 'border-l-green-400'}`}
					>
						<p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							MCP Exposure
						</p>
						<p
							className={`text-lg font-bold mt-1 ${status?.mcpExposeEnabled ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}
						>
							{status?.mcpExposeEnabled ? 'Enabled' : 'Disabled'}
						</p>
						<p className="text-xs text-slate-400 mt-0.5">
							{status?.mcpExposeEnabled ? 'External access allowed' : 'Safe Default'}
						</p>
					</div>

					{/* Registered Tools */}
					<div className="card !border-l-4 border-l-blue-400">
						<p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							Registered Tools
						</p>
						<p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
							{status?.registeredTools ?? total}
						</p>
					</div>

					{/* Runtime Status */}
					<div
						className={`card !border-l-4 ${status?.runtimeActive ? 'border-l-green-400' : 'border-l-slate-400'}`}
					>
						<p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							Runtime
						</p>
						<p
							className={`text-lg font-bold mt-1 ${status?.runtimeActive ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'}`}
						>
							{status?.runtimeActive ? 'Active' : 'Inactive'}
						</p>
						<p className="text-xs text-slate-400 mt-0.5">
							{status?.sealed ? 'Registry sealed' : 'Registry open'}
						</p>
					</div>

					{/* ── MCP Status (Issue #229) ────────────────────────────── */}
					<div className="card !border-l-4 border-l-purple-400">
						<p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							MCP Servers
						</p>
						<p className="text-lg font-bold mt-1 text-purple-600 dark:text-purple-400">
							{status?.mcpServers?.length ?? 0}
						</p>
						<p className="text-xs text-slate-400 mt-0.5">
							{status?.mcpServers && status.mcpServers.length > 0
								? `${status.mcpServers.filter((s) => s.connected).length} connected`
								: 'No MCP servers connected'}
						</p>
					</div>

					{/* ── Provider Status (Issue #229) ───────────────────────── */}
					<div
						className={`card !border-l-4 ${status?.providerStatus?.opencodeInstalled ? 'border-l-blue-400' : 'border-l-slate-400'}`}
					>
						<p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							OpenCode Provider
						</p>
						<p
							className={`text-lg font-bold mt-1 ${status?.providerStatus?.opencodeInstalled ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}
						>
							{status?.providerStatus?.opencodeInstalled
								? status.providerStatus.opencodeVersion ?? 'Installed'
								: 'Not Detected'}
						</p>
						<p className="text-xs text-slate-400 mt-0.5">
							{status?.providerStatus?.specKitSynced ? 'Spec Kit synced' : 'Spec Kit not synced'}
						</p>
					</div>
				</div>

				{/* Feature Flags (compact display) */}
				<div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
					<span className="inline-flex items-center gap-1">
						<span
							className={`w-2 h-2 rounded-full ${status?.enforcePathBoundaries ? 'bg-green-400' : 'bg-slate-300'}`}
						/>
						Path Boundaries: {status?.enforcePathBoundaries ? 'ON' : 'OFF'}
					</span>
					<span className="inline-flex items-center gap-1">
						<span
							className={`w-2 h-2 rounded-full ${status?.enforceEgress ? 'bg-green-400' : 'bg-slate-300'}`}
						/>
						Egress Enforcement: {status?.enforceEgress ? 'ON' : 'OFF'}
					</span>
					<span className="inline-flex items-center gap-1">
						<span
							className={`w-2 h-2 rounded-full ${status?.redactSecrets ? 'bg-green-400' : 'bg-slate-300'}`}
						/>
						Secret Redaction: {status?.redactSecrets ? 'ON' : 'OFF'}
					</span>
				</div>

				{!status?.gatewayEnabled && (
					<div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
						<p className="text-sm text-amber-700 dark:text-amber-300">
							&#9888; Gateway is configured but <strong>inactive</strong>. Tool execution is blocked
							until explicitly enabled. This is the safe default.
						</p>
					</div>
				)}
			</div>

			{/* Registered Tools Table */}
			{tools.length > 0 && (
				<div className="card p-0 overflow-hidden">
					<div className="p-4 border-b border-slate-200 dark:border-slate-700">
						<h3 className="font-semibold text-slate-800 dark:text-slate-200">
							Registered Tools ({tools.length})
						</h3>
						<p className="text-xs text-slate-500 mt-1">
							Read-only metadata — no handlers or secrets exposed
						</p>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="bg-slate-50 dark:bg-slate-800/50 text-left">
									<th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400">
										Tool ID
									</th>
									<th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400">
										Category
									</th>
									<th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400">
										Risk Level
									</th>
									<th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400">
										Autonomy
									</th>
									<th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400">
										Approval
									</th>
									<th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400">
										Egress
									</th>
									<th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400">
										MCP Server
									</th>
									<th className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400">
										Warm-up
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
								{tools.map((tool) => (
									<tr
										key={tool.id}
										className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
									>
										<td className="px-4 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-300">
											{tool.id}
										</td>
										<td className="px-4 py-2.5">
											<span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
												{tool.category}
											</span>
										</td>
										<td className="px-4 py-2.5">
											<span
												className={`text-xs px-2 py-0.5 rounded font-medium ${RISK_COLORS[tool.riskLevel] ?? 'bg-slate-100 text-slate-600'}`}
											>
												{tool.riskLevel}
											</span>
										</td>
										<td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
											{AUTONOMY_LABELS[tool.requiredAutonomyLevel] ??
												`L${tool.requiredAutonomyLevel}`}
										</td>
										<td className="px-4 py-2.5">
											<span
												className={`text-xs px-2 py-0.5 rounded font-medium ${APPROVAL_COLORS[tool.approvalMode] ?? 'bg-slate-100 text-slate-600'}`}
											>
												{tool.approvalMode}
											</span>
										</td>
										<td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs">
											{tool.egressPolicy.allowedHosts.length > 0
												? tool.egressPolicy.allowedHosts.join(', ')
												: 'none'}
										</td>
										<td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs">
											{tool.mcpServerName ? (
												<span className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
													{tool.mcpServerName}
												</span>
											) : (
												<span className="text-xs text-slate-400">—</span>
											)}
										</td>
										<td className="px-4 py-2.5">
											{tool.warmupStatus ? (
												<span
													className={`text-xs px-2 py-0.5 rounded font-medium ${WARMUP_COLORS[tool.warmupStatus] ?? 'bg-slate-100 text-slate-600'}`}
												>
													{tool.warmupStatus}
												</span>
											) : (
												<span className="text-xs text-slate-400">—</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<div className="p-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400">
						Note: Tool execution is not available from the dashboard. Use the CLI or automated
						pipeline runs.
					</div>
				</div>
			)}
		</div>
	);
}
