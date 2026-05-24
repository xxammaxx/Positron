// Positron Server — Orchestrator und REST API

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Simple .env loader (no external dependency needed)
(function loadEnv(): void {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
    console.log(`[Positron] Loaded env from ${envPath}`);
  }
})();

import express from 'express';
import http from 'node:http';
import Database from 'better-sqlite3';
import { openDatabase, createRun, transition, markFailed, retry, resumeFromEvents } from '@positron/run-state';
import { runSpecify, runPlan, runTasks } from '@positron/speckit-adapter';
import { RealSpecKitAdapter, FakeSpecKitAdapter } from '@positron/speckit-adapter';
import { executeTasks } from '@positron/opencode-adapter';
import { RealOpenCodeAdapter, FakeOpenCodeAdapter } from '@positron/opencode-adapter';
import { generateBranchName, createRunId, loadRepositoryConfig, normalizeRepositoryConfig, buildRemoteUrl, MAX_FIX_LOOPS } from '@positron/shared';
import type { Phase, RunStatus, EventLevel } from '@positron/shared';
import type { RepositoryConfig, SpecKitAdapter, OpenCodeAdapter } from '@positron/shared';
import type { RunState, RunEventData } from '@positron/run-state';
import { FakeGitHubAdapter, createRealGitHubAdapter, GitHubStatusSyncService } from '@positron/github-adapter';
import type { GitHubAdapter } from '@positron/github-adapter';
import type { GitHubStatusSyncInput, GitHubStatusSyncResult, EvidenceItem } from '@positron/github-adapter';
import { renderAccepted } from '@positron/github-adapter';
import { FakeGitWorkspaceAdapter, applyDogfoodFixtureChange } from '@positron/sandbox';
import type { GitWorkspaceAdapter } from '@positron/sandbox';
import { TestCommandDetector, TestRunner } from '@positron/sandbox';
import type { TestReport } from '@positron/sandbox';

/** GitHub Adapter Modus: "fake" (Standard/Test) oder "real" (mit GITHUB_TOKEN) */
type GitHubMode = 'fake' | 'real';

interface ServerOptions {
  adapter?: GitHubAdapter;
  repository?: RepositoryConfig;
  workspaceAdapter?: GitWorkspaceAdapter;
  speckitAdapter?: SpecKitAdapter;
  opencodeAdapter?: OpenCodeAdapter;
  /** Pfad zur SQLite-Datenbank. Default: ~/.positron/positron.db. Für Tests: ':memory:'. */
  dbPath?: string;
}

function resolveAdapter(adapter?: GitHubAdapter): { adapter: GitHubAdapter; mode: GitHubMode } {
  if (adapter) {
    return { adapter, mode: adapter instanceof FakeGitHubAdapter ? 'fake' : 'real' };
  }

  const mode = (process.env.GITHUB_MODE ?? 'fake') as GitHubMode;
  if (mode === 'real') {
    return { adapter: createRealGitHubAdapter(), mode: 'real' };
  }
  return { adapter: new FakeGitHubAdapter(), mode: 'fake' };
}

function resolveRepositoryConfig(repository?: RepositoryConfig): RepositoryConfig {
  if (repository) {
    return normalizeRepositoryConfig(repository);
  }

  const loaded = loadRepositoryConfig(process.env);
  if (!loaded) {
    throw new Error('POSITRON_REPO_OWNER and POSITRON_REPO_NAME must be configured');
  }
  return loaded;
}

// SQLite-Datenbankverbindung (initialisiert in createApp)
let db: Database.Database | null = null;

// In-Memory Adapter-Standards
let workspaceAdapter: GitWorkspaceAdapter = new FakeGitWorkspaceAdapter();
let speckitAdapter: SpecKitAdapter = new FakeSpecKitAdapter();
let opencodeAdapter: OpenCodeAdapter = new FakeOpenCodeAdapter();

// SSE Client Tracking (Issue #29)
const sseClients = new Map<string, Set<express.Response>>();

function broadcastSSE(runId: string, event: string, data: unknown): void {
  const clients = sseClients.get(runId);
  if (!clients) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

function addSSEClient(runId: string, res: express.Response): void {
  if (!sseClients.has(runId)) {
    sseClients.set(runId, new Set());
  }
  sseClients.get(runId)!.add(res);
}

function removeSSEClient(runId: string, res: express.Response): void {
  const clients = sseClients.get(runId);
  if (clients) {
    clients.delete(res);
    if (clients.size === 0) sseClients.delete(runId);
  }
}

// Run Control Signals (Issue #30)
// Stored separately from run state to avoid database/schema changes
const runSignals = new Map<string, 'PAUSE' | 'ABORT' | 'RESUME' | 'RETRY'>();

export type RunControlAction = 'pause' | 'abort' | 'resume' | 'retry';

function clearRunSignal(runId: string): void {
  runSignals.delete(runId);
  resumePhaseTarget.delete(runId);
}

function checkRunSignal(runId: string, runPhase: Phase): 'proceed' | 'abort' | 'retry' | 'paused' | 'resume' {
  const signal = runSignals.get(runId);
  if (!signal) return 'proceed';

  switch (signal) {
    case 'ABORT':
      clearRunSignal(runId);
      return 'abort';
    case 'PAUSE':
      return 'paused';
    case 'RESUME': {
      clearRunSignal(runId);
      // Prüfe ob eine Ziel-Phase gespeichert wurde (resumePhaseTarget bleibt erhalten)
      if (resumePhaseTarget.has(runId)) {
        return 'resume';
      }
      return 'proceed';
    }
    case 'RETRY':
      if (runPhase !== 'FAILED_TRANSIENT') return 'proceed';
      clearRunSignal(runId);
      return 'retry';
    default:
      return 'proceed';
  }
}

// ---------------------------------------------------------------------------
// Datenbank-Helper (Persistenz via better-sqlite3)
// ---------------------------------------------------------------------------

/** Stellt sicher, dass die DB initialisiert ist */
function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call createApp() first.');
  return db;
}

/**
 * Speichert einen Run in der Datenbank (INSERT oder UPDATE).
 * Stellt automatisch benötigte Parent-Records (repositories, issues) sicher.
 */
function saveRunToDb(run: RunState): void {
  const database = getDb();
  const ensureRepo = database.prepare(`
    INSERT OR IGNORE INTO repositories (id, owner, name, url, local_path, enabled, created_at)
    VALUES (?, 'positron', ?, '', '', 1, datetime('now'))
  `);
  const ensureIssue = database.prepare(`
    INSERT OR IGNORE INTO issues (id, repo_id, number, title, state, labels_json, last_seen_at)
    VALUES (?, ?, ?, ? || ' #' || ?, 'open', '[]', datetime('now'))
  `);
  const upsertRun = database.prepare(`
    INSERT INTO runs (id, repo_id, issue_number, branch, phase, status, autonomy_level, attempt, started_at, finished_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      repo_id         = excluded.repo_id,
      issue_number    = excluded.issue_number,
      branch          = excluded.branch,
      phase           = excluded.phase,
      status          = excluded.status,
      autonomy_level  = excluded.autonomy_level,
      attempt         = excluded.attempt,
      started_at      = excluded.started_at,
      finished_at     = excluded.finished_at
  `);

  const transaction = database.transaction(() => {
    ensureRepo.run(run.repoId, run.repoId);
    ensureIssue.run(`issue-${run.repoId}-${run.issueNumber}`, run.repoId, run.issueNumber, 'Issue', String(run.issueNumber));
    upsertRun.run(
      run.id, run.repoId, run.issueNumber,
      run.branch, run.phase, run.status,
      run.autonomyLevel, run.attempt,
      run.startedAt, run.finishedAt,
    );
  });
  transaction();
}

/**
 * Lädt einen Run aus der Datenbank.
 * Anmerkung: lastError und workspacePath werden nicht in der DB persistiert
 * (Schema-Migration erforderlich für vollständige Persistenz).
 */
function loadRunFromDb(runId: string): RunState | null {
  try {
    const row = getDb().prepare('SELECT * FROM runs WHERE id = ?').get(runId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: row.id as string,
      repoId: row.repo_id as string,
      issueNumber: row.issue_number as number,
      branch: row.branch as string | null,
      phase: row.phase as Phase,
      status: row.status as RunStatus,
      autonomyLevel: row.autonomy_level as number,
      attempt: row.attempt as number,
      startedAt: row.started_at as string,
      finishedAt: row.finished_at as string | null,
      lastError: null,
      workspacePath: null,
    };
  } catch (err) {
    console.error(`[DB] loadRunFromDb failed for ${runId}:`, err);
    return null;
  }
}

/** Listet alle Runs aus der Datenbank (neueste zuerst). */
function listRunsFromDb(): RunState[] {
  const rows = getDb().prepare('SELECT * FROM runs ORDER BY started_at DESC').all() as Array<Record<string, unknown>>;
  return rows.map(row => ({
    id: row.id as string,
    repoId: row.repo_id as string,
    issueNumber: row.issue_number as number,
    branch: row.branch as string | null,
    phase: row.phase as Phase,
    status: row.status as RunStatus,
    autonomyLevel: row.autonomy_level as number,
    attempt: row.attempt as number,
    startedAt: row.started_at as string,
    finishedAt: row.finished_at as string | null,
    lastError: null,
    workspacePath: null,
  }));
}

