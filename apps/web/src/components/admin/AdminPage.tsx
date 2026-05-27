import React, { useEffect, useState, useCallback } from 'react';

interface AdminStats {
  runs: { total: number; active: number; failed: number; done: number };
  repositories: number;
  events: number;
  artifacts: number;
  dbSizeMb: number;
}

export default function AdminPage(): React.ReactElement {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionResult, setActionResult] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      setStats(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const bulkAction = async (endpoint: string, label: string) => {
    setActionResult(`${label}...`);
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      setActionResult(`${label}: ${JSON.stringify(data)}`);
      fetchStats();
    } catch (err) {
      setActionResult(`Error: ${String(err)}`);
    }
  };

  if (loading) {
    return <div className="space-y-3 animate-pulse">
      <div className="skeleton h-8 w-32" />
      <div className="skeleton h-24 w-full" />
    </div>;
  }

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p className="text-sm text-slate-400 mt-1 mb-6">System operations and database management</p>

      {actionResult && (
        <div className="bg-sky-500/10 border border-sky-800 rounded-lg p-3 text-xs text-sky-400 mb-4">{actionResult}</div>
      )}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Runs', value: stats.runs.total },
            { label: 'Active', value: stats.runs.active, color: 'text-sky-400' },
            { label: 'Failed/Blocked', value: stats.runs.failed, color: 'text-red-400' },
            { label: 'Done', value: stats.runs.done, color: 'text-green-400' },
            { label: 'Repositories', value: stats.repositories },
            { label: 'Events', value: stats.events },
            { label: 'Artifacts', value: stats.artifacts },
            { label: 'DB Size', value: `${stats.dbSizeMb} MB`, color: 'text-amber-400' },
          ].map(item => (
            <div key={item.label} className="card">
              <p className="text-xs text-slate-400">{item.label}</p>
              <p className={`text-2xl font-bold mt-1 ${item.color ?? 'text-slate-200'}`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <div className="card">
          <h3 className="text-sm font-semibold mb-3">Bulk Operations</h3>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => bulkAction('/api/admin/runs/bulk-cancel', 'Cancel All')} className="btn-danger text-sm">
              Cancel All Active/Blocked
            </button>
            <button onClick={() => bulkAction('/api/admin/runs/bulk-retry', 'Retry Failed')} className="btn-secondary text-sm">
              Retry All Failed
            </button>
            <button onClick={() => bulkAction('/api/admin/runs/cleanup', 'Cleanup')} className="btn-ghost text-sm">
              Cleanup Old Events (7d) + VACUUM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
