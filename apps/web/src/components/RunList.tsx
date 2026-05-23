import { useState, useEffect } from 'react';
import { listRuns, getRunDetail } from '../api.js';
import { StatusBadge } from './StatusBadge.js';
import { RunPipeline } from './RunPipeline.js';
import type { RunRecord, RunDetail } from '../types.js';

export function RunList() {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRuns()
      .then((r: RunRecord[]) => { setRuns(r); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  async function showDetail(runId: string) {
    try {
      const d = await getRunDetail(runId);
      setDetail(d);
    } catch (e) {
      setError(String(e));
    }
  }

  if (loading) return <div className="text-slate-400 p-4">Loading runs...</div>;
  if (error) return <div className="text-red-400 p-4">Error: {error}</div>;
  if (runs.length === 0) return <div className="text-slate-500 p-4">No runs yet.</div>;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-white">Runs ({runs.length})</h3>
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {runs.map(run => (
          <div
            key={run.id}
            className="bg-slate-800 rounded-lg p-3 cursor-pointer hover:bg-slate-750 border border-slate-700"
            onClick={() => showDetail(run.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-sky-400 mr-2">{run.id.slice(0, 8)}</span>
                {run.issueNumber && (
                  <span className="text-sm text-slate-300">Issue #{run.issueNumber}</span>
                )}
              </div>
              <StatusBadge status={run.status} />
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Phase: {run.phase} · Attempt: {run.attempt}
              {run.startedAt && ` · ${new Date(run.startedAt).toLocaleTimeString()}`}
            </div>
            {run.branch && (
              <div className="text-xs text-slate-600 font-mono mt-1">{run.branch}</div>
            )}
          </div>
        ))}
      </div>

      {detail && (
        <div className="mt-4 bg-slate-900 rounded-lg p-3 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-white">
              Run {detail.run.id.slice(0, 8)} · Issue #{detail.run.issueNumber}
            </h4>
            <button
              className="text-xs text-slate-400 hover:text-white"
              onClick={() => setDetail(null)}
            >
              ✕
            </button>
          </div>
          <RunPipeline events={detail.events} currentPhase={detail.run.phase} />
          <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
            {detail.events.slice(-10).reverse().map((ev: import('../types.js').RunEvent) => (
              <div key={ev.id} className="text-xs font-mono">
                <span className={`${
                  ev.level === 'ERROR' ? 'text-red-400' :
                  ev.level === 'WARN' ? 'text-amber-400' : 'text-slate-400'
                }`}>
                  [{ev.phase}] {ev.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
