import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import type { ManagedProject } from '../../types.js';
import ErrorBanner from '../shared/ErrorBanner.js';
import LoadingSkeleton from '../shared/LoadingSkeleton.js';

function StatusBadge({ status }: { status: ManagedProject['status'] }): React.ReactElement {
	const map: Record<ManagedProject['status'], { label: string; className: string }> = {
		FIRST_EXTERNAL_TEST_SUCCESS: {
			label: 'External Test OK',
			className: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
		},
		EXTERNAL_TEST_PENDING: {
			label: 'Test Pending',
			className: 'border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
		},
		BUILD_IN_PROGRESS: {
			label: 'Build Running',
			className: 'border-sky-400/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
		},
		BLOCKED: {
			label: 'Blocked',
			className: 'border-rose-400/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
		},
	};
	const { label, className } = map[status];
	return <span className={`badge ${className}`}>{label}</span>;
}

function TimelineItem({
	item,
}: {
	item: ManagedProject['timeline'][0];
}): React.ReactElement {
	const iconMap = {
		completed: (
			<span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
			</span>
		),
		next: (
			<span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-sky-400 bg-sky-500/10 text-sky-500">
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
			</span>
		),
		planned: (
			<span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-300 dark:border-slate-600 text-slate-400">
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /></svg>
			</span>
		),
	};
	return (
		<div className="flex items-start gap-3">
			<div className="flex flex-col items-center">
				{iconMap[item.status]}
				{item.status !== 'planned' && <div className="mt-1 h-6 w-px bg-slate-200 dark:bg-slate-700" />}
			</div>
			<div className="pb-4">
				<div className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.step}</div>
				<div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</div>
			</div>
		</div>
	);
}

