import type { RunEvent } from '../types.js';

const PHASE_ORDER: string[] = [
  'QUEUED', 'CLAIMED', 'REPO_SYNC', 'ISSUE_CONTEXT',
  'WEB_RESEARCH', 'SPECIFY', 'CLARIFY_OPTIONAL',
  'PLAN', 'TASKS', 'ANALYZE', 'REVIEW', 'IMPLEMENT',
  'TEST', 'VERIFY', 'COMMIT', 'PR_CREATE', 'MERGE', 'DONE',
  'FAILED_TRANSIENT', 'FAILED_BLOCKED', 'FAILED_UNSAFE',
];

const FAILURE_PHASES = new Set(['FAILED_TRANSIENT', 'FAILED_BLOCKED', 'FAILED_UNSAFE']);

export function RunPipeline({ events, currentPhase }: { events: RunEvent[]; currentPhase: string }) {
  const eventPhases = new Set(events.map(e => e.phase));

  // Count retry events (FAILED_TRANSIENT entries that have a retry follow-up)
  const transientCount = events.filter(e => e.phase === 'FAILED_TRANSIENT').length;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {PHASE_ORDER.map(phase => {
        const reached = eventPhases.has(phase);
        const current = phase === currentPhase;
        const failed = events.some(e => e.phase === phase && e.level === 'ERROR');
        const isFailure = FAILURE_PHASES.has(phase);

        let color = 'bg-slate-700 text-slate-500';
        if (failed) color = 'bg-red-900 text-red-300 border border-red-700';
        else if (current && isFailure) color = 'bg-red-900 text-red-200 border border-red-500 animate-pulse';
        else if (current) color = 'bg-sky-900 text-sky-200 border border-sky-600 animate-pulse';
        else if (reached && isFailure) color = 'bg-red-950 text-red-300 border border-red-800';
        else if (reached) color = 'bg-emerald-900 text-emerald-200';

        // Show retry badge on FAILED_TRANSIENT when there were retries
        const retryCount = phase === 'FAILED_TRANSIENT' && transientCount > 0 ? transientCount : 0;

        return (
          <span
            key={phase}
            className={`relative px-2 py-0.5 rounded text-xs font-mono ${color}`}
            title={`${phase}${isFailure ? ' (failure state)' : ''}${retryCount ? ` — ${retryCount} retries` : ''}`}
          >
            {phase.replace(/_/g, ' ')}
            {retryCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-black text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {retryCount}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
