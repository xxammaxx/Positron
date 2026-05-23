import { useState, useEffect } from 'react';
import { listIssues, startRun } from '../dashboard-api.js';
import type { GitHubIssueSummary } from '../types.js';

export function IssueQueue({ repoId, onRunStarted }: {
  repoId: string;
  onRunStarted: () => void;
}) {
  const [issues, setIssues] = useState<GitHubIssueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState<number | null>(null);

  useEffect(() => {
    listIssues(repoId)
      .then((i: GitHubIssueSummary[]) => { setIssues(i); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, [repoId]);

  async function handleStart(issueNumber: number) {
    setRunning(issueNumber);
    try {
      await startRun(repoId, issueNumber);
      onRunStarted();
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(null);
    }
  }

  if (loading) return <div className="text-slate-400 p-4">Loading issues...</div>;
  if (error) return <div className="text-red-400 p-4">Error: {error}</div>;

  const positronReady = issues.filter((i: GitHubIssueSummary) => i.labels.some((l: string) => l.startsWith('positron:')));
  const other = issues.filter((i: GitHubIssueSummary) => !i.labels.some((l: string) => l.startsWith('positron:')));

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-white">
        Issues ({issues.length}) · <span className="text-sky-400">{positronReady.length} positron</span>
      </h3>

      {[...positronReady, ...other].slice(0, 10).map((issue: GitHubIssueSummary) => (
        <div key={issue.number} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <a
                href={issue.htmlUrl}
                target="_blank"
                rel="noopener"
                className="text-sm text-sky-300 hover:text-sky-200 font-medium truncate"
              >
                #{issue.number} {issue.title}
              </a>
              <div className="flex flex-wrap gap-1 mt-1">
                {issue.labels.map((l: string) => (
                  <span key={l} className={`px-1.5 py-0.5 rounded text-xs ${
                    l.startsWith('positron:') ? 'bg-sky-900 text-sky-300' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {l}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => handleStart(issue.number)}
              disabled={running === issue.number}
              className="shrink-0 px-3 py-1.5 text-xs bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white rounded font-semibold transition"
            >
              {running === issue.number ? '...' : 'Run'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
