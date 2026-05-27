import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardSSE } from '../../hooks/useDashboardSSE.js';
import StatusSummary from './StatusSummary.js';
import EvidenceSummary from './EvidenceSummary.js';
import AttentionQueue from './AttentionQueue.js';
import RecentActivity from './RecentActivity.js';
import SystemHealth from './SystemHealth.js';
import EmptyState from '../shared/EmptyState.js';
import ErrorBanner from '../shared/ErrorBanner.js';
import NewRunModal from './NewRunModal.js';
import BlueprintPanel from './BlueprintPanel.js';

export default function DashboardPage(): React.ReactElement {
  const navigate = useNavigate();
  const { metrics, runs, evidence, isConnected } = useDashboardSSE();
  const [isNewRunModalOpen, setIsNewRunModalOpen] = useState(false);

  const loading = !isConnected && runs.length === 0 && !metrics;
  const isCompletelyEmpty = !loading && runs.length === 0;

  const evidenceSummary = evidence ? {
    totalArtifacts: evidence.totalArtifacts,
    artifactBreakdown: {} as Record<string, number>,
    testEvents: evidence.testEvents,
    errorEvents: evidence.errorEvents,
    warningEvents: evidence.warningEvents,
  } : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Evidence-Gated Agent Execution Overview
            {!isConnected && runs.length > 0 && (
              <span className="ml-2 text-amber-400">(polling fallback)</span>
            )}
          </p>
        </div>
        <button onClick={() => setIsNewRunModalOpen(true)} className="btn-primary">
          + New Run
        </button>
      </div>

      {/* Completely Empty State */}
      {isCompletelyEmpty && (
        <>
          <EmptyState
            icon="🚀"
            title="Welcome to Positron"
            description="Positron is your evidence-gated agent execution platform."
            action={{ label: 'Create Your First Run', onClick: () => setIsNewRunModalOpen(true) }}
            secondaryAction={{ label: 'Add Repository', onClick: () => navigate('/repos') }}
          />
          <div className="mt-5"><BlueprintPanel /></div>
        </>
      )}

      {!isCompletelyEmpty && (
        <div className="space-y-5">
          <StatusSummary metrics={metrics} isLoading={loading} />
          <BlueprintPanel />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <EvidenceSummary
              isLoading={loading}
              testPassed={evidenceSummary?.testEvents ?? 0}
              testFailed={evidenceSummary?.errorEvents ?? 0}
              testSkipped={evidenceSummary?.warningEvents ?? 0}
              artifactCount={evidenceSummary?.totalArtifacts ?? 0}
              screenshotCount={0}
            />
            <AttentionQueue runs={runs} isLoading={loading} />
          </div>
          <RecentActivity runs={runs} isLoading={loading} />
          <SystemHealth />
        </div>
      )}

      <NewRunModal isOpen={isNewRunModalOpen} onClose={() => setIsNewRunModalOpen(false)} />
    </div>
  );
}
