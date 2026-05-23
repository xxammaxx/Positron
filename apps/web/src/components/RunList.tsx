import { useState, useEffect } from 'react';
import { listRuns } from '../dashboard-api.js';
import { StatusBadge } from './StatusBadge.js';
import { RunPipeline } from './RunPipeline.js';
import type { RunRecord } from '../types.js';

export function RunList({ onSelectRun }: { onSelectRun: (id: string) => void }) {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRuns()
      .then((r: RunRecord[]) => { setRuns(r); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <div className="text-slate-400 p-4">Loading runs...</div>;
  if (error) return <div className="text-red-400 p-4">Error: {error}</div>;
  if (runs.length === 0) return <div className="text-slate-500 p-4">No runs yet. Start one from the Issue Queue.</div>;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-white">Runs ({runs.length})</h3>
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {runs.map(run => (
          <div
            key={run.id}
            className="bg-slate-800 rounded-lg p-3 cursor-pointer hover:bg-slate-750 border border-slate-700 hover:border-sky-700 transition"
            onClick={() => onSelectRun(run.id)}
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
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500">Phase: {run.phase}</span>
              <span className="text-xs text-slate-600">·</span>
              <span className="text-xs text-slate-500">Attempt {run.attempt}</span>
              {run.startedAt && (
                <>
                  <span className="text-xs text-slate-600">·</span>
                  <span className="text-xs text-slate-500">{new Date(run.startedAt).toLocaleTimeString()}</span>
                </>
              )}
            </div>
            {run.branch && (
              <div className="text-xs text-slate-600 font-mono mt-1 truncate">{run.branch}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
