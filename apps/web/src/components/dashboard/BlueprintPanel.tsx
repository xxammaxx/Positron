import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';

const DEFAULT_BLUEPRINT = `# Mini Blueprint

## Goal
Create a harmless demo change for Positron UI acceptance.

## Task
Append one line to \`.positron-dogfood.md\`:
"UI workflow video proof completed for run <RUN_ID>."

## Constraints
- No merge
- No auto-fix
- No external operator tools
- No Paperclip / OpenClaw / Researcher
- Use demo/supervised mode only`;

export default function BlueprintPanel(): React.ReactElement {
  const navigate = useNavigate();
  const [blueprint, setBlueprint] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);

  const loadBlueprint = () => {
    setBlueprint(DEFAULT_BLUEPRINT);
    setError(null);
  };

  const startDemoRun = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.startDemoRun(blueprint || undefined);
      setRunId(result.run.id);
      // Navigate to run detail after short delay
      setTimeout(() => navigate(`/runs/${result.run.id}`), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start demo run');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card panel-stagger">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-100 font-['Space_Grotesk']">Demo Blueprint</h2>
          <p className="text-sm text-slate-400 mt-1 font-['IBM_Plex_Sans']">
            Start a demo run to see the full 28-phase pipeline
          </p>
        </div>
      </div>

      <textarea
        value={blueprint}
        onChange={(e) => setBlueprint(e.target.value)}
        placeholder="Paste a blueprint or click 'Load Mini Blueprint'..."
        className="input min-h-[160px] resize-y font-['IBM_Plex_Mono'] text-sm leading-relaxed"
        aria-label="Blueprint text"
      />

      {/* Demo Warning */}
      <div className="mt-3 bg-amber-500/10 border border-amber-800 rounded-lg p-3 text-xs text-amber-400 font-['IBM_Plex_Sans']">
        ⚠️ Demo runs do not push, merge, or call external tools unless explicitly enabled.
      </div>

      {error && (
        <div className="mt-3 bg-red-500/10 border border-red-800 rounded-lg p-3 text-xs text-red-400 font-['IBM_Plex_Sans']" role="alert">
          {error}
        </div>
      )}

      {runId && (
        <div className="mt-3 bg-sky-500/10 border border-sky-800 rounded-lg p-3 text-xs text-sky-400 font-['IBM_Plex_Sans']" role="status">
          ✅ Demo run started: <code className="font-['IBM_Plex_Mono']">{runId}</code> — redirecting to run detail...
        </div>
      )}

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={loadBlueprint}
          className="btn-secondary text-sm"
          disabled={isLoading}
        >
          Load Mini Blueprint
        </button>
        <button
          onClick={startDemoRun}
          disabled={isLoading}
          className="btn-primary text-sm"
          aria-label="Start Demo Run"
        >
          {isLoading ? 'Starting...' : 'Start Demo Run'}
        </button>
      </div>
    </div>
  );
}
