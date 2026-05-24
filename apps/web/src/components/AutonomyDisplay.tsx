import { AUTONOMY_LEVELS } from '../types.js';

export function AutonomyDisplay({ level }: { level: number }) {
  const info = AUTONOMY_LEVELS[level] ?? { label: `Level ${level}`, description: 'Unknown autonomy level' };

  const levelColor =
    level === 0 ? 'bg-slate-700 text-slate-300' :
    level === 1 ? 'bg-blue-900 text-blue-200' :
    level === 2 ? 'bg-amber-900 text-amber-200' :
    level === 3 ? 'bg-orange-900 text-orange-200' :
    level === 4 ? 'bg-red-900 text-red-200' :
    'bg-slate-700 text-slate-300';

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
      <h4 className="text-sm font-semibold text-slate-300 mb-2">Autonomy Mode</h4>
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${levelColor}`}>
          Level {level}
        </span>
        <span className="text-sm text-sky-300 font-medium">{info.label}</span>
      </div>
      <div className="text-xs text-slate-400 mt-1">{info.description}</div>
    </div>
  );
}