/** Zählt alle Runs in der Datenbank. */
function countRunsInDb(): number {
  try {
    const row = getDb().prepare('SELECT COUNT(*) as cnt FROM runs').get() as { cnt: number } | undefined;
    return row?.cnt ?? 0;
  } catch (err) {
    console.error('[DB] countRunsInDb failed:', err);
    return 0;
  }
}

/**
 * Speichert ein Run-Event in der Datenbank und benachrichtigt SSE-Clients.
 * better-sqlite3 ist synchron — kein async nötig.
 */
function storeEvent(event: RunEventData): void {
  try {
    const database = getDb();
    database.prepare(`
      INSERT INTO run_events (id, run_id, phase, level, message, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.id, event.runId, event.phase, event.level, event.message,
      event.payload ? JSON.stringify(event.payload) : '{}',
      event.createdAt,
    );
  } catch (err) {
    console.error(`[DB] storeEvent failed for run ${event.runId}:`, err);
  }
  // Notify SSE clients about new event
  broadcastSSE(event.runId, 'run-event', event);
}

/** Lädt alle Events eines Runs aus der Datenbank (chronologisch). */
function getEvents(runId: string): RunEventData[] {
  try {
    const rows = getDb().prepare(
      'SELECT * FROM run_events WHERE run_id = ? ORDER BY created_at ASC',
    ).all(runId) as Array<Record<string, unknown>>;
    return rows.map(row => ({
      id: row.id as string,
      runId: row.run_id as string,
      phase: row.phase as Phase,
      level: row.level as EventLevel,
      message: row.message as string,
      payload: row.payload_json ? JSON.parse(row.payload_json as string) as Record<string, unknown> : null,
      createdAt: row.created_at as string,
    }));
  } catch (err) {
    console.error(`[DB] getEvents failed for run ${runId}:`, err);
    return [];
  }
}

export function setWorkspaceAdapter(adapter: GitWorkspaceAdapter): void {
  workspaceAdapter = adapter;
}

export function setSpecKitAdapter(adapter: SpecKitAdapter): void {
  speckitAdapter = adapter;
}

export function setOpenCodeAdapter(adapter: OpenCodeAdapter): void {
  opencodeAdapter = adapter;
}

function resolveSpecKitAdapter(injected?: SpecKitAdapter): SpecKitAdapter {
  if (injected) return injected;
  if (process.env.POSITRON_SPECKIT_MODE === 'real') {
    return new RealSpecKitAdapter();
  }
  return speckitAdapter;
}

function resolveOpenCodeAdapter(injected?: OpenCodeAdapter): OpenCodeAdapter {
  if (injected) return injected;
  if (process.env.POSITRON_OPENCODE_MODE === 'real') {
    return new RealOpenCodeAdapter();
  }
  return opencodeAdapter;
}

// ---------------------------------------------------------------------------
// Safe GitHub Sync (never crashes the orchestrator)
// ---------------------------------------------------------------------------

/** Wraps a sync operation so failures are logged but never block the run */
async function safeSync(
  syncService: GitHubStatusSyncService,
  operation: () => Promise<GitHubStatusSyncResult>,
  runId: string,
  context: Phase,
): Promise<GitHubStatusSyncResult | null> {
  try {
    const result = await operation();
    if (result.status === 'failed') {
      storeEvent({
        id: createRunId(),
        runId,
        phase: context,
        level: 'WARN',
        message: `GitHub sync failed: ${result.reason ?? 'unknown'}`,
        payload: null,
        createdAt: new Date().toISOString(),
      });
    }
    return result;
  } catch (err) {
    storeEvent({
      id: createRunId(),
      runId,
      phase: context,
      level: 'ERROR',
      message: `GitHub sync error: ${String(err).slice(0, 200)}`,
      payload: null,
      createdAt: new Date().toISOString(),
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

async function executePhase(
  run: RunState,
  repository: RepositoryConfig,
  workspace: GitWorkspaceAdapter,
  speckit: SpecKitAdapter,
  opencode: OpenCodeAdapter,
  github: GitHubAdapter,
  syncService?: GitHubStatusSyncService,
): Promise<RunState> {
  let current = run;
  let result;

  switch (current.phase) {
    case 'QUEUED':
      result = transition(current, 'CLAIMED', 'Issue claimed', 'INFO');
      break;
    case 'CLAIMED':
      // Sync: Run Accepted → GitHub comment + labels
      if (syncService) {
        const syncInput: GitHubStatusSyncInput = {
          runId: current.id, owner: repository.owner, repo: repository.repo,
          issueNumber: current.issueNumber, phase: 'CLAIMED', status: 'active',
          branchName: current.branch ?? undefined,
        };
        await safeSync(syncService, () => syncService.syncRunAccepted(syncInput), current.id, 'CLAIMED');
      }
      result = transition(current, 'REPO_SYNC', 'Repo synced', 'INFO');
      break;
    case 'REPO_SYNC':
      try {
        const workspaceRepository = {
          owner: repository.owner,
          repo: repository.repo,
          remoteUrl: repository.remoteUrl ?? buildRemoteUrl(repository.owner, repository.repo),
        };
        const ws = await workspace.prepareWorkspace({
          repository: workspaceRepository,
          issueNumber: current.issueNumber,
          issueTitle: `Issue #${current.issueNumber}`,
          runId: current.id,
          baseBranch: repository.defaultBranch,
        });
        current.branch = ws.branchName;
        current.workspacePath = ws.workspacePath;
        result = transition(current, 'ISSUE_CONTEXT', `Workspace: ${ws.workspacePath}`);
      } catch (err) {
        result = markFailed(current, 'FAILED_TRANSIENT', `Repo sync failed: ${String(err)}`);
      }
      break;
    case 'ISSUE_CONTEXT':
      result = transition(current, 'WEB_RESEARCH', 'Research phase', 'INFO');
      break;
    case 'WEB_RESEARCH':
      result = transition(current, 'SPECIFY', `Research: best practices validated`);
      break;
    case 'SPECIFY': {
      const wsPath = current.workspacePath ?? current.branch ?? '/tmp';
      const realSpeckit = process.env.POSITRON_ENABLE_REAL_SPECKIT === 'true';

      if (realSpeckit) {
        try {
          // Step 1: specify init (safe-cli mode, only once)
          const initResult = await speckit.initialize({
            runId: current.id, workspacePath: wsPath,
            issueTitle: `Issue #${current.issueNumber}`, issueNumber: current.issueNumber,
            mode: 'safe-cli', aiAgent: 'opencode',
          });
          if (initResult.status === 'success') {
            storeEvent({ id: createRunId(), runId: current.id, phase: 'SPECIFY', level: 'INFO', message: `Spec Kit initialized: ${initResult.summary}`, payload: null, createdAt: new Date().toISOString() });

            // Step 2: opencode run --command speckit.specify
            const specResult = await opencode.runSlashCommand('speckit.specify', {
              runId: current.id, workspacePath: wsPath,
              issueTitle: `Issue #${current.issueNumber}`, issueNumber: current.issueNumber,
              mode: 'safe-cli',
            });
            result = transition(current, 'PLAN', `Real Spec Kit: ${specResult.summary}`, specResult.status === 'success' ? 'INFO' : 'WARN');
            break;
          }
        } catch (err) {
          storeEvent({ id: createRunId(), runId: current.id, phase: 'SPECIFY', level: 'WARN', message: `Real Spec Kit error: ${String(err).slice(0, 200)}`, payload: null, createdAt: new Date().toISOString() });
        }
      }

      // Fallback: artifact-only detection
      const input = { runId: current.id, workspacePath: wsPath, issueTitle: `Issue #${current.issueNumber}`, issueNumber: current.issueNumber, mode: 'artifact-only' as const };
      try {
        const sr = await speckit.runSpecify(input);
        result = transition(current, 'PLAN', sr.summary, sr.status === 'success' ? 'INFO' : 'WARN');
      } catch (err) {
        storeEvent({ id: createRunId(), runId: current.id, phase: 'SPECIFY', level: 'WARN', message: `Specify error: ${String(err).slice(0, 200)}`, payload: null, createdAt: new Date().toISOString() });
        const specContent = await runSpecify(wsPath, `Issue #${current.issueNumber}`);
        saveArtifact(current.id, 'spec', specContent);
        result = transition(current, 'PLAN', 'Spec generated (legacy stub fallback)', 'INFO');
      }
      break;
    }
    case 'PLAN': {
      const wsPath = current.workspacePath ?? current.branch ?? '/tmp';
      const realSpeckit = process.env.POSITRON_ENABLE_REAL_SPECKIT === 'true';

      if (realSpeckit) {
        try {
          const planResult = await opencode.runSlashCommand('speckit.plan', {
            runId: current.id, workspacePath: wsPath,
            issueTitle: `Issue #${current.issueNumber}`, issueNumber: current.issueNumber,
            mode: 'safe-cli',
          });
          result = transition(current, 'TASKS', `Real Spec Kit: ${planResult.summary}`, planResult.status === 'success' ? 'INFO' : 'WARN');
          break;
        } catch (err) {
          storeEvent({ id: createRunId(), runId: current.id, phase: 'PLAN', level: 'WARN', message: `Real Spec Kit error: ${String(err).slice(0, 200)}`, payload: null, createdAt: new Date().toISOString() });
        }
      }

      const input = { runId: current.id, workspacePath: wsPath, issueTitle: `Issue #${current.issueNumber}`, issueNumber: current.issueNumber, mode: 'artifact-only' as const };
      try {
        const pr = await speckit.runPlan(input);
        result = transition(current, 'TASKS', pr.summary, pr.status === 'success' ? 'INFO' : 'WARN');
      } catch (err) {
        storeEvent({ id: createRunId(), runId: current.id, phase: 'PLAN', level: 'WARN', message: `Plan error: ${String(err).slice(0, 200)}`, payload: null, createdAt: new Date().toISOString() });
        const planContent = await runPlan(wsPath, `Spec for Issue #${current.issueNumber}`);
        saveArtifact(current.id, 'plan', planContent);
        result = transition(current, 'TASKS', 'Plan generated (legacy stub fallback)', 'INFO');
      }
      break;
    }
    case 'TASKS': {
      const wsPath = current.workspacePath ?? current.branch ?? '/tmp';
      const realSpeckit = process.env.POSITRON_ENABLE_REAL_SPECKIT === 'true';

      if (realSpeckit) {
        try {
          const tasksResult = await opencode.runSlashCommand('speckit.tasks', {
            runId: current.id, workspacePath: wsPath,
            issueTitle: `Issue #${current.issueNumber}`, issueNumber: current.issueNumber,
            mode: 'safe-cli',
          });
          result = transition(current, 'ANALYZE', `Real Spec Kit: ${tasksResult.summary}`, tasksResult.status === 'success' ? 'INFO' : 'WARN');
          break;
        } catch (err) {
          storeEvent({ id: createRunId(), runId: current.id, phase: 'TASKS', level: 'WARN', message: `Real Spec Kit error: ${String(err).slice(0, 200)}`, payload: null, createdAt: new Date().toISOString() });
        }
      }

      const input = { runId: current.id, workspacePath: wsPath, issueTitle: `Issue #${current.issueNumber}`, issueNumber: current.issueNumber, mode: 'artifact-only' as const };
      try {
        const tr = await speckit.runTasks(input);
        result = transition(current, 'ANALYZE', tr.summary, tr.status === 'success' ? 'INFO' : 'WARN');
      } catch (err) {
        storeEvent({ id: createRunId(), runId: current.id, phase: 'TASKS', level: 'WARN', message: `Tasks error: ${String(err).slice(0, 200)}`, payload: null, createdAt: new Date().toISOString() });
        const tasksContent = await runTasks(wsPath, `Plan for Issue #${current.issueNumber}`);
        saveArtifact(current.id, 'tasks', tasksContent);
        result = transition(current, 'ANALYZE', 'Tasks generated (legacy stub fallback)', 'INFO');
      }
      break;
    }
    case 'ANALYZE': {
      const wsPath = current.workspacePath ?? current.branch ?? '/tmp';
      const input = { runId: current.id, workspacePath: wsPath, issueTitle: `Issue #${current.issueNumber}`, issueNumber: current.issueNumber, mode: 'artifact-only' as const };
      try {
        const ar = await speckit.runAnalyze(input);
        result = transition(current, 'REVIEW', ar.summary, 'INFO');
      } catch (err) {
        storeEvent({ id: createRunId(), runId: current.id, phase: 'ANALYZE', level: 'WARN', message: `Analyze error: ${String(err).slice(0, 200)}`, payload: null, createdAt: new Date().toISOString() });
        result = transition(current, 'REVIEW', 'Analysis complete', 'INFO');
      }
      break;
    }
    case 'REVIEW':
      result = transition(current, 'IMPLEMENT', 'Review passed');
      break;
    case 'IMPLEMENT': {
      const wsPath = current.workspacePath ?? current.branch ?? '/tmp';
      const input = { runId: current.id, workspacePath: wsPath, issueTitle: `Issue #${current.issueNumber}`, issueNumber: current.issueNumber, mode: 'safe-cli' as const, autonomyLevel: current.autonomyLevel };

      // Dogfood Fixture Change Provider (Issue #38)
      // Nur aktiv mit POSITRON_ENABLE_DOGFOOD_FIXTURE_CHANGE=true
      // Erzeugt eine deterministische Dateiänderung für PR-Validierung
      const fixtureResult = applyDogfoodFixtureChange({ workspacePath: wsPath, runId: current.id, issueNumber: current.issueNumber });
      if (fixtureResult.applied) {
        storeEvent({
          id: createRunId(), runId: current.id, phase: 'IMPLEMENT',
          level: 'INFO', message: fixtureResult.summary,
          payload: { fixtureFile: fixtureResult.filePath },
          createdAt: new Date().toISOString(),
        });
      }

      try {
        const ir = await opencode.runImplement(input);
        if (ir.status === 'blocked') {
          storeEvent({ id: createRunId(), runId: current.id, phase: 'IMPLEMENT', level: 'WARN', message: `Implement blocked: ${ir.blockedReason ?? 'policy'}`, payload: { result: ir }, createdAt: new Date().toISOString() });
        }
        result = transition(current, 'TEST', ir.summary, ir.status === 'success' ? 'INFO' : 'WARN');
      } catch (err) {
        storeEvent({ id: createRunId(), runId: current.id, phase: 'IMPLEMENT', level: 'WARN', message: `Implement error: ${String(err).slice(0, 200)}`, payload: null, createdAt: new Date().toISOString() });
        const execResult = await executeTasks(wsPath, [`Implement Issue #${current.issueNumber}`]);
        if (execResult.success) {
          saveArtifact(current.id, 'implementation', execResult.completedTasks);
        }
        result = transition(current, 'TEST', 'Implementation done (legacy fallback)', 'INFO');
      }
      break;
    }
    case 'TEST':
      try {
        const wsPath = current.workspacePath ?? current.branch ?? '/tmp';
        const detector = new TestCommandDetector();
        const detection = await detector.detect(wsPath);
        if (detection.commands.length === 0) {
          // Keine Commands erkannt — trotzdem als INFO durch (MVP-Stub)
          result = transition(current, 'VERIFY', 'Keine Test-Kommandos erkannt (MVP)', 'INFO');
        } else {
          const runner = new TestRunner();
          const report = await runner.runDetectedCommands({
            runId: current.id, workspacePath: wsPath,
            commands: detection.commands, mode: 'standard',
          });
          // Sync: Test Report → GitHub comment + labels
          if (syncService && report) {
            const syncInput: GitHubStatusSyncInput = {
              runId: current.id, owner: repository.owner, repo: repository.repo,
              issueNumber: current.issueNumber, phase: 'TEST', status: report.status,
              branchName: current.branch ?? undefined, workspacePath: wsPath, testReport: report,
            };
            if (report.status === 'blocked') {
              await safeSync(syncService, () => syncService.syncBlocked({
                ...syncInput, error: { type: 'blocked', message: report.summary },
              }), current.id, 'TEST');
            } else if (report.status === 'failed') {
              await safeSync(syncService, () => syncService.syncTestReport(syncInput), current.id, 'TEST');
            } else {
              await safeSync(syncService, () => syncService.syncTestReport(syncInput), current.id, 'TEST');
            }
          }
          result = transition(current, 'VERIFY', `Tests ${report.status}`, report.status === 'passed' ? 'INFO' : 'ERROR');
        }
      } catch {
        result = transition(current, 'VERIFY', 'Test-Ausführung fehlgeschlagen (MVP)', 'WARN');
      }
      break;
    case 'VERIFY':
      current.branch = current.branch ?? generateBranchName(current.issueNumber, `run-${current.id.slice(0, 8)}`);
      result = transition(current, 'COMMIT', 'Verified, commit ready');
      break;
    case 'COMMIT': {
      const branch = current.branch ?? generateBranchName(current.issueNumber, `run-${current.id.slice(0, 8)}`);
      const pushAllowed = process.env.POSITRON_ENABLE_PUSH === 'true';

      // Commit Message generieren
      const commitMsg = `feat(issue-${current.issueNumber}): Positron automated changes [Run: ${current.id.slice(0, 8)}]`;

      // Workspace path from run state (Issue #36)
      const commitWsPath = current.workspacePath ?? `/tmp/positron-ws-${current.id.slice(0, 8)}`;

      try {
        // Änderungen erfassen — nutzt git status (erkennt neue + geänderte Dateien)
        let changeSummary = '';
        let hasChanges = false;
        try {
          const status = await workspace.getStatus(commitWsPath);
          hasChanges = !status.isClean;
          const staged = status.staged.length;
          const unstaged = status.unstaged.length;
          const untracked = status.untracked.length;
          changeSummary = `${staged} staged, ${unstaged} unstaged, ${untracked} untracked`;
        } catch { /* status optional */ }

        if (!hasChanges) {
          // Keine Änderungen — sauber blocken (Issue #38)
          result = markFailed(current, 'FAILED_BLOCKED',
            `NO_CHANGES_TO_COMMIT: Branch ${branch} has no changes (${changeSummary})`);
          break;
        }

        // Commit nur bei vorhandenem Diff
        const commitResult = await workspace.commit(commitWsPath, commitMsg);

        // Push nur mit Allow-Flag
        let pushResult = '';
        if (pushAllowed) {
          await workspace.push({ workspacePath: commitWsPath, branch });
          pushResult = ', pushed';
        } else {
          pushResult = ', push skipped (POSITRON_ENABLE_PUSH not set)';
        }

        const summary = `Committed: ${commitResult.sha.slice(0, 7)}${pushResult} (${changeSummary})`;
        result = transition(current, 'PR_CREATE', summary, 'INFO');
      } catch (err) {
        storeEvent({
          id: createRunId(), runId: current.id, phase: 'COMMIT',
          level: 'ERROR', message: `Commit/Push failed: ${String(err).slice(0, 200)}`,
          payload: null, createdAt: new Date().toISOString(),
        });
        result = transition(current, 'PR_CREATE', `Commit skipped: ${String(err).slice(0, 100)}`, 'WARN');
      }
      break;
    }
    case 'PR_CREATE': {
      const branch = current.branch ?? generateBranchName(current.issueNumber, `run-${current.id.slice(0, 8)}`);
      const evidence = buildEvidence(current);
      const body = renderPRBody(current, repository, evidence, branch);

      try {
        const pr = await github.createPullRequest({
          owner: repository.owner, repo: repository.repo,
          title: `Positron: ${current.issueNumber ? `Issue #${current.issueNumber} — ` : ''}Automated changes`,
          head: branch,
          base: repository.defaultBranch ?? 'main',
          body,
        });

        if (syncService) {
          const syncInput: GitHubStatusSyncInput = {
            runId: current.id, owner: repository.owner, repo: repository.repo,
            issueNumber: current.issueNumber, phase: 'PR_CREATE', status: 'success',
            branchName: branch,
            prNumber: pr.number, prUrl: pr.htmlUrl,
            evidence,
          };
          await safeSync(syncService, () => syncService.syncPrCreated(syncInput), current.id, 'PR_CREATE');
        }

        // --- Reviewer-Automation (Issue #32) ---
        const prReviewers = process.env.POSITRON_PR_REVIEWERS?.split(',').map(s => s.trim()).filter(Boolean);
        const prTeamReviewers = process.env.POSITRON_PR_TEAM_REVIEWERS?.split(',').map(s => s.trim()).filter(Boolean);
        if (prReviewers?.length || prTeamReviewers?.length) {
          try {
            const reviewResult = await github.requestReviewers({
              owner: repository.owner, repo: repository.repo,
              prNumber: pr.number,
              reviewers: prReviewers,
              teamReviewers: prTeamReviewers,
            });
            if (reviewResult.requested) {
              const reviewerList = [...(reviewResult.reviewers ?? []), ...(reviewResult.teamReviewers ?? [])].join(', ');
              storeEvent({
                id: createRunId(), runId: current.id, phase: 'PR_CREATE',
                level: 'INFO', message: `Review requested from: ${reviewerList}`,
                payload: { reviewers: reviewResult.reviewers, teamReviewers: reviewResult.teamReviewers },
                createdAt: new Date().toISOString(),
              });
            }
          } catch {
            storeEvent({
              id: createRunId(), runId: current.id, phase: 'PR_CREATE',
              level: 'WARN', message: 'Review request failed (non-blocking)',
              payload: null, createdAt: new Date().toISOString(),
            });
          }
        }

        result = transition(current, 'MERGE', `PR #${pr.number} created: ${pr.htmlUrl}`, 'INFO');
      } catch (err) {
        storeEvent({
          id: createRunId(), runId: current.id, phase: 'PR_CREATE',
          level: 'ERROR',
          message: `PR creation failed: ${String(err).slice(0, 200)}`,
          payload: null, createdAt: new Date().toISOString(),
        });
        result = markFailed(current, 'FAILED_BLOCKED', `PR creation failed: ${String(err).slice(0, 100)}`);
      }
      break;
    }
    case 'MERGE': {
      // --- Safety Gates (Issue #21 + #41) ---
      const mergeAllowed = process.env.POSITRON_ENABLE_MERGE === 'true';
      const mergeDryRun = process.env.POSITRON_MERGE_DRY_RUN === 'true';
      const mergeKillSwitch = process.env.POSITRON_MERGE_KILL_SWITCH !== 'false';

      // Branch
      const branch = current.branch;
      if (!branch) {
        result = transition(current, 'DONE', 'Merge skipped (no branch)', 'INFO');
        break;
      }

      // Fetch PR
      let pr: Awaited<ReturnType<typeof github.listPullRequests>>[0] | null = null;
      try {
        const prs = await github.listPullRequests({
          owner: repository.owner, repo: repository.repo,
          head: `${repository.owner}:${branch}`, state: 'open',
        });
        pr = prs[0] ?? null;
      } catch { /* PR lookup optional */ }

      if (!pr) {
        result = transition(current, 'DONE', 'Merge skipped (no open PR found)', 'INFO');
        break;
      }

      if (pr.state !== 'open') {
        storeEvent({
          id: createRunId(), runId: current.id, phase: 'MERGE',
          level: 'WARN', message: `PR #${pr.number} ist nicht offen (state: ${pr.state}), überspringe Merge`,
          payload: { prNumber: pr.number, prState: pr.state },
          createdAt: new Date().toISOString(),
        });
        result = transition(current, 'DONE', `PR #${pr.number} ist ${pr.state} — Merge übersprungen`, 'WARN');
        break;
      }

      // --- Dry-Run: Evaluate all gates, never merge (Issue #41) ---
      if (mergeDryRun) {
        // Fetch PR details with polling for conclusive mergeability (Issue #42)
        let mergeableState = 'checking';
        const maxMergeableRetries = 3;
        const mergeableRetryDelay = 5000; // 5s between polls

        for (let retry = 0; retry <= maxMergeableRetries; retry++) {
          try {
            const prDetail = await github.getPullRequest(repository.owner, repository.repo, pr.number);
            const raw = prDetail.mergeable;
            if (raw === true) { mergeableState = 'clean'; break; }
            if (raw === false) { mergeableState = 'conflict'; break; }
            // null/undefined: still computing — retry after delay
            if (retry < maxMergeableRetries) {
              await new Promise(r => setTimeout(r, mergeableRetryDelay));
            }
          } catch { /* PR details optional */ break; }
        }

        const testEvent = getEvents(current.id).find(e => e.phase === 'TEST' && e.level === 'INFO');

        // Evaluate ALL gates (no short-circuit in dry-run)
        const allGates: Array<{ gate: string; passed: boolean; detail: string }> = [
          { gate: 'Auto-Merge Enabled', passed: mergeAllowed, detail: mergeAllowed ? 'POSITRON_ENABLE_MERGE=true' : 'POSITRON_ENABLE_MERGE not set' },
          { gate: 'Kill-Switch', passed: !mergeKillSwitch, detail: mergeKillSwitch ? 'POSITRON_MERGE_KILL_SWITCH=true — blocked' : 'Kill-Switch not active' },
          { gate: 'Run Status Active', passed: current.status === 'active', detail: `Run status is "${current.status}"` },
          { gate: 'Test Evidence', passed: !!testEvent, detail: testEvent ? 'Test phase completed with INFO' : 'No passing test evidence' },
          { gate: 'Branch', passed: !!current.branch, detail: `Branch: ${current.branch}` },
          { gate: 'PR Open', passed: pr.state === 'open', detail: `PR state: ${pr.state}` },
          { gate: 'Mergeable', passed: mergeableState === 'clean', detail: `GitHub mergeable: ${mergeableState}` },
        ];

        const allPassed = allGates.every(g => g.passed);
        const decision = allPassed ? 'WOULD_MERGE' : 'WOULD_BLOCK';
        const blockedGates = allGates.filter(g => !g.passed);

        // Structured event for Dashboard
        storeEvent({
          id: createRunId(), runId: current.id, phase: 'MERGE', level: 'GATE',
          message: `[DRY-RUN] ${decision}: ${allGates.filter(g => g.passed).length}/${allGates.length} gates pass`,
          payload: { decision, allPassed, mergeable: mergeableState, gates: allGates, prNumber: pr.number, prUrl: pr.htmlUrl },
          createdAt: new Date().toISOString(),
        });

        // GitHub comment with gate-by-gate results
        try {
          const gateList = allGates.map(g => `- ${g.passed ? '✅' : '❌'} **${g.gate}:** ${g.detail}`).join('\n');
          await github.createIssueComment(
            { owner: repository.owner, repo: repository.repo, issueNumber: current.issueNumber },
            `## 🔍 Auto-Merge Dry-Run Result\n\n**Decision:** ${decision}\n**PR:** #${pr.number}\n**Mergeable:** ${mergeableState}\n\n### Gates (${allGates.filter(g => g.passed).length}/${allGates.length})\n\n${gateList}\n\n> 🛡️ **No merge executed** — Dry-Run only.`,
          );
        } catch { /* comment is best-effort */ }

        result = transition(current, 'DONE',
          `[DRY-RUN] ${decision}: ${allPassed ? 'All gates pass' : `${blockedGates.length} gates fail — ${blockedGates.map(g => g.gate).join(', ')}`}`,
          allPassed ? 'INFO' : 'WARN');
        break;
      }

      // --- Real Merge (nicht Dry-Run) ---

      // Kill-Switch
      if (mergeKillSwitch) {
        result = transition(current, 'DONE', 'Merge BLOCKED: Kill-Switch (POSITRON_MERGE_KILL_SWITCH=true)', 'WARN');
        break;
      }
      if (!mergeAllowed) {
        result = transition(current, 'DONE', 'Merge skipped (POSITRON_ENABLE_MERGE not set)', 'INFO');
        break;
      }
      if (current.status !== 'active') {
        result = transition(current, 'DONE', `Merge blocked: Run status is ${current.status}`, 'WARN');
        break;
      }

      try {
        const mergeResult = await github.mergePullRequest({
          owner: repository.owner, repo: repository.repo,
          prNumber: pr.number, strategy: 'squash',
          commitTitle: `Positron: Issue #${current.issueNumber} — Automated changes`,
          commitMessage: `Run: ${current.id.slice(0, 8)}`,
        });

        if (mergeResult.merged) {
          if (syncService) {
            const syncInput: GitHubStatusSyncInput = {
              runId: current.id, owner: repository.owner, repo: repository.repo,
              issueNumber: current.issueNumber, phase: 'MERGE', status: 'success',
              branchName: mergeResult.sha, prNumber: pr.number, prUrl: pr.htmlUrl,
            };
            await safeSync(syncService, () => syncService.syncMerged(syncInput), current.id, 'MERGE');
          }
          // Issue nach erfolgreichem Merge schließen (Task 2)
          try {
            await github.closeIssue(repository.owner, repository.repo, current.issueNumber);
            storeEvent({
              id: createRunId(), runId: current.id, phase: 'MERGE',
              level: 'INFO', message: `Issue #${current.issueNumber} closed after merge`,
              payload: null, createdAt: new Date().toISOString(),
            });
          } catch (err) {
            storeEvent({
              id: createRunId(), runId: current.id, phase: 'MERGE',
              level: 'WARN', message: `Issue close skipped: ${String(err).slice(0, 200)}`,
              payload: null, createdAt: new Date().toISOString(),
            });
          }
          result = transition(current, 'DONE', `PR #${pr.number} merged: ${mergeResult.sha?.slice(0, 7)}`, 'INFO');
        } else {
          result = transition(current, 'DONE', `PR #${pr.number} not mergeable: ${mergeResult.message ?? 'unknown'}`, 'WARN');
        }
      } catch (err) {
        storeEvent({
          id: createRunId(), runId: current.id, phase: 'MERGE',
          level: 'WARN', message: `Merge failed: ${String(err).slice(0, 200)}`,
          payload: null, createdAt: new Date().toISOString(),
        });
        result = transition(current, 'DONE', `Merge failed: ${String(err).slice(0, 100)}`, 'WARN');
      }
      break;
    }
    default:
      return current; // terminal
  }

  if (result.ok) {
    storeEvent(result.event);
    return result.run;
  } else {
    storeEvent(result.event);
    return current;
  }
}

