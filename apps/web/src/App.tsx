import { useState, useEffect, useCallback } from 'react';
import { registerRepo, checkHealth } from './dashboard-api.js';
import { IssueQueue } from './components/IssueQueue.js';
import { RunList } from './components/RunList.js';
import { RunDetailPage } from './components/RunDetailPage.js';
import { AdapterHealthPanel } from './components/AdapterHealthPanel.js';
import { SafetyControls } from './components/SafetyControls.js';
import { StatusBadge } from './components/StatusBadge.js';
import type { RepoInfo, HealthStatus } from './types.js';

export default function App() {
  const [repo, setRepo] = useState<RepoInfo | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [initLoading, setInitLoading] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      registerRepo().catch(() => null),
      checkHealth().catch(() => null),
    ]).then(([r, h]) => {
      if (r) setRepo(r);
      if (h) setHealth(h);
      setInitLoading(false);
    });
  }, []);

  const refreshRuns = useCallback(() => setRunKey(k => k + 1), []);

  if (initLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-sky-400 text-xl font-mono animate-pulse">Connecting to Positron...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedRunId(null)}
              className="text-2xl font-bold text-sky-400 hover:text-sky-300 transition"
            >
              Positron
            </button>
            <span className="text-xs text-slate-500 font-mono">Operator Cockpit</span>
          </div>
          <div className="flex items-center gap-4">
            {repo && <StatusBadge status={repo.mode === 'real' ? 'active' : 'pending'} />}
            {health && (
              <span className="text-xs text-slate-500 font-mono">{health.runs} runs</span>
            )}
          </div>
        </div>
      </header>

      {error && <div className="bg-red-900 text-red-200 px-6 py-2 text-sm">{error}</div>}

      {/* Main Content */}
      {selectedRunId ? (
        <main className="max-w-7xl mx-auto">
          <RunDetailPage runId={selectedRunId} onBack={() => { setSelectedRunId(null); refreshRuns(); }} />
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-6 py-6">
          {/* Top Row: Safety + Adapters */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2">
              <SafetyControls />
            </div>
            <AdapterHealthPanel />
          </div>

          {/* Main Grid: Issues + Runs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-slate-900 rounded-xl p-4 border border-slate-800">
              {repo
                ? <IssueQueue repoId={repo.id} onRunStarted={refreshRuns} />
                : <div className="text-amber-400 p-4">No repository configured.</div>
              }
            </section>

            <section className="bg-slate-900 rounded-xl p-4 border border-slate-800">
              <RunList key={runKey} onSelectRun={setSelectedRunId} />
            </section>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-slate-600 py-4 border-t border-slate-900">
        Positron Operator Cockpit · {health ? `${health.runs} runs` : ''} · ready
      </footer>
    </div>
  );
}
