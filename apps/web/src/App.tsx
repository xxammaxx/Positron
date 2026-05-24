import { useState, useEffect, useCallback } from 'react';
import { registerRepo, checkHealth, startRun } from './dashboard-api.js';
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
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [mode, setMode] = useState<string>('loading');
  const [demoRunning, setDemoRunning] = useState(false);

  useEffect(() => {
    Promise.all([
      registerRepo().catch(() => null),
      checkHealth().catch(() => null),
    ]).then(([r, h]) => {
      if (r) setRepo(r);
      if (h) {
        setHealth(h);
        setApiOnline(true);
      } else {
        setApiOnline(false);
      }
      // Determine mode
      if (r && r.mode === 'real') setMode('real');
      else if (r && r.mode === 'fake') setMode('demo');
      else setMode('demo');
      setInitLoading(false);
    }).catch(() => {
      setApiOnline(false);
      setMode('config-error');
      setInitLoading(false);
    });
  }, []);

  const refreshRuns = useCallback(() => setRunKey(k => k + 1), []);

  async function handleDemoRun() {
    setDemoRunning(true);
    try {
      await startRun(repo?.id ?? 'repo-1', 42);
      refreshRuns();
    } catch (e) {
      setError(`Demo run failed: ${String(e)}`);
    }
    setDemoRunning(false);
  }

  if (initLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-sky-400 text-xl font-mono animate-pulse">Connecting to Positron...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Mode Banner */}
      <div className={`text-center text-xs font-mono py-1.5 ${
        mode === 'demo' ? 'bg-amber-900 text-amber-200' :
        mode === 'real' ? 'bg-emerald-900 text-emerald-200' :
        'bg-red-900 text-red-200'
      }`}>
        {mode === 'demo' && '⚠️ DEMO MODE — no GitHub token configured. Data is simulated.'}
        {mode === 'real' && '✅ REAL MODE — connected to GitHub.'}
        {mode === 'config-error' && '❌ CONFIG ERROR — check GITHUB_TOKEN, POSITRON_REPO_OWNER, POSITRON_REPO_NAME.'}
      </div>

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
            {/* API Status */}
            <span className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-emerald-500' : apiOnline === false ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-xs text-slate-500">{apiOnline ? 'API' : 'API offline'}</span>
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
          {/* Demo Action */}
          {mode === 'demo' && (
            <div className="bg-amber-950 border border-amber-800 rounded-lg p-4 mb-6 flex items-center justify-between">
              <div>
                <div className="text-amber-300 text-sm font-semibold">Demo Mode</div>
                <div className="text-amber-500 text-xs mt-1">Create a demo run to explore the operator dashboard.</div>
              </div>
              <button
                onClick={handleDemoRun}
                disabled={demoRunning}
                className="px-4 py-2 bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white text-sm rounded font-mono transition"
              >
                {demoRunning ? 'Creating...' : '▶ Start Demo Run'}
              </button>
            </div>
          )}

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
                : (
                  <div className="text-center py-4">
                    <div className="text-amber-400 font-mono">No repository configured</div>
                    <div className="text-slate-500 text-xs mt-1">
                      Set GITHUB_TOKEN, POSITRON_REPO_OWNER, POSITRON_REPO_NAME
                    </div>
                  </div>
                )
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
        Positron Operator Cockpit · {health ? `${health.runs} runs` : ''} · {mode === 'demo' ? 'demo' : mode}
      </footer>
    </div>
  );
}