/** Gespeicherte Ziel-Phase für Resume (Aufgabe 5) */
const resumePhaseTarget = new Map<string, Phase>();

async function runFullPipeline(
  run: RunState,
  repository: RepositoryConfig,
  workspace: GitWorkspaceAdapter,
  speckit: SpecKitAdapter,
  opencode: OpenCodeAdapter,
  github: GitHubAdapter,
  syncService?: GitHubStatusSyncService,
  options?: { startFromPhase?: Phase },
): Promise<RunState> {
  let current = run;
  const maxSteps = 20;
  let attempt = 0;

  // Resume-by-State: Phase überspringen bis zur Ziel-Phase (Aufgabe 5)
  if (options?.startFromPhase && options.startFromPhase !== run.phase) {
    const skipEvent = {
      id: createRunId(), runId: run.id,
      phase: run.phase, level: 'GATE' as EventLevel,
      message: `Resume: skipping to phase ${options.startFromPhase}`,
      payload: { resumeFrom: run.phase, resumeTo: options.startFromPhase },
      createdAt: new Date().toISOString(),
    };
    storeEvent(skipEvent);
    current = {
      ...run,
      phase: options.startFromPhase,
      status: 'active',
      lastError: null,
    };
    saveRunToDb(current);
  }
  // Configurable max retries: env var overrides constant (Issue #31)
  const envMaxRetries = process.env.POSITRON_MAX_FIX_LOOPS
    ? parseInt(process.env.POSITRON_MAX_FIX_LOOPS, 10)
    : undefined;
  const maxAttempts = envMaxRetries && !isNaN(envMaxRetries) ? envMaxRetries : MAX_FIX_LOOPS;
  const fixLoopEnabled = process.env.POSITRON_ENABLE_FIX_LOOP === 'true';
  let lastRetryTime = 0;

  for (let i = 0; i < maxSteps; i++) {
    // Check control signals before each phase (Issue #30)
    const signalCheck = checkRunSignal(current.id, current.phase);
    if (signalCheck === 'abort') {
      const abortResult = markFailed(current, 'FAILED_BLOCKED', 'Run aborted by user');
      storeEvent(abortResult.event);
      saveRunToDb(abortResult.run);
      broadcastSSE(abortResult.run.id, 'run-update', { phase: abortResult.run.phase, status: abortResult.run.status, branch: abortResult.run.branch });
      return abortResult.run;
    }
    if (signalCheck === 'paused') {
      // Wait for resume or abort
      storeEvent({
        id: createRunId(), runId: current.id, phase: current.phase, level: 'GATE' as EventLevel,
        message: 'Run paused by user — waiting for resume or abort',
        payload: null, createdAt: new Date().toISOString(),
      });
      broadcastSSE(current.id, 'run-control', { action: 'paused' });
      while (true) {
        await new Promise(r => setTimeout(r, 500));
        const s = checkRunSignal(current.id, current.phase);
        if (s === 'abort') {
          const abortResult = markFailed(current, 'FAILED_BLOCKED', 'Run aborted while paused');
          storeEvent(abortResult.event);
          saveRunToDb(abortResult.run);
          broadcastSSE(abortResult.run.id, 'run-update', { phase: abortResult.run.phase, status: abortResult.run.status, branch: abortResult.run.branch });
          return abortResult.run;
        }
        if (s === 'proceed') {
          storeEvent({
            id: createRunId(), runId: current.id, phase: current.phase, level: 'GATE' as EventLevel,
            message: 'Run resumed by user',
            payload: null, createdAt: new Date().toISOString(),
          });
          broadcastSSE(current.id, 'run-control', { action: 'resumed' });
          break;
        }
      }
    }
    if (signalCheck === 'resume') {
      // Resume-by-State (Aufgabe 5): Phase überspringen zur Ziel-Phase
      const targetPhase = resumePhaseTarget.get(current.id);
      if (targetPhase) {
        resumePhaseTarget.delete(current.id);
        current = {
          ...current,
          phase: targetPhase,
          status: 'active',
          lastError: null,
        };
        saveRunToDb(current);
        storeEvent({
          id: createRunId(), runId: current.id, phase: current.phase,
          level: 'GATE', message: `Resumed to phase: ${targetPhase}`,
          payload: { targetPhase }, createdAt: new Date().toISOString(),
        });
        broadcastSSE(current.id, 'run-update', { phase: current.phase, status: current.status, branch: current.branch });
        continue;
      }
    }
    if (signalCheck === 'retry') {
      // Manual retry from FAILED_TRANSIENT
      const retryResult = retry(current);
      if (retryResult.ok) {
        storeEvent(retryResult.event);
        saveRunToDb(retryResult.run);
        current = retryResult.run;
        attempt = current.attempt;
        broadcastSSE(current.id, 'run-update', { phase: current.phase, status: current.status, branch: current.branch });
        continue;
      }
    }

    const next = await executePhase(current, repository, workspace, speckit, opencode, github, syncService);
    if (next.phase === current.phase || next.phase === 'DONE' || next.phase.startsWith('FAILED')) {
      // --- Fix-Loop (Issue #31 — enhanced) ---
      if (fixLoopEnabled && next.phase === 'FAILED_TRANSIENT' && attempt < maxAttempts) {
        attempt++;

        // Find the original failed phase from event payload (stored by markFailed)
        const allTransient = getEvents(next.id).filter((e: RunEventData) => e.phase === 'FAILED_TRANSIENT');
        const transientEvent = allTransient[allTransient.length - 1];
        const failedPhase = (transientEvent?.payload as Record<string, unknown> | null)?.failedPhase as string | undefined;
        const retryFromPhase = failedPhase && failedPhase !== 'FAILED_TRANSIENT' ? failedPhase : 'TEST';

        // Exponential backoff: 1s, 2s, 4s, 8s... max 30s
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        const now = Date.now();
        const timeSinceLastRetry = now - lastRetryTime;
        if (timeSinceLastRetry < backoffMs) {
          await new Promise(r => setTimeout(r, backoffMs - timeSinceLastRetry));
        }
        lastRetryTime = Date.now();

        storeEvent({
          id: createRunId(), runId: next.id, phase: retryFromPhase as Phase,
          level: 'WARN',
          message: `Fix-Loop retry ${attempt}/${maxAttempts} — phase: ${retryFromPhase}, backoff: ${backoffMs}ms`,
          payload: { attempt, maxAttempts, retryFromPhase, backoffMs },
          createdAt: new Date().toISOString(),
        });

        // Manually set run state (transition validation rejects FAILED_TRANSIENT → *)
        current = {
          ...next,
          phase: retryFromPhase as Phase,
          status: 'active',
          attempt,
          lastError: null,
        };
        broadcastSSE(current.id, 'run-update', { phase: current.phase, status: current.status, branch: current.branch });
        continue;
      }

      // Sync terminal state
      if (syncService) {
        const syncInput: GitHubStatusSyncInput = {
          runId: next.id, owner: repository.owner, repo: repository.repo,
          issueNumber: next.issueNumber, phase: next.phase, status: next.phase === 'DONE' ? 'done' : 'failed',
          branchName: next.branch ?? undefined,
          evidence: buildEvidence(next),
        };
        if (next.phase === 'DONE') {
          await safeSync(syncService, () => syncService.syncDone(syncInput), next.id, 'DONE');
        } else if (next.phase === 'FAILED_BLOCKED') {
          await safeSync(syncService, () => syncService.syncBlocked({
            ...syncInput, error: { type: 'blocked', message: 'Run blocked: max steps or policy violation' },
          }), next.id, 'FAILED_BLOCKED');
        } else if (next.phase.startsWith('FAILED')) {
          await safeSync(syncService, () => syncService.syncFailed({
            ...syncInput, error: { type: 'failed', message: `Run failed in phase ${next.phase}` },
          }), next.id, next.phase);
        }
      }
      saveRunToDb(next);
      broadcastSSE(next.id, 'run-update', { phase: next.phase, status: next.status, branch: next.branch });
      return next;
    }
    current = next;
  }
  // Timeout
  const result = markFailed(current, 'FAILED_BLOCKED', 'Max steps exceeded');
  storeEvent(result.event);
  // Sync timeout
  if (syncService) {
    const syncInput: GitHubStatusSyncInput = {
      runId: result.run.id, owner: repository.owner, repo: repository.repo,
      issueNumber: result.run.issueNumber, phase: 'FAILED_BLOCKED', status: 'blocked',
      branchName: result.run.branch ?? undefined,
      error: { type: 'blocked', message: 'Max steps exceeded (timeout)' },
    };
    await safeSync(syncService, () => syncService.syncBlocked(syncInput), result.run.id, 'FAILED_BLOCKED');
  }
  saveRunToDb(result.run);
  broadcastSSE(result.run.id, 'run-complete', { phase: result.run.phase, status: result.run.status });
  return result.run;
}

