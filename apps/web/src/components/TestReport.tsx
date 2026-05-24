import type { TestSummary } from '../types.js';

export function TestReport({ report, events }: { report: TestSummary | null | undefined; events: { phase: string; level: string; message: string }[] }) {
  if (!report) {
    // Fallback: try to extract from events
    const testEvents = events.filter(e => e.phase === 'TEST');
    if (testEvents.length === 0) {
      return (
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
          <h4 className="text-sm font-semibold text-slate-300 mb-2">Test Report</h4>
          <div className="text-xs text-slate-500">Test phase not yet reached</div>
        </div>
      );
    }
    return renderFromEvents(testEvents);
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
      <h4 className="text-sm font-semibold text-slate-300 mb-2">Test Report</h4>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <span className={`font-bold ${report.status === 'PASS' ? 'text-emerald-400' : 'text-red-400'}`}>
            {report.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}
          </span>
          {report.total !== undefined && (
            <span className="text-slate-400">{report.total} test{report.total !== 1 ? 's' : ''}</span>
          )}
        </div>
        {report.passed !== undefined && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-950 rounded px-2 py-1">
              <div className="text-emerald-400 font-bold">{report.passed}</div>
              <div className="text-emerald-600">passed</div>
            </div>
            <div className="bg-red-950 rounded px-2 py-1">
              <div className="text-red-400 font-bold">{report.failed ?? 0}</div>
              <div className="text-red-600">failed</div>
            </div>
            <div className="bg-slate-800 rounded px-2 py-1">
              <div className="text-slate-300 font-bold">{report.durationMs ?? '—'}</div>
              <div className="text-slate-600">ms</div>
            </div>
          </div>
        )}
        {report.summary && (
          <div className="text-slate-400 font-mono mt-1 text-[10px]">{report.summary}</div>
        )}
      </div>
    </div>
  );
}

function renderFromEvents(testEvents: { phase: string; level: string; message: string }[]) {
  const lastEvent = testEvents[testEvents.length - 1];
  const hasFail = testEvents.some(e => e.level === 'ERROR');
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-3">
      <h4 className="text-sm font-semibold text-slate-300 mb-2">Test Report</h4>
      <div className="flex items-center gap-2 text-xs">
        <span className={hasFail ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
          {hasFail ? '❌ FAIL' : '✅ PASS'}
        </span>
        <span className="text-slate-500">{testEvents.length} event{testEvents.length !== 1 ? 's' : ''}</span>
      </div>
      {lastEvent && (
        <div className="text-xs text-slate-400 font-mono mt-1">{lastEvent.message}</div>
      )}
    </div>
  );
}