function SafetyStatusPanel({ safety }: { safety: ManagedProject['safetyStatus'] }): React.ReactElement {
	const items = [
		{ label: 'App Code Changed', value: safety.appCodeChanged, warn: true },
		{ label: 'STT Enabled', value: safety.sttEnabled, warn: true },
		{ label: 'Model/Audio Files Added', value: safety.modelAudioFilesAdded, warn: true },
		{ label: 'Cloud/Telemetry Enabled', value: safety.cloudTelemetryEnabled, warn: true },
		{ label: 'Real Mode', value: safety.realMode, warn: true },
		{ label: 'Phase-D Probe', value: safety.phaseDProbe, warn: true },
	];
	return (
		<div className="space-y-2">
			{items.map((item) => (
				<div key={item.label} className="flex items-center justify-between text-xs">
					<span className="text-slate-500 dark:text-slate-400">{item.label}</span>
					<span
						className={`font-mono font-semibold ${item.value && item.warn ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}
					>
						{item.value ? 'YES' : 'NO'}
					</span>
				</div>
			))}
		</div>
	);
}

export default function ProjectsPage(): React.ReactElement {
	const [projects, setProjects] = useState<ManagedProject[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		api
			.getProjects()
			.then((data) => {
				setProjects(data.projects);
				setLoading(false);
			})
			.catch((err: Error) => {
				setError(err.message);
				setLoading(false);
			});
	}, []);

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1>Managed Projects</h1>
					<p className="text-sm text-slate-400 mt-1">
						External target projects tracked by Positron
					</p>
				</div>
			</div>

			{error && <ErrorBanner message={error} onRetry={() => window.location.reload()} />}

			{loading && (
				<div className="space-y-4">
					<LoadingSkeleton lines={12} />
				</div>
			)}

			{!loading && !error && projects.length === 0 && (
				<div className="card text-center py-12">
					<div className="text-3xl mb-3">🔌</div>
					<h3 className="mb-2">No managed projects</h3>
					<p className="text-sm text-slate-400">
						No external target projects are currently being tracked by Positron.
					</p>
				</div>
			)}

			{!loading &&
				!error &&
				projects.map((project) => (
					<div key={project.id} className="space-y-5">
						{/* Project Header Card */}
						<div className="card card-elevated">
							<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
								<div>
									<div className="flex items-center gap-3 mb-2">
										<h2 className="text-xl">{project.name}</h2>
										<StatusBadge status={project.status} />
									</div>
									<p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
										{project.description}
									</p>
								</div>
								<a
									href={project.repoUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="btn-secondary shrink-0"
								>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
										<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
									</svg>
									Open on GitHub
								</a>
							</div>

							{/* Meta row */}
							<div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono mb-4">
								<span className="badge border-slate-200/60 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/50">
									Default branch: {project.defaultBranch}
								</span>
							</div>

							{/* Last merged PR */}
							<div className="rounded-xl border border-emerald-200/50 bg-emerald-50/40 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20 mb-4">
								<div className="flex items-center gap-2 mb-1">
									<span className="h-2 w-2 rounded-full bg-emerald-500" />
									<span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
										Last Merged PR
									</span>
								</div>
								<a
									href={project.lastMergedPr.url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-sky-500 transition-colors"
								>
									#{project.lastMergedPr.number}: {project.lastMergedPr.title}
								</a>
								<div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
									Merge SHA: {project.lastMergedPr.mergeSha.slice(0, 12)}...
								</div>
							</div>
						</div>

						{/* Two-column detail layout */}
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
							{/* Left Column: Timeline */}
							<div className="card">
								<h3 className="mb-4">Run / Evidence Timeline</h3>
								<div className="space-y-0">
									{project.timeline.map((item) => (
										<TimelineItem key={item.step} item={item} />
									))}
								</div>
							</div>

							{/* Right Column: Blocker + Next Steps */}
							<div className="space-y-5">
								{/* Known Blockers */}
								{project.knownBlockers.length > 0 && (
									<div className="card border-amber-200/60 dark:border-amber-800/40">
										<h3 className="flex items-center gap-2 text-amber-700 dark:text-amber-300 mb-3">
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
											Known Blockers
										</h3>
										<div className="space-y-2">
											{project.knownBlockers.map((blocker) => (
												<div
													key={blocker.id}
													className="rounded-lg border border-amber-200/40 bg-amber-50/30 p-3 text-xs dark:border-amber-800/30 dark:bg-amber-950/20"
												>
													<div className="font-semibold text-amber-800 dark:text-amber-300 mb-0.5">
														{blocker.severity === 'blocker' ? '🔴 Blocker' : '🟡 Warning'}
													</div>
													<div className="text-amber-700 dark:text-amber-400">{blocker.description}</div>
												</div>
											))}
										</div>
									</div>
								)}

								{/* Next Recommended Run */}
								<div className="card border-sky-200/60 dark:border-sky-800/40">
									<h3 className="flex items-center gap-2 text-sky-700 dark:text-sky-300 mb-3">
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
										Next Recommended Run
									</h3>
									<div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
										{project.nextRecommendedRun.label}
									</div>
									<div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
										{project.nextRecommendedRun.description}
									</div>
									<div className="rounded-lg border border-sky-200/30 bg-sky-50/20 p-2 dark:border-sky-800/30 dark:bg-sky-950/20">
										<code className="text-[11px] font-mono text-sky-700 dark:text-sky-300 break-all">
											{project.nextRecommendedRun.approvalLabel}
										</code>
									</div>
								</div>

								{/* Next App-Level Run */}
								<div className="card border-violet-200/60 dark:border-violet-800/40">
									<h3 className="flex items-center gap-2 text-violet-700 dark:text-violet-300 mb-3">
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
										Next App-Level Run (after toolchain)
									</h3>
									<div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
										{project.nextAppLevelRun.label}
									</div>
									<div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
										{project.nextAppLevelRun.description}
									</div>
									<div className="rounded-lg border border-violet-200/30 bg-violet-50/20 p-2 dark:border-violet-800/30 dark:bg-violet-950/20">
										<code className="text-[11px] font-mono text-violet-700 dark:text-violet-300 break-all">
											{project.nextAppLevelRun.approvalLabel}
										</code>
									</div>
								</div>
							</div>
						</div>

						{/* Safety Status */}
						<div className="card border-rose-200/30 dark:border-rose-800/30">
							<h3 className="flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-3">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
								Safety Status
							</h3>
							<SafetyStatusPanel safety={project.safetyStatus} />
						</div>
					</div>
				))}
		</div>
	);
}