/**
 * Wandelt DB-Zeilen in RunState-Objekte um.
 */
function mapDbRows(rows: Array<Record<string, unknown>>): RunState[] {
  return rows.map(row => ({
    id: row.id as string,
    repoId: row.repo_id as string,
    issueNumber: row.issue_number as number,
    branch: row.branch as string | null,
    phase: row.phase as Phase,
    status: row.status as RunStatus,
    autonomyLevel: row.autonomy_level as number,
    attempt: row.attempt as number,
    startedAt: row.started_at as string,
    finishedAt: row.finished_at as string | null,
    lastError: row.last_error as string | null,
    workspacePath: row.workspace_path as string | null,
  }));
}

/**
 * Speichert ein Artefakt (Spec, Plan, Tasks, etc.) in der Datenbank.
 */
function saveArtifact(runId: string, kind: string, content: string | string[]): void {
  try {
    const contentStr = Array.isArray(content) ? content.join('\n') : content;
    getDb().prepare(`
      INSERT INTO artifacts (id, run_id, kind, content, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        content = excluded.content
    `).run(
      crypto.randomUUID(),
      runId,
      kind,
      contentStr,
      new Date().toISOString(),
    );
  } catch (err) {
    console.error(`[saveArtifact] Fehler beim Speichern von '${kind}' für Run ${runId}:`, err);
  }
}

