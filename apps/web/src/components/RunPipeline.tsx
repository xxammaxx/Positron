import type { RunEvent } from '../types.js';

const PHASE_ORDER = [
  'QUEUED', 'CLAIMED', 'REPO_SYNC', 'SPECIFY', 'PLAN',
  'TASKS', 'IMPLEMENT', 'TEST', 'VERIFY', 'COMMIT', 'PR_CREATE', 'DONE',
];

export function RunPipeline({ events, currentPhase }: { events: RunEvent[]; currentPhase: string }) {
  const eventPhases = new Set(events.map(e => e.phase));

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {PHASE_ORDER.map(phase => {
        const reached = eventPhases.has(phase);
        const current = phase === currentPhase;
        const failed = events.some(e => e.phase === phase && e.level === 'ERROR');

        let color = 'bg-slate-700 text-slate-500';
        if (failed) color = 'bg-red-900 text-red-300 border border-red-700';
        else if (current) color = 'bg-sky-900 text-sky-200 border border-sky-600 animate-pulse';
        else if (reached) color = 'bg-emerald-900 text-emerald-200';

        return (
          <span
            key={phase}
            className={`px-2 py-0.5 rounded text-xs font-mono ${color}`}
            title={phase}
          >
            {phase.replace(/_/g, ' ')}
          </span>
        );
      })}
    </div>
  );
}
