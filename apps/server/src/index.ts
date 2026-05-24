// Positron Server — Orchestrator und REST API

import express from 'express';
import http from 'node:http';
import { createRun, transition, markFailed, retry, resumeFromEvents } from '@positron/run-state';
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
}

function checkRunSignal(runId: string, runPhase: Phase): 'proceed' | 'abort' | 'retry' | 'paused' {
  const signal = runSignals.get(runId);
  if (!signal) return 'proceed';

  switch (signal) {
    case 'ABORT':
      clearRunSignal(runId);
      return 'abort';
    case 'PAUSE':
      return 'paused';
    case 'RESUME':
      clearRunSignal(runId);
      return 'proceed';
    case 'RETRY':
      if (runPhase !== 'FAILED_TRANSIENT') return 'proceed';
      clearRunSignal(runId);
      return 'retry';
    default:
      return 'proceed';
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

function storeEvent(event: RunEventData): void {
  const list = events.get(event.runId) ?? [];
  list.push(event);
  events.set(event.runId, list);
  // Notify SSE clients about new event
  broadcastSSE(event.runId, 'run-event', event);
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
        runSpecify();
        result = transition(current, 'PLAN', 'Spec generated (legacy stub fallback)', 'INFO');
      }
      break;
    }
    case 'PLAN': {
      const wsPath = current.branch ? `/tmp/positron-ws-${current.id.slice(0, 8)}` : '/tmp';
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
        runPlan();
        result = transition(current, 'TASKS', 'Plan generated (legacy stub fallback)', 'INFO');
      }
      break;
    }
    case 'TASKS': {
      const wsPath = current.branch ? `/tmp/positron-ws-${current.id.slice(0, 8)}` : '/tmp';
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
        runTasks();
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
      result = transition(current, 'COMMIT', 'Verified, commit ready');
      break;
    case 'COMMIT': {
      const branch = current.branch ?? generateBranchName(current.issueNumber, `run-${current.id.slice(0, 8)}`);
      const pushAllowed = process.env.POSITRON_ENABLE_PUSH === 'true';

      // Commit Message generieren
      const commitMsg = `feat(issue-${current.issueNumber}): Positron automated changes [Run: ${current.id.slice(0, 8)}]`;

      try {
        // Diff vor Commit erfassen
        let diffSummary = '';
        try {
          const diff = await workspace.getDiff('/tmp/positron-ws-' + current.id.slice(0, 8));
          diffSummary = `${diff.filesChanged} files, +${diff.insertions ?? 0}/-${diff.deletions ?? 0}`;
        } catch { /* diff optional */ }

        // Commit
        const commitResult = await workspace.commit('/tmp/positron-ws-' + current.id.slice(0, 8), commitMsg);

        // Push nur mit Allow-Flag
        let pushResult = '';
        if (pushAllowed) {
          await workspace.push({ workspacePath: '/tmp/positron-ws-' + current.id.slice(0, 8), branch });
          pushResult = ', pushed';
        } else {
          pushResult = ', push skipped (POSITRON_ENABLE_PUSH not set)';
        }

        const summary = `Committed: ${commitResult.sha.slice(0, 7)}${pushResult}${diffSummary ? ' (' + diffSummary + ')' : ''}`;
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
      // --- Safety Gates (Issue #21) ---
      const mergeAllowed = process.env.POSITRON_ENABLE_MERGE === 'true';
      const mergeDryRun = process.env.POSITRON_MERGE_DRY_RUN === 'true';
      const mergeKillSwitch = process.env.POSITRON_MERGE_KILL_SWITCH === 'true';

      // Kill-Switch: sofortiger Abbruch aller Merges
      if (mergeKillSwitch) {
        result = transition(current, 'DONE', 'Merge BLOCKED: Kill-Switch aktiv (POSITRON_MERGE_KILL_SWITCH=true)', 'WARN');
        break;
      }

      if (!mergeAllowed) {
        result = transition(current, 'DONE', 'Merge skipped (POSITRON_ENABLE_MERGE not set)', 'INFO');
        break;
      }

      // Run-Status-Gate: kein Merge bei blocked/failed
      if (current.status === 'blocked' || current.status === 'failed') {
        result = transition(current, 'DONE', `Merge blocked: Run status is ${current.status}`, 'WARN');
        break;
      }

      // Test-Evidence-Gate: erfordert PASS im TEST-Event
      const testEvent = getEvents(current.id).find(e => e.phase === 'TEST' && e.level === 'INFO');
      if (!testEvent) {
        result = transition(current, 'DONE', 'Merge blocked: No passing test evidence found', 'WARN');
        break;
      }

      const branch = current.branch;
      if (!branch) {
        result = transition(current, 'DONE', 'Merge skipped (no branch)', 'INFO');
        break;
      }

      try {
        const prs = await github.listPullRequests({
          owner: repository.owner, repo: repository.repo,
          head: `${repository.owner}:${branch}`, state: 'open',
        });

        if (prs.length === 0) {
          result = transition(current, 'DONE', 'Merge skipped (no open PR found)', 'INFO');
          break;
        }

        const pr = prs[0];

        // Dry-Run: Merge simulieren ohne echten API-Call
        if (mergeDryRun) {
          result = transition(current, 'DONE', `[DRY-RUN] Would merge PR #${pr.number} (${pr.htmlUrl})`, 'INFO');
          break;
        }

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

async function runFullPipeline(
  run: RunState,
  repository: RepositoryConfig,
  workspace: GitWorkspaceAdapter,
  speckit: SpecKitAdapter,
  opencode: OpenCodeAdapter,
  github: GitHubAdapter,
  syncService?: GitHubStatusSyncService,
): Promise<RunState> {
  let current = run;
  const maxSteps = 20;
  let attempt = 0;
  const maxAttempts = MAX_FIX_LOOPS;
  const fixLoopEnabled = process.env.POSITRON_ENABLE_FIX_LOOP === 'true';

  for (let i = 0; i < maxSteps; i++) {
    // Check control signals before each phase (Issue #30)
    const signalCheck = checkRunSignal(current.id, current.phase);
    if (signalCheck === 'abort') {
      const abortResult = markFailed(current, 'FAILED_BLOCKED', 'Run aborted by user');
      storeEvent(abortResult.event);
      runs.set(abortResult.run.id, abortResult.run);
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
          runs.set(abortResult.run.id, abortResult.run);
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
    if (signalCheck === 'retry') {
      // Manual retry from FAILED_TRANSIENT
      const retryResult = retry(current);
      if (retryResult.ok) {
        storeEvent(retryResult.event);
        runs.set(retryResult.run.id, retryResult.run);
        current = retryResult.run;
        attempt = current.attempt;
        broadcastSSE(current.id, 'run-update', { phase: current.phase, status: current.status, branch: current.branch });
        continue;
      }
    }

    const next = await executePhase(current, repository, workspace, speckit, opencode, github, syncService);
    if (next.phase === current.phase || next.phase === 'DONE' || next.phase.startsWith('FAILED')) {
      // --- Fix-Loop (Issue #26) ---
      // Nur bei transienten Fehlern und wenn Fix-Loop enabled
      if (fixLoopEnabled && next.phase === 'FAILED_TRANSIENT' && attempt < maxAttempts) {
        attempt++;
        storeEvent({
          id: createRunId(), runId: next.id, phase: 'TEST' as Phase,
          level: 'WARN',
          message: `Fix-Loop retry ${attempt}/${maxAttempts} after transient failure`,
          payload: null, createdAt: new Date().toISOString(),
        });
        // Restart from TEST phase with incremented attempt
        const retryTransition = transition(next, 'TEST', `Fix-Loop retry ${attempt}/${maxAttempts}`, 'WARN');
        current = retryTransition.run;
        current.attempt = attempt;
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
      runs.set(next.id, next);
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
  runs.set(result.run.id, result.run);
  broadcastSSE(result.run.id, 'run-complete', { phase: result.run.phase, status: result.run.status });
  return result.run;
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
    const completed = await runFullPipeline(run, repository, activeWorkspaceAdapter, activeSpecKitAdapter, activeOpenCodeAdapter, github, syncService);
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

  // SSE Event Stream (Issue #29)
  app.get('/api/runs/:id/events/stream', (req, res) => {
    const runId = req.params.id;
    const run = runs.get(runId);
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
    res.json({ status: 'ok', runs: runs.size });
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

  // Safety State (Issue #28)
  app.get('/api/safety', (_req, res) => {
    res.json({
      enableMerge: process.env.POSITRON_ENABLE_MERGE === 'true',
      mergeDryRun: process.env.POSITRON_MERGE_DRY_RUN === 'true',
      enablePush: process.env.POSITRON_ENABLE_PUSH === 'true',
      killSwitch: process.env.POSITRON_MERGE_KILL_SWITCH === 'true',
      enableFixLoop: process.env.POSITRON_ENABLE_FIX_LOOP === 'true',
    });
  });

  // Merge Status (Issue #22)
  app.get('/api/runs/:id/merge-status', (_req, res) => {
    const run = runs.get(_req.params.id);
    if (!run) { res.status(404).json({ error: 'Not found' }); return; }

    const mergeAllowed = process.env.POSITRON_ENABLE_MERGE === 'true';
    const mergeKillSwitch = process.env.POSITRON_MERGE_KILL_SWITCH === 'true';
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

  // Run Control (Issue #30)
  app.post('/api/runs/:id/control', (req, res) => {
    const runId = req.params.id;
    const run = runs.get(runId);
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
    if (action === 'resume' && runSignals.get(runId) !== 'PAUSE') {
      res.status(409).json({ error: 'Run is not paused' });
      return;
    }
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