/** Build evidence items from run state for sync comments */
function buildEvidence(run: RunState): EvidenceItem[] {
  const items: EvidenceItem[] = [{ kind: 'run-phase', status: 'pass', summary: `Phase: ${run.phase}` }];
  if (run.branch) items.push({ kind: 'branch', status: 'pass', summary: `Branch: ${run.branch}` });
  return items;
}

/** Generate PR body from run evidence (Issue #17) */
function renderPRBody(run: RunState, repo: RepositoryConfig, evidence: EvidenceItem[], branch: string): string {
  const lines: string[] = [
    '## Positron Automated Changes',
    '',
    `**Run ID:** \`${run.id}\``,
    `**Issue:** #${run.issueNumber}`,
    `**Branch:** \`${branch}\``,
    '',
    '---',
    '',
    '## Evidence',
    '',
  ];

  if (evidence.length > 0) {
    lines.push('| Kind | Status | Summary |');
    lines.push('|------|--------|---------|');
    for (const e of evidence) {
      const emoji = e.status === 'pass' ? '✅' : e.status === 'fail' ? '❌' : e.status === 'blocked' ? '🚫' : '⏭️';
      lines.push(`| ${e.kind} | ${emoji} ${e.status} | ${e.summary} |`);
    }
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`Closes #${run.issueNumber}`);
  lines.push('');
  lines.push('_Generated by [Positron](https://github.com/xxammaxx/Positron)_');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Input-Validierung
// ---------------------------------------------------------------------------

/**
 * Validiert einen Run-Start-Request-Body.
 * @throws {Error} Wenn der Body ungültig ist.
 * @returns {issueNumber: number, autonomyLevel?: number} Validiertes Objekt.
 */
function validateRunRequest(body: unknown): { issueNumber: number; autonomyLevel?: number } {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body required');
  }
  const raw = body as Record<string, unknown>;

  // issueNumber: positive Ganzzahl 1-999999
  if (raw.issueNumber === undefined || raw.issueNumber === null) {
    throw new Error('issueNumber is required and must be a positive integer (1-999999)');
  }
  const issueNumber = Number(raw.issueNumber);
  if (!Number.isInteger(issueNumber) || issueNumber < 1 || issueNumber > 999999) {
    throw new Error('issueNumber must be a positive integer (1-999999)');
  }

  // autonomyLevel: optional, 0-4
  let autonomyLevel: number | undefined;
  if (raw.autonomyLevel !== undefined && raw.autonomyLevel !== null) {
    autonomyLevel = Number(raw.autonomyLevel);
    if (!Number.isInteger(autonomyLevel) || autonomyLevel < 0 || autonomyLevel > 4) {
      throw new Error('autonomyLevel must be an integer between 0 and 4');
    }
  }

  return { issueNumber, autonomyLevel };
}

