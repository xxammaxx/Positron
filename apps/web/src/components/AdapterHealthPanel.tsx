import { useState, useEffect } from 'react';
import { getAdapterHealth } from '../dashboard-api.js';
import type { AdapterHealth } from '../dashboard-types.js';
import { StatusBadge } from './StatusBadge.js';

export function AdapterHealthPanel() {
  const [health, setHealth] = useState<AdapterHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdapterHealth()
      .then(h => { setHealth(h); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
      <h4 className="text-sm font-semibold text-slate-300 mb-2">Adapter Health</h4>

      {loading && (
        <div className="text-xs text-slate-500 animate-pulse">Loading...</div>
      )}

      {error && (
        <div className="text-xs text-red-400">API unreachable</div>
      )}

      {!loading && !error && health && (
        <div className="space-y-1.5 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-slate-400">GitHub</span>
            <StatusBadge status={health.github.available ? 'success' : 'failed'} />
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Spec Kit</span>
            <span className={health.specKit.available ? 'text-emerald-400' : 'text-slate-600'}>
              {health.specKit.available ? `v${health.specKit.version ?? '?'}` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">OpenCode</span>
            <span className={health.openCode.available ? 'text-emerald-400' : 'text-slate-600'}>
              {health.openCode.available ? `v${health.openCode.version ?? '?'}` : 'N/A'}
            </span>
          </div>
        </div>
      )}

      {!loading && !error && !health && (
        <div className="text-xs text-slate-500">
          No adapter data — API may be using fake adapters.
        </div>
      )}
    </div>
  );
}
