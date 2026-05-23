import { useState, useEffect } from 'react';
import { getAdapterHealth } from '../dashboard-api.js';
import type { AdapterHealth } from '../dashboard-types.js';
import { StatusBadge } from './StatusBadge.js';

export function AdapterHealthPanel() {
  const [health, setHealth] = useState<AdapterHealth | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    getAdapterHealth().then(setHealth).catch(() => {});
  }, []);

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
      <button
        className="flex items-center justify-between w-full text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-sm font-semibold text-slate-300">Adapter Health</span>
        <span className="text-xs text-slate-500">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && health && (
        <div className="mt-2 space-y-2 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-slate-400">GitHub</span>
            <StatusBadge status={health.github.available ? 'success' : 'failed'} />
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Spec Kit</span>
            <span className="text-slate-300">
              {health.specKit.available ? `v${health.specKit.version ?? '?'}` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">OpenCode</span>
            <span className="text-slate-300">
              {health.openCode.available ? `v${health.openCode.version ?? '?'}` : 'N/A'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
