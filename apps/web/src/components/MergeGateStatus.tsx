import { useState, useEffect } from 'react';
import { getMergeStatus } from '../dashboard-api.js';
import type { MergeGateStatus as MergeStatus } from '../dashboard-types.js';

export function MergeGateStatus({ runId }: { runId: string }) {
  const [status, setStatus] = useState<MergeStatus | null>(null);

  useEffect(() => {
    getMergeStatus(runId).then(setStatus).catch(() => {});
  }, [runId]);

  if (!status) return null;

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-3 mt-2">
      <h4 className="text-sm font-semibold text-slate-300 mb-2">Merge Gates</h4>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <GateItem label="Enabled" value={status.enabled} />
        <GateItem label="Dry-Run" value={status.dryRun} variant="warn" />
        <GateItem label="Kill-Switch" value={!status.killSwitch} variant="danger" />
        <GateItem label="Run Status" value={status.runStatus === 'active'} />
        <GateItem label="Test Evidence" value={status.hasTestEvidence} />
        <GateItem label="Branch" value={!!status.branch} />
      </div>

      {status.blockedReasons.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-800">
          {status.blockedReasons.map((r: string) => (
            <div key={r} className="text-xs text-amber-400 font-mono">⚠ {r}</div>
          ))}
        </div>
      )}

      <div className={`mt-2 text-sm font-bold ${status.canMerge ? 'text-emerald-400' : 'text-amber-400'}`}>
        {status.canMerge ? '✅ Ready to Merge' : '🚫 Merge Blocked'}
      </div>
    </div>
  );
}

function GateItem({ label, value, variant }: { label: string; value: boolean; variant?: string }) {
  const color = variant === 'danger' ? (value ? 'text-emerald-400' : 'text-red-400')
    : variant === 'warn' ? (value ? 'text-amber-400' : 'text-slate-500')
    : value ? 'text-emerald-400' : 'text-red-400';
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={color}>{value ? '✓' : '✗'}</span>
    </div>
  );
}
