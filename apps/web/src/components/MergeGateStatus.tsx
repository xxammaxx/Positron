import { useState, useEffect } from 'react';
import { getMergeStatus } from '../dashboard-api.js';
import type { MergeGateStatus as MergeStatus } from '../dashboard-types.js';

export function MergeGateStatus({ runId }: { runId: string }) {
  const [status, setStatus] = useState<MergeStatus | null>(null);

  useEffect(() => {
    getMergeStatus(runId).then(setStatus).catch(() => {});
  }, [runId]);

  if (!status) return null;

  const gates: GateDef[] = [
    { label: 'Auto-Merge Enabled', active: status.enabled, explanation: status.enabled
      ? 'POSITRON_ENABLE_MERGE=true — auto-merge is active'
      : 'POSITRON_ENABLE_MERGE not set — auto-merge disabled' },
    { label: 'Dry-Run', active: status.dryRun, variant: 'warn', explanation: status.dryRun
      ? 'POSITRON_MERGE_DRY_RUN=true — merge will be simulated only'
      : 'Dry-run disabled — real merge will be attempted' },
    { label: 'Kill-Switch', active: !status.killSwitch, variant: 'danger', explanation: status.killSwitch
      ? 'POSITRON_MERGE_KILL_SWITCH=true — ALL MERGES BLOCKED'
      : 'Kill-switch not active — merges proceed normally' },
    { label: 'Run Status Active', active: status.runStatus === 'active', explanation: status.runStatus === 'active'
      ? 'Run is in active state'
      : `Run status is "${status.runStatus}" — must be "active" to merge` },
    { label: 'Test Evidence', active: status.hasTestEvidence, explanation: status.hasTestEvidence
      ? 'Tests have been executed and logged'
      : 'No test evidence found — merge requires passing tests' },
    { label: 'Branch Exists', active: !!status.branch, explanation: status.branch
      ? `Branch: ${status.branch}`
      : 'No branch — merge requires a branch with changes' },
  ];

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
      <h4 className="text-sm font-semibold text-slate-300 mb-2">Merge Gates</h4>

      <div className="space-y-1 text-xs">
        {gates.map(gate => (
          <GateRow key={gate.label} gate={gate} />
        ))}
      </div>

      {status.blockedReasons.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-800">
          <div className="text-xs text-slate-500 mb-1">Blocked reasons:</div>
          {status.blockedReasons.map((r: string) => (
            <div key={r} className="text-xs text-amber-400 font-mono">⚠ {r}</div>
          ))}
        </div>
      )}

      <div className={`mt-2 pt-2 border-t border-slate-800 text-sm font-bold ${
        status.canMerge ? 'text-emerald-400' : 'text-amber-400'
      }`}>
        {status.canMerge
          ? '✅ Ready to Merge — all gates pass'
          : '🚫 Merge Blocked — one or more gates failing'}
      </div>
    </div>
  );
}

interface GateDef {
  label: string;
  active: boolean;
  variant?: string;
  explanation: string;
}

function GateRow({ gate }: { gate: GateDef }) {
  const { label, active, variant, explanation } = gate;
  const dotColor = variant === 'danger'
    ? (active ? 'bg-emerald-500' : 'bg-red-500')
    : variant === 'warn'
    ? (active ? 'bg-amber-500' : 'bg-slate-600')
    : (active ? 'bg-emerald-500' : 'bg-red-500');

  return (
    <div className="flex items-center justify-between py-1 group relative">
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span className={active ? 'text-slate-300' : 'text-slate-500'}>{label}</span>
      </div>
      <span className={active ? 'text-emerald-400' : 'text-red-400'}>
        {active ? '✓' : '✗'}
      </span>
      {/* Tooltip */}
      <div className="absolute top-full left-0 mt-1 hidden group-hover:block z-10">
        <div className="bg-slate-700 text-[10px] text-slate-200 px-2 py-1 rounded shadow-lg max-w-64">
          {explanation}
        </div>
      </div>
    </div>
  );
}
