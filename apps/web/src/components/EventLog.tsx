import { useState, useMemo } from 'react';
import type { RunEvent } from '../types.js';

interface EventLogProps {
  events: RunEvent[];
}

const ALL_LEVELS = ['INFO', 'WARN', 'ERROR', 'GATE', 'HUMAN'] as const;

export function EventLog({ events }: EventLogProps) {
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [phaseFilter, setPhaseFilter] = useState<string>('ALL');

  const phases = useMemo(() => {
    const set = new Set(events.map(e => e.phase));
    return Array.from(set).sort();
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (levelFilter !== 'ALL' && e.level !== levelFilter) return false;
      if (phaseFilter !== 'ALL' && e.phase !== phaseFilter) return false;
      return true;
    });
  }, [events, levelFilter, phaseFilter]);

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
      <h4 className="text-sm font-semibold text-slate-300 mb-2">
        Event Log ({filtered.length}/{events.length})
      </h4>

      {/* Filters */}
      <div className="flex gap-2 mb-2">
        <select
          value={levelFilter}
          onChange={e => setLevelFilter(e.target.value)}
          className="bg-slate-800 text-xs text-slate-300 border border-slate-700 rounded px-1.5 py-1 font-mono"
        >
          <option value="ALL">All Levels</option>
          {ALL_LEVELS.map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <select
          value={phaseFilter}
          onChange={e => setPhaseFilter(e.target.value)}
          className="bg-slate-800 text-xs text-slate-300 border border-slate-700 rounded px-1.5 py-1 font-mono"
        >
          <option value="ALL">All Phases</option>
          {phases.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Events */}
      <div className="max-h-64 overflow-y-auto space-y-0.5">
        {filtered.length === 0 ? (
          <div className="text-xs text-slate-500 italic">No matching events</div>
        ) : (
          filtered.map(ev => {
            const levelColor =
              ev.level === 'ERROR' ? 'text-red-400' :
              ev.level === 'WARN' ? 'text-amber-400' :
              ev.level === 'GATE' ? 'text-purple-400' :
              ev.level === 'HUMAN' ? 'text-cyan-400' :
              'text-slate-400';
            return (
              <div key={ev.id} className={`text-xs font-mono py-1 border-b border-slate-800/50 ${levelColor}`}>
                <span className="text-slate-600 mr-1">{ev.phase}</span>
                <span className="text-[10px] opacity-70 mr-1">{ev.level}</span>
                <span>{ev.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
