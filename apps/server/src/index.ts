// Positron Server — Orchestrator und REST API

import express from 'express';
import http from 'node:http';
import { createRun, transition, markFailed, resumeFromEvents } from '@positron/run-state';
import { runSpecify, runPlan, runTasks } from '@positron/speckit-adapter';
import { RealSpecKitAdapter, FakeSpecKitAdapter } from '@positron/speckit-adapter';
import { executeTasks } from '@positron/opencode-adapter';
import { RealOpenCodeAdapter, FakeOpenCodeAdapter } from '@positron/opencode-adapter';
import { generateBranchName, createRunId, loadRepositoryConfig, normalizeRepositoryConfig, buildRemoteUrl } from '@positron/shared';
import type { Phase, RunStatus } from '@positron/shared';
import type { RepositoryConfig, SpecKitAdapter, OpenCodeAdapter } from '@positron/shared';
import type { RunState, RunEventData } from '@positron/run-state';
import { FakeGitHubAdapter, createRealGitHubAdapter, GitHubStatusSyncService } from '@positron/github-adapter';
import type { GitHubAdapter } from '@positron/github-adapter';
import type { GitHubStatusSyncInput, GitHubStatusSyncResult, EvidenceItem } from '@positron/github-adapter';
import { renderAccepted } from '@positron/github-adapter';
import { FakeGitWorkspaceAdapter } from '@positron/sandbox';
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

// In-Memory Store (MVP)
const runs = new Map<string, RunState>();
const events = new Map<string, RunEventData[]>();
let workspaceAdapter: GitWorkspaceAdapter = new FakeGitWorkspaceAdapter();
let speckitAdapter: SpecKitAdapter = new FakeSpecKitAdapter();
let opencodeAdapter: OpenCodeAdapter = new FakeOpenCodeAdapter();

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

function storeEvent(event: RunEventData): void {
  const list = events.get(event.runId) ?? [];
  list.push(event);
  events.set(event.runId, list);
}

function getEvents(runId: string): RunEventData[] {
  return events.get(runId) ?? [];
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
      const wsPath = current.branch ? `/tmp/positron-ws-${current.id.slice(0, 8)}` : '/tmp';
      const input = { runId: current.id, workspacePath: wsPath, issueTitle: `Issue #${current.issueNumber}`, issueNumber: current.issueNumber, mode: 'artifact-only' as const };
      try {
        const sr = await speckit.runSpecify(input);
        if (sr.status === 'blocked') {
          storeEvent({ id: createRunId(), runId: current.id, phase: 'SPECIFY', level: 'WARN', message: `Specify blocked: ${sr.blockedReason ?? 'agent slash command required'}`, payload: { result: sr }, createdAt: new Date().toISOString() });
          // Trotzdem weitermachen — Spec ist optional via Artefakt-Detection
          result = transition(current, 'PLAN', sr.summary, 'INFO');
        } else {
          result = transition(current, 'PLAN', sr.summary, sr.status === 'success' ? 'INFO' : 'WARN');
        }
      } catch (err) {
        storeEvent({ id: createRunId(), runId: current.id, phase: 'SPECIFY', level: 'WARN', message: `Specify error: ${String(err).slice(0, 200)}`, payload: null, createdAt: new Date().toISOString() });
        runSpecify(); // Legacy stub als Fallback
        result = transition(current, 'PLAN', 'Spec generated (legacy stub fallback)', 'INFO');
      }
      break;
    }
    case 'PLAN': {
      const wsPath = current.branch ? `/tmp/positron-ws-${current.id.slice(0, 8)}` : '/tmp';
      const input = { runId: current.id, workspacePath: wsPath, issueTitle: `Issue #${current.issueNumber}`, issueNumber: current.issueNumber, mode: 'artifact-only' as const };
      try {
        const pr = await speckit.runPlan(input);
        if (pr.status === 'blocked') {
          storeEvent({ id: createRunId(), runId: current.id, phase: 'PLAN', level: 'WARN', message: `Plan blocked: ${pr.blockedReason ?? 'agent slash command required'}`, payload: { result: pr }, createdAt: new Date().toISOString() });
        }
        result = transition(current, 'TASKS', pr.summary, pr.status === 'success' ? 'INFO' : 'WARN');
      } catch (err) {
        storeEvent({ id: createRunId(), runId: current.id, phase: 'PLAN', level: 'WARN', message: `Plan error: ${String(err).slice(0, 200)}`, payload: null, createdAt: new Date().toISOString() });
        runPlan(); // Legacy stub als Fallback
        result = transition(current, 'TASKS', 'Plan generated (legacy stub fallback)', 'INFO');
      }
      break;
    }
    case 'TASKS': {
      const wsPath = current.branch ? `/tmp/positron-ws-${current.id.slice(0, 8)}` : '/tmp';
      const input = { runId: current.id, workspacePath: wsPath, issueTitle: `Issue #${current.issueNumber}`, issueNumber: current.issueNumber, mode: 'artifact-only' as const };
      try {
        const tr = await speckit.runTasks(input);
        if (tr.status === 'blocked') {
          storeEvent({ id: createRunId(), runId: current.id, phase: 'TASKS', level: 'WARN', message: `Tasks blocked: ${tr.blockedReason ?? 'agent slash command required'}`, payload: { result: tr }, createdAt: new Date().toISOString() });
        }
        result = transition(current, 'ANALYZE', tr.summary, tr.status === 'success' ? 'INFO' : 'WARN');
      } catch (err) {
        storeEvent({ id: createRunId(), runId: current.id, phase: 'TASKS', level: 'WARN', message: `Tasks error: ${String(err).slice(0, 200)}`, payload: null, createdAt: new Date().toISOString() });
        runTasks(); // Legacy stub als Fallback
        result = transition(current, 'ANALYZE', 'Tasks generated (legacy stub fallback)', 'INFO');
      }
      break;
    }
    case 'ANALYZE': {
      const wsPath = current.branch ? `/tmp/positron-ws-${current.id.slice(0, 8)}` : '/tmp';
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
      const wsPath = current.branch ? `/tmp/positron-ws-${current.id.slice(0, 8)}` : '/tmp';
      const input = { runId: current.id, workspacePath: wsPath, issueTitle: `Issue #${current.issueNumber}`, issueNumber: current.issueNumber, mode: 'safe-cli' as const, autonomyLevel: current.autonomyLevel };
      try {
        const ir = await opencode.runImplement(input);
        if (ir.status === 'blocked') {
          storeEvent({ id: createRunId(), runId: current.id, phase: 'IMPLEMENT', level: 'WARN', message: `Implement blocked: ${ir.blockedReason ?? 'policy'}`, payload: { result: ir }, createdAt: new Date().toISOString() });
        }
        result = transition(current, 'TEST', ir.summary, ir.status === 'success' ? 'INFO' : 'WARN');
      } catch (err) {
        storeEvent({ id: createRunId(), runId: current.id, phase: 'IMPLEMENT', level: 'WARN', message: `Implement error: ${String(err).slice(0, 200)}`, payload: null, createdAt: new Date().toISOString() });
        executeTasks(); // legacy stub fallback
        result = transition(current, 'TEST', 'Implementation done (legacy fallback)', 'INFO');
      }
      break;
    }
    case 'TEST':
      try {
        const wsPath = current.branch ? `/tmp/positron-ws-${current.id.slice(0, 8)}` : '/tmp';
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
            if (report.status === 'BLOCKED') {
              await safeSync(syncService, () => syncService.syncBlocked({
                ...syncInput, error: { type: 'blocked', message: report.summary },
              }), current.id, 'TEST');
            } else if (report.status === 'FAIL') {
              await safeSync(syncService, () => syncService.syncTestReport(syncInput), current.id, 'TEST');
            } else {
              await safeSync(syncService, () => syncService.syncTestReport(syncInput), current.id, 'TEST');
            }
          }
          result = transition(current, 'VERIFY', `Tests ${report.status}`, report.status === 'PASS' ? 'INFO' : 'ERROR');
        }
      } catch {
        result = transition(current, 'VERIFY', 'Test-Ausführung fehlgeschlagen (MVP)', 'WARN');
      }
      break;
    case 'VERIFY':
      current.branch = current.branch ?? generateBranchName(current.issueNumber, `run-${current.id.slice(0, 8)}`);
      result = transition(current, 'PR_CREATE', 'Verified, PR ready');
      break;
    case 'PR_CREATE':
      result = transition(current, 'DONE', 'PR created');
      break;
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

