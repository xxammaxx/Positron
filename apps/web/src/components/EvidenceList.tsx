import type { EvidenceItem } from '../types.js';

export function EvidenceList({ evidence }: { evidence: EvidenceItem[] | undefined }) {
  if (!evidence || evidence.length === 0) {
    return (
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">Evidence</h4>
        <div className="text-xs text-slate-500">No evidence collected yet</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
      <h4 className="text-sm font-semibold text-slate-300 mb-2">
        Evidence ({evidence.length})
      </h4>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {evidence.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-slate-800 last:border-0">
            <span>
              {item.status === 'pass' ? '✅' : item.status === 'fail' ? '❌' : '⏭️'}
            </span>
            <span className="font-mono text-[10px] text-slate-500 shrink-0">{item.kind}</span>
            <span className="text-slate-300 truncate">{item.summary}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
