export function SafetyControls() {
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
      <h4 className="text-sm font-semibold text-slate-300 mb-2">Safety Controls</h4>
      <div className="grid grid-cols-2 gap-2">
        <GateFlag label="Enable Merge" env="POSITRON_ENABLE_MERGE" />
        <GateFlag label="Dry Run" env="POSITRON_MERGE_DRY_RUN" />
        <GateFlag label="Enable Push" env="POSITRON_ENABLE_PUSH" />
        <GateFlag label="Kill Switch" env="POSITRON_MERGE_KILL_SWITCH" danger />
      </div>
      <div className="mt-2 pt-2 border-t border-slate-800 text-xs text-slate-500">
        Set via environment variables on server
      </div>
    </div>
  );
}

function GateFlag({ label, env, danger }: { label: string; env: string; danger?: boolean }) {
  // In real deployment, this would query the server for actual env state
  return (
    <div className={`flex items-center justify-between px-2 py-1 rounded text-xs ${danger ? 'bg-red-950 border border-red-900' : 'bg-slate-800'}`}>
      <span className="text-slate-400">{label}</span>
      <code className={`font-mono ${danger ? 'text-red-300' : 'text-slate-500'}`}>{env}</code>
    </div>
  );
}
