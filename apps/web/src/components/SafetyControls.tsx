import { useState, useEffect } from 'react';
import { getSafetyState } from '../dashboard-api.js';
import type { SafetyState } from '../types.js';

export function SafetyControls() {
  const [safety, setSafety] = useState<SafetyState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSafetyState()
      .then(setSafety)
      .catch(e => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">Safety Controls</h4>
        <div className="text-xs text-amber-400">Could not fetch safety state: {error}</div>
        <div className="mt-1 text-xs text-slate-500">Using environment variables on server</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
      <h4 className="text-sm font-semibold text-slate-300 mb-2">Safety Controls</h4>
      <div className="grid grid-cols-2 gap-2">
        <GateFlag
          label="Enable Merge"
          active={safety?.enableMerge ?? false}
          env="POSITRON_ENABLE_MERGE"
        />
        <GateFlag
          label="Dry Run"
          active={safety?.mergeDryRun ?? false}
          env="POSITRON_MERGE_DRY_RUN"
          warn
        />
        <GateFlag
          label="Enable Push"
          active={safety?.enablePush ?? false}
          env="POSITRON_ENABLE_PUSH"
        />
        <GateFlag
          label="Kill Switch"
          active={safety?.killSwitch ?? false}
          env="POSITRON_MERGE_KILL_SWITCH"
          danger
        />
        <GateFlag
          label="Fix Loop"
          active={safety?.enableFixLoop ?? false}
          env="POSITRON_ENABLE_FIX_LOOP"
        />
      </div>
      <div className="mt-2 pt-2 border-t border-slate-800 text-xs text-slate-500">
        Live server state · set via environment variables
      </div>
    </div>
  );
}

function GateFlag({ label, active, env, danger, warn }: {
  label: string; active: boolean; env: string; danger?: boolean; warn?: boolean;
}) {
  const bgColor = danger
    ? (active ? 'bg-red-950 border border-red-900' : 'bg-slate-800 border border-slate-700')
    : warn
    ? (active ? 'bg-amber-950 border border-amber-900' : 'bg-slate-800 border border-slate-700')
    : 'bg-slate-800';

  const dotColor = danger
    ? (active ? 'bg-red-500' : 'bg-slate-600')
    : warn
    ? (active ? 'bg-amber-500' : 'bg-slate-600')
    : (active ? 'bg-emerald-500' : 'bg-slate-600');

  return (
    <div className={`flex items-center justify-between px-2 py-1 rounded text-xs ${bgColor}`}>
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span className={active ? 'text-slate-200' : 'text-slate-500'}>{label}</span>
      </div>
      <span className={`text-[10px] font-mono ${active ? (danger ? 'text-red-300' : warn ? 'text-amber-300' : 'text-emerald-400') : 'text-slate-600'}`}>
        {active ? 'ON' : 'OFF'}
      </span>
    </div>
  );
}
