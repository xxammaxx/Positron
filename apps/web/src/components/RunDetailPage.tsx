import { useState, useEffect } from 'react';
import { getRunDetail } from '../dashboard-api.js';
import { useRunSSE } from '../useRunSSE.js';
import { StatusBadge } from './StatusBadge.js';
import { RunPipeline } from './RunPipeline.js';
import { MergeGateStatus } from './MergeGateStatus.js';
import { TestReport } from './TestReport.js';
import { EvidenceList } from './EvidenceList.js';
import { EventLog } from './EventLog.js';
import { AutonomyDisplay } from './AutonomyDisplay.js';
import { ControlButtons } from './ControlButtons.js';
import { ConnectionStatus } from './ConnectionStatus.js';

export function RunDetailPage({ runId, onBack }: { runId: string; onBack: () => void }) {
  // SSE-driven live updates
  const { detail: sseDetail, status: sseStatus } = useRunSSE(runId);
  const [fallbackDetail, setFallbackDetail] = useState<typeof sseDetail>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fallback: if SSE doesn't connect within 3 seconds, use polling
  useEffect(() => {
    if (sseDetail) return; // SSE already has data
    const timer = setTimeout(async () => {
      try {
        const d = await getRunDetail(runId);
        if (!sseDetail) {
          setFallbackDetail(d);
          setLoading(false);
        }
      } catch (e) {
        setError(String(e));
        setLoading(false);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [runId, sseDetail]);

  // When SSE data arrives, clear loading
  useEffect(() => {
    if (sseDetail) {
      setLoading(false);
      setError(null);
    }
  }, [sseDetail]);

  const detail = sseDetail ?? fallbackDetail;

  if (loading && !error) return <div className="text-slate-400 p-6 text-center animate-pulse">Connecting to run {runId.slice(0, 8)}...</div>;
  if (error) return <div className="text-red-400 p-6">{error}</div>;
  if (!detail) return <div className="text-slate-400 p-6">Run not found</div>;

  const { run, events, pr, testReport, evidence, syncComments } = detail;

  /** Map run status to display */
  const terminalLabel = run.phase === 'DONE' ? 'Merged' :
    run.phase === 'FAILED_BLOCKED' ? 'Blocked' :
    run.phase === 'FAILED_UNSAFE' ? 'Failed' :
    run.phase === 'MERGE' ? 'Merging' : null;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sky-400 hover:text-sky-300 text-sm">← Dashboard</button>
        <div className="flex items-center gap-2">
          {terminalLabel && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              run.phase === 'DONE' ? 'bg-emerald-900 text-emerald-300' :
              run.phase === 'FAILED_BLOCKED' ? 'bg-amber-900 text-amber-300' :
              run.phase === 'FAILED_UNSAFE' ? 'bg-red-900 text-red-300' :
              'bg-slate-700 text-slate-300'
            }`}>
              {terminalLabel}
            </span>
          )}
          <ConnectionStatus status={sseStatus} />
          <StatusBadge status={run.status} />
        </div>
      </div>

      {/* Run Info */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <InfoItem label="Run ID" value={run.id.slice(0, 8)} mono />
          <InfoItem label="Issue" value={`#${run.issueNumber}`} />
          <InfoItem label="Phase" value={run.phase} mono />
          <InfoItem label="Attempt" value={String(run.attempt)} />
          <InfoItem label="Branch" value={run.branch || '—'} mono />
          <InfoItem label="Started" value={run.startedAt ? new Date(run.startedAt).toLocaleTimeString() : '—'} />
          <InfoItem label="Autonomy" value={`Level ${run.autonomyLevel}`} />
          <InfoItem label="Finished" value={run.finishedAt ? new Date(run.finishedAt).toLocaleTimeString() : '—'} />
        </div>

        <div className="mt-3">
          <RunPipeline events={events} currentPhase={run.phase} />
        </div>
      </div>

      {/* Two-Column Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          <MergeGateStatus runId={run.id} />

          <EventLog events={events} />

          <ControlButtons />
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* PR & Merge */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
            <h4 className="text-sm font-semibold text-slate-300 mb-2">PR & Merge</h4>
            {pr ? (
              <div className="space-y-1">
                <a
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:text-sky-300 text-sm font-medium flex items-center gap-1"
                >
                  <span>🔗</span>
                  <span>PR #{pr.number}</span>
                  <span className="text-xs text-slate-500">↗</span>
                </a>
                {run.phase === 'MERGE' && (
                  <div className="text-xs text-amber-400">⏳ Merge in progress...</div>
                )}
                {run.phase === 'DONE' && (
                  <div className="text-xs text-emerald-400">✅ Merged</div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                {run.phase === 'PR_CREATE' || run.phase === 'MERGE' || run.phase === 'DONE'
                  ? <span>PR created — URL not available in detail</span>
                  : <span>PR not yet created (current phase: {run.phase})</span>
                }
              </div>
            )}
          </div>

          <TestReport report={testReport} events={events} />

          <EvidenceList evidence={evidence} />

          <AutonomyDisplay level={run.autonomyLevel} />

          {/* GitHub Sync Status */}
          {syncComments && syncComments.length > 0 && (
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
              <h4 className="text-sm font-semibold text-slate-300 mb-2">GitHub Sync Status</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {syncComments.map((sc, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs py-0.5 border-b border-slate-800 last:border-0">
                    <span>
                      {sc.status === 'ok' ? '✅' : sc.status === 'warn' ? '⚠️' : '❌'}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">{sc.phase}</span>
                    <span className="text-slate-400">
                      {new Date(sc.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-sm ${mono ? 'font-mono text-sky-300' : 'text-slate-300'}`}>{value}</div>
    </div>
  );
}
