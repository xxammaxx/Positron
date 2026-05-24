import type { RunControlState } from '../dashboard-types.js';

/** Pre-defined control states — backend doesn't support run control yet */
const CONTROL_STATES: RunControlState[] = [
  { supported: false, enabled: false, reason: 'Backend endpoint not implemented', icon: '⏸', label: 'Pause' },
  { supported: false, enabled: false, reason: 'Backend endpoint not implemented', icon: '⏹', label: 'Abort' },
  { supported: false, enabled: false, reason: 'Backend endpoint not implemented', icon: '▶', label: 'Resume' },
  { supported: false, enabled: false, reason: 'Backend endpoint not implemented', icon: '🔄', label: 'Retry' },
];

export function ControlButtons() {
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
      <h4 className="text-sm font-semibold text-slate-300 mb-2">Run Controls</h4>
      <div className="flex flex-wrap gap-2">
        {CONTROL_STATES.map(ctrl => (
          <div key={ctrl.label} className="relative group">
            <button
              disabled
              className="px-3 py-1.5 text-xs rounded bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed flex items-center gap-1.5"
              title={ctrl.reason}
            >
              <span>{ctrl.icon}</span>
              <span>{ctrl.label}</span>
            </button>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
              <div className="bg-slate-700 text-xs text-slate-200 px-2 py-1 rounded whitespace-nowrap shadow-lg">
                ⛔ {ctrl.reason}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="text-xs text-slate-500 mt-2">
        Run control requires backend support — planned for a future issue.
      </div>
    </div>
  );
}
