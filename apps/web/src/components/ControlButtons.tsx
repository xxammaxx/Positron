import { useState } from 'react';
import { controlRun } from '../dashboard-api.js';
import type { RunRecord } from '../types.js';

interface ControlButtonsProps {
  run: RunRecord;
}

export function ControlButtons({ run }: ControlButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isTerminal = run.phase === 'DONE' || run.phase === 'FAILED_BLOCKED' || run.phase === 'FAILED_UNSAFE';
  const isPaused = false; // determined by server signal state (not exposed via API yet)

  async function handleAction(action: 'pause' | 'abort' | 'resume' | 'retry') {
    setLoading(action);
    setError(null);
    try {
      const result = await controlRun(run.id, action);
      if (!result.ok) {
        setError(`Control action failed: ${action}`);
      }
    } catch (e) {
      setError(`Failed to ${action}: ${String(e)}`);
    } finally {
      setLoading(null);
    }
  }

  const buttons: Array<{ action: 'pause' | 'abort' | 'resume' | 'retry'; label: string; icon: string }> = [
    { action: 'pause', label: 'Pause', icon: '⏸' },
    { action: 'abort', label: 'Abort', icon: '⏹' },
    { action: 'resume', label: 'Resume', icon: '▶' },
    { action: 'retry', label: 'Retry', icon: '🔄' },
  ];

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
      <h4 className="text-sm font-semibold text-slate-300 mb-2">Run Controls</h4>
      <div className="flex flex-wrap gap-2">
        {buttons.map(btn => {
          const isDisabled = isTerminal || loading !== null;
          const isLoading = loading === btn.action;

          let bgColor = 'bg-slate-800 border-slate-700';
          if (btn.action === 'abort') bgColor = 'bg-red-950 border-red-800 hover:bg-red-900';
          else if (btn.action === 'retry') bgColor = 'bg-amber-950 border-amber-800 hover:bg-amber-900';
          else bgColor = 'bg-slate-800 border-slate-700 hover:bg-slate-700';

          return (
            <button
              key={btn.action}
              onClick={() => handleAction(btn.action)}
              disabled={isDisabled}
              className={`px-3 py-1.5 text-xs rounded border flex items-center gap-1.5 transition ${
                isDisabled
                  ? 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed'
                  : `${bgColor} text-slate-200 cursor-pointer`
              }`}
              title={isTerminal ? 'Run has finished' : `Send ${btn.action} signal`}
            >
              <span>{btn.icon}</span>
              <span>{isLoading ? '...' : btn.label}</span>
            </button>
          );
        })}
      </div>
      {error && (
        <div className="mt-2 text-xs text-red-400">{error}</div>
      )}
      {isTerminal && (
        <div className="mt-2 text-xs text-slate-500">Run has finished — no controls available</div>
      )}
    </div>
  );
}
