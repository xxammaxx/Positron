import { useState, useEffect } from 'react';
import { getRunDetail } from '../dashboard-api.js';
import { StatusBadge } from './StatusBadge.js';
import { RunPipeline } from './RunPipeline.js';
import { MergeGateStatus } from './MergeGateStatus.js';
import type { RunDetail } from '../types.js';

export function RunDetailPage({ runId, onBack }: { runId: string; onBack: () => void }) {
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getRunDetail(runId)
      .then(d => { setDetail(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [runId]);

  if (loading) return <div className="text-slate-400 p-6 text-center animate-pulse">Loading run {runId.slice(0, 8)}...</div>;
  if (error) return <div className="text-red-400 p-6">{error}</div>;
  if (!detail) return <div className="text-slate-400 p-6">Run not found</div>;

  const { run, events } = detail;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sky-400 hover:text-sky-300 text-sm">← Dashboard</button>
        <StatusBadge status={run.status} />
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
        {/* Left: Merge Gates + Events */}
        <div className="space-y-4">
          <MergeGateStatus runId={run.id} />

          <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
            <h4 className="text-sm font-semibold text-slate-300 mb-2">Event Log</h4>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {events.map(ev => (
                <div key={ev.id} className={`text-xs font-mono py-1 border-b border-slate-800 ${
                  ev.level === 'ERROR' ? 'text-red-400' :
                  ev.level === 'WARN' ? 'text-amber-400' : 'text-slate-400'
                }`}>
                  <span className="text-slate-600">{ev.phase}</span>{' '}
                  <span>{ev.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: PR + Test Report */}
        <div className="space-y-4">
          {/* PR Status */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
            <h4 className="text-sm font-semibold text-slate-300 mb-2">PR & Merge</h4>
            <div className="text-xs text-slate-400">
              {run.phase === 'PR_CREATE' || run.phase === 'MERGE' || run.phase === 'DONE'
                ? <span>PR created during run — check GitHub</span>
                : <span>PR not yet created (current phase: {run.phase})</span>
              }
            </div>
          </div>

          {/* Test Report */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
            <h4 className="text-sm font-semibold text-slate-300 mb-2">Test Report</h4>
            {events.some(e => e.phase === 'TEST') ? (
              <div className="text-xs text-emerald-400">✅ Test phase completed</div>
            ) : (
              <div className="text-xs text-slate-500">Test phase not yet reached</div>
            )}
            {events.filter(e => e.phase === 'TEST').map(e => (
              <div key={e.id} className="text-xs text-slate-400 mt-1">{e.message}</div>
            ))}
          </div>
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