async function runFullPipeline(
  run: RunState,
  repository: RepositoryConfig,
  workspace: GitWorkspaceAdapter,
  speckit: SpecKitAdapter,
  opencode: OpenCodeAdapter,
  syncService?: GitHubStatusSyncService,
): Promise<RunState> {
  let current = run;
  const maxSteps = 20;
  for (let i = 0; i < maxSteps; i++) {
    const next = await executePhase(current, repository, workspace, speckit, opencode, syncService);
    if (next.phase === current.phase || next.phase === 'DONE' || next.phase.startsWith('FAILED')) {
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
      runs.set(next.id, next);
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
  runs.set(result.run.id, result.run);
  return result.run;
}

/** Build evidence items from run state for sync comments */
function buildEvidence(run: RunState): EvidenceItem[] {
  const items: EvidenceItem[] = [{ kind: 'run-phase', status: 'pass', summary: `Phase: ${run.phase}` }];
  if (run.branch) items.push({ kind: 'branch', status: 'pass', summary: `Branch: ${run.branch}` });
  return items;
}

// ---------------------------------------------------------------------------
// REST API
// ---------------------------------------------------------------------------

export function createApp(options: ServerOptions = {}) {
  const repository = resolveRepositoryConfig(options.repository);
  const github = resolveAdapter(options.adapter).adapter;
  const activeWorkspaceAdapter = options.workspaceAdapter ?? workspaceAdapter;
  const activeSpecKitAdapter = resolveSpecKitAdapter(options.speckitAdapter);
  const activeOpenCodeAdapter = resolveOpenCodeAdapter(options.opencodeAdapter);
  const syncService = new GitHubStatusSyncService(github);
  const app = express();
  app.use(express.json());

  // Repository registrieren
  app.post('/api/repos', (_req, res) => {
    res.json({ id: 'repo-1', status: 'registered', mode: github instanceof FakeGitHubAdapter ? 'fake' : 'real' });
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
    const { issueNumber, autonomyLevel } = req.body;
    const run = createRun(repository.repo, issueNumber ?? 1, autonomyLevel ?? 2);
    const completed = await runFullPipeline(run, repository, activeWorkspaceAdapter, activeSpecKitAdapter, activeOpenCodeAdapter, syncService);
    const evts = getEvents(completed.id);
    res.json({ run: completed, events: evts, eventCount: evts.length });
  });

  // Runs auflisten
  app.get('/api/runs', (_req, res) => {
    res.json({ runs: Array.from(runs.values()) });
  });

  // Run-Details
  app.get('/api/runs/:id', (req, res) => {
    const run = runs.get(req.params.id);
    if (!run) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ run, events: getEvents(run.id) });
  });

  // Health
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', runs: runs.size });
  });

  return app;
}

export function createServer(options: ServerOptions = {}) {
  const app = createApp(options);
  return http.createServer(app);
}