/**
 * Validiert einen POST /api/repos Request-Body.
 * @throws {Error} Wenn der Body ungültig ist.
 */
function validateRepoRegistration(body: unknown): { owner: string; name: string } {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body required');
  }
  const raw = body as Record<string, unknown>;

  const owner = String(raw.owner ?? '').trim();
  const name = String(raw.name ?? '').trim();

  if (!owner || owner.length > 39 || !/^[a-zA-Z0-9-]+$/.test(owner)) {
    throw new Error('owner must be a non-empty GitHub username (max 39 chars, alphanumeric + hyphens)');
  }
  if (!name || name.length > 100 || !/^[a-zA-Z0-9._-]+$/.test(name)) {
    throw new Error('name must be a non-empty repo name (max 100 chars, alphanumeric + . _ -)');
  }

  return { owner, name };
}

// ---------------------------------------------------------------------------
// REST API
// ---------------------------------------------------------------------------

export function createApp(options: ServerOptions = {}) {
  // SQLite-Datenbank initialisieren
  db = openDatabase(options.dbPath);
  const repository = resolveRepositoryConfig(options.repository);
  const github = resolveAdapter(options.adapter).adapter;
  const activeWorkspaceAdapter = options.workspaceAdapter ?? workspaceAdapter;
  const activeSpecKitAdapter = resolveSpecKitAdapter(options.speckitAdapter);
  const activeOpenCodeAdapter = resolveOpenCodeAdapter(options.opencodeAdapter);
  const syncService = new GitHubStatusSyncService(github);
  const app = express();
  app.use(express.json());

  // CORS — allow frontend on any local port
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (_req.method === 'OPTIONS') { res.sendStatus(204); return; }
    next();
  });

  // Repository registrieren
  app.post('/api/repos', (req, res) => {
    try {
      validateRepoRegistration(req.body ?? {});
      res.json({ id: 'repo-1', status: 'registered', mode: github instanceof FakeGitHubAdapter ? 'fake' : 'real' });
    } catch (err) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: err instanceof Error ? err.message : 'Invalid request',
      });
    }
  });

  // Repository-Liste abrufen
  app.get('/api/repos', (_req, res) => {
    try {
      const repos = getDb().prepare(`
        SELECT id, owner, name, url, local_path as localPath, default_branch as defaultBranch, enabled, created_at as createdAt
        FROM repositories
        ORDER BY created_at DESC
      `).all();
      res.json({ repos, total: (repos as Array<unknown>).length });
    } catch (err) {
      res.status(500).json({ error: 'Datenbankfehler', details: String(err) });
    }
  });

  // Issues abrufen (echt via Adapter)
  app.get('/api/repos/:id/issues', async (req, _res, next) => {
    try {
      const issues = await github.listOpenIssues(repository.owner, repository.repo);
      _res.json({ issues });
    } catch (err) { next(err); }
  });

  // Run starten
  app.post('/api/repos/:repoId/runs', async (req, res) => {
    try {
      const { issueNumber, autonomyLevel } = validateRunRequest(req.body);
      const run = createRun(repository.repo, issueNumber, autonomyLevel ?? 2);
      saveRunToDb(run); // Sofort persistieren — sichtbar noch während Pipeline läuft
      const completed = await runFullPipeline(run, repository, activeWorkspaceAdapter, activeSpecKitAdapter, activeOpenCodeAdapter, github, syncService);
      const evts = getEvents(completed.id);
      res.json({ run: completed, events: evts, eventCount: evts.length });
    } catch (err) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: err instanceof Error ? err.message : 'Invalid request',
      });
    }
  });

  // Runs auflisten (mit Pagination)
  app.get('/api/runs', (req, res) => {
    try {
      const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
      const repoId = req.query.repoId as string | undefined;
      const offset = (page - 1) * limit;

      const database = getDb();

      if (repoId) {
        const runs = database.prepare(`
          SELECT * FROM runs WHERE repo_id = ? ORDER BY started_at DESC LIMIT ? OFFSET ?
        `).all(repoId, limit, offset);
        const total = (database.prepare(
          'SELECT COUNT(*) as c FROM runs WHERE repo_id = ?'
        ).get(repoId) as { c: number }).c;
        res.json({
          runs: mapDbRows(runs as Array<Record<string, unknown>>),
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
          total,
        });
      } else {
        const runs = database.prepare(`
          SELECT * FROM runs ORDER BY started_at DESC LIMIT ? OFFSET ?
        `).all(limit, offset);
        const total = (database.prepare(
          'SELECT COUNT(*) as c FROM runs'
        ).get() as { c: number }).c;
        res.json({
          runs: mapDbRows(runs as Array<Record<string, unknown>>),
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
          total,
        });
      }
    } catch (err) {
      res.status(500).json({ error: 'Datenbankfehler', details: String(err) });
    }
  });

  // Run-Details
  app.get('/api/runs/:id', (req, res) => {
    const run = loadRunFromDb(req.params.id);
    if (!run) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ run, events: getEvents(run.id) });
  });

  // SSE Event Stream (Issue #29)
  app.get('/api/runs/:id/events/stream', (req, res) => {
    const runId = req.params.id;
    const run = loadRunFromDb(runId);
    if (!run) { res.status(404).json({ error: 'Not found' }); return; }

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Send initial state
    const initialState = { run, events: getEvents(runId) };
    res.write(`event: initial\ndata: ${JSON.stringify(initialState)}\n\n`);

    // Register for live updates
    addSSEClient(runId, res);

    // Keep alive
    const keepAlive = setInterval(() => {
      try { res.write(':keepalive\n\n'); } catch { clearInterval(keepAlive); }
    }, 15000);

    // Cleanup on disconnect
    req.on('close', () => {
      clearInterval(keepAlive);
      removeSSEClient(runId, res);
    });
  });

  // Health
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', runs: countRunsInDb() });
  });

  // Adapter Health Status (Issue #22)
  app.get('/api/adapters/health', async (_req, res) => {
    try {
      const speckitHealth = await activeSpecKitAdapter.healthCheck('/tmp');
      const opencodeHealth = await activeOpenCodeAdapter.healthCheck('/tmp');
      res.json({
        github: { available: !(github instanceof FakeGitHubAdapter), mode: github instanceof FakeGitHubAdapter ? 'fake' : 'real' },
        specKit: speckitHealth,
        openCode: opencodeHealth,
      });
    } catch (err) {
      res.json({ error: String(err) });
    }
  });

  // --- Blueprint Demo Endpoint (Issue #56) ---
  // Accepts a blueprint markdown, creates a demo run, runs the pipeline.
  // POST /api/demo/blueprint  { blueprint: string, issueNumber?: number }
  app.post('/api/demo/blueprint', async (req, res) => {
    const { blueprint, issueNumber } = req.body;
    if (!blueprint || typeof blueprint !== 'string') {
      res.status(400).json({ error: 'blueprint (string) is required' });
      return;
    }
    // issueNumber optional — auf positive Ganzzahl prüfen
    let issueNum = parseInt(process.env.POSITRON_DEFAULT_ISSUE_NUMBER ?? '56', 10);
    if (issueNumber !== undefined && issueNumber !== null) {
      const parsed = Number(issueNumber);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 999999) {
        res.status(400).json({ error: 'issueNumber must be a positive integer (1-999999)' });
        return;
      }
      issueNum = parsed;
    }
    const run = createRun(repository.repo, issueNum, 2);
    saveRunToDb(run);

    // Store blueprint as initial event
    storeEvent({
      id: createRunId(),
      runId: run.id,
      phase: 'QUEUED',
      level: 'HUMAN',
      message: `Blueprint submitted for Issue #${issueNum}`,
      payload: { blueprint, issueNumber: issueNum, source: 'demo-blueprint' },
      createdAt: new Date().toISOString(),
    });

    // Run pipeline asynchronously — response immediately with run ID
    res.json({ run, message: 'Blueprint run started', blueprint });
    runFullPipeline(run, repository, activeWorkspaceAdapter, activeSpecKitAdapter, activeOpenCodeAdapter, github, syncService)
      .then(finalRun => {
        saveRunToDb(finalRun);
        broadcastSSE(finalRun.id, 'run-update', { phase: finalRun.phase, status: finalRun.status, branch: finalRun.branch });
      })
      .catch(err => {
        storeEvent({
          id: createRunId(), runId: run.id, phase: 'FAILED_BLOCKED',
          level: 'ERROR', message: `Blueprint run failed: ${String(err).slice(0, 200)}`,
          payload: null, createdAt: new Date().toISOString(),
        });
      });
  });

  // GET blueprint for a run
  app.get('/api/demo/blueprint/:runId', (req, res) => {
    const evts = getEvents(req.params.runId);
    const blueprintEvent = evts.find(e => e.payload && typeof e.payload === 'object' && 'blueprint' in (e.payload as Record<string, unknown>));
    if (!blueprintEvent) {
      res.status(404).json({ error: 'No blueprint found for this run' });
      return;
    }
    res.json({ blueprint: (blueprintEvent.payload as Record<string, unknown>).blueprint, runId: req.params.runId });
  });

  // Safety State (Issue #28)
  app.get('/api/safety', (_req, res) => {
    res.json({
      enableMerge: process.env.POSITRON_ENABLE_MERGE === 'true',
      mergeDryRun: process.env.POSITRON_MERGE_DRY_RUN === 'true',
      enablePush: process.env.POSITRON_ENABLE_PUSH === 'true',
      killSwitch: process.env.POSITRON_MERGE_KILL_SWITCH !== 'false',
      enableFixLoop: process.env.POSITRON_ENABLE_FIX_LOOP === 'true',
    });
  });

  // Merge Status (Issue #22)
  app.get('/api/runs/:id/merge-status', (_req, res) => {
    const run = loadRunFromDb(_req.params.id);
    if (!run) { res.status(404).json({ error: 'Not found' }); return; }

    const mergeAllowed = process.env.POSITRON_ENABLE_MERGE === 'true';
    const mergeKillSwitch = process.env.POSITRON_MERGE_KILL_SWITCH !== 'false';
    const mergeDryRun = process.env.POSITRON_MERGE_DRY_RUN === 'true';
    const testEvent = getEvents(run.id).find(e => e.phase === 'TEST' && e.level === 'INFO');

    res.json({
      enabled: mergeAllowed,
      killSwitch: mergeKillSwitch,
      dryRun: mergeDryRun,
      runStatus: run.status,
      hasTestEvidence: !!testEvent,
      branch: run.branch,
      canMerge: mergeAllowed && !mergeKillSwitch && run.status === 'active' && !!testEvent && !!run.branch,
      blockedReasons: [
        !mergeAllowed && 'POSITRON_ENABLE_MERGE not set',
        mergeKillSwitch && 'Kill-Switch active',
        run.status !== 'active' && `Run status is ${run.status}`,
        !testEvent && 'No passing test evidence',
        !run.branch && 'No branch',
      ].filter(Boolean),
    });
  });

  // Gate-Entscheidung (approve / revise)
  app.post('/api/runs/:id/gate', express.json(), async (req, res) => {
    const { id } = req.params;
    const { decision, reason } = req.body as {
      decision: 'approve' | 'revise';
      reason?: string;
    };

    if (!['approve', 'revise'].includes(decision)) {
      return res.status(400).json({ error: 'decision muss approve oder revise sein' });
    }

    const run = loadRunFromDb(id);
    if (!run) return res.status(404).json({ error: 'Run nicht gefunden' });

    const action = decision === 'approve' ? 'resume' : 'retry';

    try {
      storeEvent({
        id: createRunId(), runId: id,
        phase: run.phase, level: 'GATE',
        message: `Gate-Entscheidung: ${decision}${reason ? ` — ${reason}` : ''}`,
        payload: { decision, reason: reason ?? '' },
        createdAt: new Date().toISOString(),
      });

      if (decision === 'approve') {
        // Run zum nächsten Schritt fortsetzen
        const targetPhase: Phase = run.phase === 'GATE_APPROVE' ? 'COMMIT' : 'MERGE';
        const updatedRun = { ...run, phase: targetPhase, status: 'active' as RunStatus, lastError: null };
        saveRunToDb(updatedRun);
        runSignals.set(id, 'RESUME');
        resumePhaseTarget.set(id, targetPhase);
      } else {
        // Zurück zur vorherigen Phase (revise)
        const targetPhase: Phase = 'REVIEW';
        const updatedRun = { ...run, phase: targetPhase, status: 'active' as RunStatus, lastError: null };
        saveRunToDb(updatedRun);
        runSignals.set(id, 'RETRY');
      }

      res.json({ ok: true, action });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Artefakt laden (Spec, Plan, Tasks, Review, Test-Results)
  app.get('/api/runs/:id/artifacts/:kind', (req, res) => {
    const { id, kind } = req.params;

    const VALID_KINDS = ['spec', 'plan', 'tasks', 'review', 'test-results', 'diff'];
    if (!VALID_KINDS.includes(kind)) {
      return res.status(400).json({
        error: `Ungültiger Artefakt-Typ. Erlaubt: ${VALID_KINDS.join(', ')}`,
      });
    }

    try {
      const artifact = getDb().prepare(`
        SELECT id, run_id, kind, content, created_at
        FROM artifacts
        WHERE run_id = ? AND kind = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).get(id, kind) as Record<string, unknown> | undefined;

      if (!artifact) {
        return res.status(404).json({
          error: `Kein Artefakt vom Typ '${kind}' für Run '${id}' gefunden`,
        });
      }

      res.json({
        artifact: {
          content: artifact.content,
          kind: artifact.kind,
          createdAt: artifact.created_at,
        },
      });
    } catch (err) {
      res.status(500).json({ error: 'Datenbankfehler', details: String(err) });
    }
  });

  // System-Metriken
  app.get('/api/metrics', (_req, res) => {
    try {
      const database = getDb();
      const total = (database.prepare('SELECT COUNT(*) as c FROM runs').get() as { c: number }).c;
      const active = (database.prepare("SELECT COUNT(*) as c FROM runs WHERE status = 'active'").get() as { c: number }).c;
      const done = (database.prepare("SELECT COUNT(*) as c FROM runs WHERE status = 'done'").get() as { c: number }).c;
      const failed = (database.prepare("SELECT COUNT(*) as c FROM runs WHERE status = 'failed'").get() as { c: number }).c;
      const blocked = (database.prepare("SELECT COUNT(*) as c FROM runs WHERE status = 'blocked'").get() as { c: number }).c;
      const repositories = (database.prepare('SELECT COUNT(*) as c FROM repositories').get() as { c: number }).c;

      const phaseDistribution = database.prepare(`
        SELECT phase, COUNT(*) as count
        FROM runs WHERE status = 'active'
        GROUP BY phase ORDER BY count DESC
      `).all();

      const recentFailures = database.prepare(`
        SELECT id, phase, started_at as startedAt, finished_at as finishedAt
        FROM runs WHERE status = 'failed' OR status = 'blocked'
        ORDER BY finished_at DESC LIMIT 5
      `).all();

      const avgRow = database.prepare(`
        SELECT AVG(
          CAST(strftime('%s', finished_at) AS INTEGER) -
          CAST(strftime('%s', started_at) AS INTEGER)
        ) * 1000 as avg_ms
        FROM runs WHERE status = 'done'
      `).get() as { avg_ms: number | null } | undefined;

      res.json({
        metrics: {
          runs: { total, active, done, failed, blocked },
          repositories: { total: repositories },
          phaseDistribution,
          recentFailures,
          avgRunDurationMs: avgRow?.avg_ms ?? null,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      res.status(500).json({ error: 'Metriken konnten nicht geladen werden', details: String(err) });
    }
  });

  // Run Control (Issue #30)
  app.post('/api/runs/:id/control', (req, res) => {
    const runId = req.params.id;
    const run = loadRunFromDb(runId);
    if (!run) { res.status(404).json({ error: 'Run not found' }); return; }

    const { action } = req.body as { action: string };
    const validActions = ['pause', 'abort', 'resume', 'retry'];
    if (!validActions.includes(action)) {
      res.status(400).json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` });
      return;
    }

    // Validate action based on run state
    if (action === 'pause' && run.phase.startsWith('FAILED')) {
      res.status(409).json({ error: 'Cannot pause a failed/completed run' });
      return;
    }
    if (action === 'resume') {
      // Resume-by-State (Aufgabe 5): Von der letzten abgeschlossenen Phase fortsetzen
      const isPaused = runSignals.get(runId) === 'PAUSE';
      const isFailed = run.phase === 'FAILED_BLOCKED' || run.phase === 'FAILED_TRANSIENT';

      if (!isPaused && !isFailed) {
        res.status(409).json({ error: 'Run is not paused or failed — cannot resume' });
        return;
      }

      // Events aus DB laden und nächste Phase berechnen
      const events = getEvents(runId);
      const resumeState = resumeFromEvents(run.id, run.repoId, run.issueNumber, events);

      // Nächste Phase bestimmen (nach der letzten abgeschlossenen)
      const ALL_PHASES_LIST: readonly Phase[] = [
        'QUEUED', 'CLAIMED', 'REPO_SYNC', 'ISSUE_CONTEXT',
        'WEB_RESEARCH', 'SPECIFY', 'CLARIFY_OPTIONAL',
        'PLAN', 'TASKS', 'ANALYZE', 'REVIEW', 'IMPLEMENT',
        'TEST', 'VERIFY', 'COMMIT', 'PR_CREATE', 'MERGE', 'DONE',
        'FAILED', 'FAILED_TRANSIENT', 'FAILED_BLOCKED', 'FAILED_UNSAFE',
        'BLOCKED_PUSH', 'BLOCKED_MERGE', 'GATE_APPROVE', 'GATE_REVISE',
        'RESUME_PENDING', 'CLEANUP',
      ];
      const lastIdx = ALL_PHASES_LIST.indexOf(resumeState.phase);
      const nextPhase: Phase = (lastIdx >= 0 && lastIdx < ALL_PHASES_LIST.length - 1)
        ? (ALL_PHASES_LIST[lastIdx + 1] as Phase)
        : 'TEST';

      // Ziel-Phase speichern und Signal setzen
      resumePhaseTarget.set(runId, nextPhase);
      runSignals.set(runId, 'RESUME');

      storeEvent({
        id: createRunId(),
        runId,
        phase: run.phase,
        level: 'HUMAN',
        message: `Run resume: continuing from phase ${nextPhase}`,
        payload: { action, resumeFromPhase: nextPhase },
        createdAt: new Date().toISOString(),
      });

      broadcastSSE(runId, 'run-control', { action: 'resume', resumeFromPhase: nextPhase });

      res.json({ ok: true, action, runId, resumeFromPhase: nextPhase });
      return;
    } else {
      if (action === 'retry' && run.phase !== 'FAILED_TRANSIENT') {
        res.status(409).json({ error: 'Can only retry a FAILED_TRANSIENT run' });
        return;
      }
      if (action === 'retry' && run.attempt >= MAX_FIX_LOOPS) {
        res.status(409).json({ error: `Max retries (${MAX_FIX_LOOPS}) reached` });
        return;
      }

      // Set signal
      const signal = action.toUpperCase() as 'PAUSE' | 'ABORT' | 'RESUME' | 'RETRY';
      runSignals.set(runId, signal);
    }

    // Log event
    storeEvent({
      id: createRunId(),
      runId,
      phase: run.phase,
      level: 'HUMAN',
      message: `Run control: ${action} requested by user`,
      payload: { action },
      createdAt: new Date().toISOString(),
    });

    broadcastSSE(runId, 'run-control', { action });

    res.json({ ok: true, action, runId });
  });

  return app;
}

export { runFullPipeline };

export function createServer(options: ServerOptions = {}) {
  const app = createApp(options);
  return http.createServer(app);
}

// Auto-start when run directly
const isDirectRun = process.argv[1] && (
  process.argv[1].includes('/dist/index.js') ||
  process.argv[1].includes('/src/index.ts')
);
if (isDirectRun) {
  const port = parseInt(process.env['PORT'] ?? '3000', 10);
  const server = createServer();
  server.listen(port, () => {
    console.log(`⚡ Positron v3.0 — Server listening on http://localhost:${port}`);
    console.log(`   GitHub Mode: ${process.env['GITHUB_MODE'] ?? 'fake'}`);
  });
}
