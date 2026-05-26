import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import StatusSummary from './StatusSummary.js';
import EvidenceSummary from './EvidenceSummary.js';
import AttentionQueue from './AttentionQueue.js';
import RecentActivity from './RecentActivity.js';
import SystemHealth from './SystemHealth.js';
import EmptyState from '../shared/EmptyState.js';
import ErrorBanner from '../shared/ErrorBanner.js';
import NewRunModal from './NewRunModal.js';
import BlueprintPanel from './BlueprintPanel.js';
import type { Run, Metrics } from '../../types.js';

export default function DashboardPage(): React.ReactElement {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<Run[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewRunModalOpen, setIsNewRunModalOpen] = useState(false);
  const [evidenceSummary, setEvidenceSummary] = useState<{
    totalArtifacts: number; artifactBreakdown: Record<string, number>;
    testEvents: number; errorEvents: number; warningEvents: number;
    screenshotCount?: number;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [runsData, metricsData, evidenceData] = await Promise.all([
        api.getRuns({ limit: 50 }),
        api.getMetrics().catch(() => null),
        api.getEvidence().catch(() => null),
      ]);
      setRuns(runsData.runs);
      setMetrics(metricsData);
      if (evidenceData?.summary) {
        setEvidenceSummary(evidenceData.summary);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const isCompletelyEmpty = !loading && runs.length === 0 && !error;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Evidence-Gated Agent Execution Overview
          </p>
        </div>
        <button
          onClick={() => setIsNewRunModalOpen(true)}
          className="btn-primary"
        >
          + New Run
        </button>
      </div>

      {/* Error */}
      {error && (
        <ErrorBanner
          message={error}
          onDismiss={() => setError(null)}
          onRetry={fetchData}
        />
      )}

      {/* Completely Empty State */}
      {isCompletelyEmpty && (
        <EmptyState
          icon="🚀"
          title="Welcome to Positron"
          description="Positron is your evidence-gated agent execution platform. Start by creating your first run to see agent activity, test results, and evidence collection in action."
          action={{
            label: 'Create Your First Run',
            onClick: () => setIsNewRunModalOpen(true),
          }}
          secondaryAction={{
            label: 'Add Repository',
            onClick: () => navigate('/repos'),
          }}
        />
      )}

      {!isCompletelyEmpty && (
        <div className="space-y-5">
          {/* Status Cards */}
          <StatusSummary metrics={metrics} isLoading={loading} />

          {/* Demo Blueprint Panel */}
          <BlueprintPanel />

          {/* Evidence + Attention (side by side on larger screens) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <EvidenceSummary
              isLoading={loading}
              testPassed={evidenceSummary?.testEvents ?? 0}
              testFailed={evidenceSummary?.errorEvents ?? 0}
              testSkipped={evidenceSummary?.warningEvents ?? 0}
              artifactCount={evidenceSummary?.totalArtifacts ?? 0}
              screenshotCount={evidenceSummary?.screenshotCount ?? 0}
            />
            <AttentionQueue runs={runs} isLoading={loading} />
          </div>

          {/* Recent Activity */}
          <RecentActivity runs={runs} isLoading={loading} />

          {/* System Health */}
          <SystemHealth />
        </div>
      )}

      {/* New Run Modal */}
      <NewRunModal
        isOpen={isNewRunModalOpen}
        onClose={() => setIsNewRunModalOpen(false)}
      />
    </div>
  );
}
