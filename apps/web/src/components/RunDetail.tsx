import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useRun } from '../hooks/useRun.js';
import { useSSE } from '../hooks/useSSE.js';
import LogViewer from './LogViewer.js';
import PhaseTimeline from './PhaseTimeline.js';
import GateControls from './GateControls.js';
import ArtifactPanel from './ArtifactPanel.js';
import PhaseBadge from './PhaseBadge.js';
import type { Phase } from '../types.js';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export default function RunDetail(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const { run, isLoading, error: runError } = useRun(id ?? '');
  const { events, isConnected } = useSSE(id ?? null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  if (!id) {
    return (
      <div className="card text-center py-12">
        <p className="text-red-400">Keine Run-ID angegeben</p>
        <Link to="/" className="text-blue-400 hover:underline mt-2 inline-block">
          Zurück zum Dashboard
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card text-center py-12">
        <div className="animate-spin-slow inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        <p className="text-slate-400 mt-3">Lade Run...</p>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="card text-center py-12">
        <p className="text-red-400 text-lg">
          {runError ?? 'Run nicht gefunden'}
        </p>
        <Link to="/" className="text-blue-400 hover:underline mt-2 inline-block">
          Zurück zum Dashboard
        </Link>
      </div>
    );
  }

  const duration =
    run.finishedAt && run.startedAt
      ? new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()
      : 0;

  // Combine existing events + SSE events (deduplicate by id)
  const allEvents = events;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
        <Link to="/" className="hover:text-blue-400 transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-slate-200 font-mono">{run.id.slice(0, 8)}</span>
      </div>

      {/* Error Banner */}
      {(errorBanner || run.lastError) && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm flex items-center justify-between">
          <span>{run.lastError ?? errorBanner}</span>
          <button
            onClick={() => setErrorBanner(null)}
            className="text-red-300 hover:text-red-100 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Run Header */}
      <div className="card mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-bold text-white font-mono">
                Run {run.id.slice(0, 8)}
              </h1>
              <PhaseBadge phase={run.phase} />
            </div>
            <div className="space-y-1 text-sm text-slate-400">
              <p>
                <span className="text-slate-500">Repository:</span>{' '}
                {run.repoId}
                <span className="mx-2">·</span>
                <span className="text-slate-500">Issue:</span>{' '}
                <span className="text-blue-400 font-mono">
                  #{run.issueNumber}
                </span>
              </p>
              {run.branch && (
                <p>
                  <span className="text-slate-500">Branch:</span>{' '}
                  <span className="font-mono text-xs text-slate-300">
                    {run.branch}
                  </span>
                </p>
              )}
              <p>
                <span className="text-slate-500">Gestartet:</span>{' '}
                {new Date(run.startedAt).toLocaleString()}
                {duration > 0 && (
                  <>
                    <span className="mx-2">·</span>
                    <span className="text-slate-500">Dauer:</span>{' '}
                    {formatDuration(duration)}
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 text-xs ${
                isConnected ? 'text-green-400' : 'text-yellow-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
                }`}
              />
              {isConnected ? 'Live' : 'Reconnecting'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content: Two columns */}
      <div className="grid grid-cols-[2fr_1fr] gap-6">
        {/* Left: Log Stream */}
        <div>
          <h2 className="text-sm font-medium text-slate-300 mb-2">
            Ereignis-Log
          </h2>
          <LogViewer events={allEvents} maxHeight="600px" />
        </div>

        {/* Right: Phases + Controls + Artifacts */}
        <div className="space-y-6">
          <PhaseTimeline currentPhase={run.phase} />
          <GateControls runId={run.id} currentPhase={run.phase} />
          <ArtifactPanel runId={run.id} />
        </div>
      </div>
    </div>
  );
}
