import { useState, useEffect, useCallback } from 'react';
import { registerRepo, checkHealth } from './api.js';
import { IssueQueue } from './components/IssueQueue.js';
import { RunList } from './components/RunList.js';
import { StatusBadge } from './components/StatusBadge.js';
import type { RepoInfo, HealthStatus } from './types.js';

export default function App() {
  const [repo, setRepo] = useState<RepoInfo | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [initLoading, setInitLoading] = useState(true);

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
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-sky-400">Positron</h1>
            <span className="text-xs text-slate-500 font-mono">Issue Orchestrator</span>
          </div>
          <div className="flex items-center gap-4">
            {repo && (
              <div className="flex items-center gap-2">
                <StatusBadge status={repo.status} />
                <span className="text-xs text-slate-400">{repo.mode} mode</span>
              </div>
            )}
            {health && (
              <div className="text-xs text-slate-500 font-mono">
                {health.runs} runs · {health.status}
              </div>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-900 text-red-200 px-6 py-2 text-sm">{error}</div>
      )}

      {/* Dashboard Grid */}
      <main className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Issue Queue */}
        <section className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          {repo
            ? <IssueQueue repoId={repo.id} onRunStarted={refreshRuns} />
            : <div className="text-amber-400 p-4">No repository configured.</div>
          }
        </section>

        {/* Right: Runs */}
        <section className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <RunList key={runKey} />
        </section>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-600 py-4 border-t border-slate-900">
        Positron MVP · {health ? `${health.runs} runs` : ''}
      </footer>
    </div>
  );
}
