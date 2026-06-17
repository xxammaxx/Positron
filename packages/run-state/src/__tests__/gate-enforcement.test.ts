/**
 * Red/Green Tests: #246 GateType Runtime Enforcement in Pipeline Loop
 *
 * Verifies:
 * - pre_write without evidence blocks commit phase
 * - pre_pr without evidence/reviewer blocks PR phase
 * - pre_merge without human approval blocks merge
 * - security fail cannot be overridden by human approval
 * - Missing gate data cannot become pass
 * - Blocked gate prevents phase transition
 * - CLEANUP runs after DONE, FAILED_BLOCKED, FAILED_UNSAFE
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createRun,
  transition,
  canTransition,
  registerGateEvaluator,
  clearGateEvaluators,
  evaluateGates,
  getRequiredGatesForPhase,
  registerWorkspaceCleanup,
  runCleanup,
  getWorkspaceCleanupFn,
  tryTransitionWithGates,
  VALID_TRANSITIONS,
} from '../state-machine.js';
import type { RunState, GateEvaluator } from '../state-machine.js';
import type { GateType, GateResult } from '@positron/shared';

describe('#246 GateType Runtime Enforcement', () => {
  let run: RunState;

  beforeEach(() => {
    run = createRun('test-repo', 42, 2);
    clearGateEvaluators();
  });

  afterEach(() => {
    clearGateEvaluators();
  });

  describe('Gate evaluator registration', () => {
    it('registerGateEvaluator adds evaluator', async () => {
      const evaluator: GateEvaluator = () => ({
        gate: 'pre_write' as GateType,
        passed: true,
        blocking: false,
        reason: 'ok',
        evaluatedAt: new Date().toISOString(),
      });
      registerGateEvaluator('pre_write', evaluator);

      const result = await evaluateGates(['pre_write'], run);
      expect(result.allPassed).toBe(true);
      expect(result.gates).toHaveLength(1);
      expect(result.gates[0]?.gate).toBe('pre_write');
    });

    it('missing evaluator produces blocking fail', async () => {
      const result = await evaluateGates(['security'], run);
      expect(result.allPassed).toBe(false);
      expect(result.blockingFailures).toBe(1);
      const gateResult = result.gates[0];
      expect(gateResult).toBeDefined();
      expect(gateResult!.passed).toBe(false);
      expect(gateResult!.blocking).toBe(true);
      expect(gateResult!.reason).toContain('No evaluator registered');
    });
  });

  describe('Phase gate requirements', () => {
    it('COMMIT requires pre_write and evidence_required gates', () => {
      const gates = getRequiredGatesForPhase('COMMIT');
      expect(gates).toContain('pre_write');
      expect(gates).toContain('evidence_required');
    });

    it('PR_CREATE requires pre_pr and evidence_required gates', () => {
      const gates = getRequiredGatesForPhase('PR_CREATE');
      expect(gates).toContain('pre_pr');
      expect(gates).toContain('evidence_required');
    });

    it('MERGE requires pre_merge, security, and human_approval gates', () => {
      const gates = getRequiredGatesForPhase('MERGE');
      expect(gates).toContain('pre_merge');
      expect(gates).toContain('security');
      expect(gates).toContain('human_approval');
    });

    it('QUEUED has no gate requirements', () => {
      const gates = getRequiredGatesForPhase('QUEUED');
      expect(gates).toEqual([]);
    });
  });

  describe('Transition blocked by missing gate evaluators', () => {
    it('transition to COMMIT is blocked when gate evaluators missing', async () => {
      run.phase = 'VERIFY';
      const result = await tryTransitionWithGates(run, 'COMMIT', 'test commit');
      expect(result.ok).toBe(false);
      expect(result.event.message).toContain('Gate enforcement failed');
    });

    it('transition to MERGE is blocked when evaluators missing', async () => {
      run.phase = 'PR_CREATE';
      const result = await tryTransitionWithGates(run, 'MERGE', 'test merge');
      expect(result.ok).toBe(false);
      expect(result.event.message).toContain('Gate enforcement failed');
    });
  });

  describe('Gate evaluation with registered evaluators', () => {
    it('passing gate allows transition', async () => {
      registerGateEvaluator('pre_write', () => ({
        gate: 'pre_write' as GateType,
        passed: true,
        blocking: false,
        reason: 'all checks passed',
        evaluatedAt: new Date().toISOString(),
      }));
      registerGateEvaluator('evidence_required', () => ({
        gate: 'evidence_required' as GateType,
        passed: true,
        blocking: false,
        reason: 'evidence present',
        evaluatedAt: new Date().toISOString(),
      }));

      run.phase = 'VERIFY';
      const result = await tryTransitionWithGates(run, 'COMMIT', 'test commit');
      expect(result.ok).toBe(true);
    });

    it('blocking gate failure prevents transition when pre-checked', async () => {
      registerGateEvaluator('pre_write', () => ({
        gate: 'pre_write' as GateType,
        passed: false,
        blocking: true,
        reason: 'tests failed',
        evaluatedAt: new Date().toISOString(),
      }));
      registerGateEvaluator('evidence_required', () => ({
        gate: 'evidence_required' as GateType,
        passed: true,
        blocking: false,
        reason: 'evidence present',
        evaluatedAt: new Date().toISOString(),
      }));

      const gateResult = await evaluateGates(['pre_write', 'evidence_required'], run);
      expect(gateResult.allPassed).toBe(false);
      expect(gateResult.blockingFailures).toBe(1);
    });

    it('security fail cannot be overridden by human approval gate passing', async () => {
      registerGateEvaluator('security', () => ({
        gate: 'security' as GateType,
        passed: false,
        blocking: true,
        reason: 'secret scan failed',
        evaluatedAt: new Date().toISOString(),
      }));
      registerGateEvaluator('human_approval', () => ({
        gate: 'human_approval' as GateType,
        passed: true,
        blocking: false,
        reason: 'approved',
        evaluatedAt: new Date().toISOString(),
      }));
      registerGateEvaluator('pre_merge', () => ({
        gate: 'pre_merge' as GateType,
        passed: true,
        blocking: false,
        reason: 'CI green',
        evaluatedAt: new Date().toISOString(),
      }));

      const result = await evaluateGates(['pre_merge', 'security', 'human_approval'], run);
      expect(result.allPassed).toBe(false);
      expect(result.blockingFailures).toBe(1);
    });
  });

  describe('Gate evaluator error handling', () => {
    it('evaluator that throws produces blocking fail', async () => {
      registerGateEvaluator('pre_write', () => {
        throw new Error('evaluator crash');
      });

      const result = await evaluateGates(['pre_write'], run);
      expect(result.allPassed).toBe(false);
      const gateResult = result.gates[0];
      expect(gateResult).toBeDefined();
      expect(gateResult!.passed).toBe(false);
      expect(gateResult!.blocking).toBe(true);
      expect(gateResult!.reason).toContain('evaluator crash');
    });
  });
});

describe('#244 CLEANUP Transition Integration', () => {
  it('VALID_TRANSITIONS: DONE → CLEANUP', () => {
    expect(VALID_TRANSITIONS['DONE']).toContain('CLEANUP');
  });

  it('VALID_TRANSITIONS: FAILED_BLOCKED → CLEANUP', () => {
    expect(VALID_TRANSITIONS['FAILED_BLOCKED']).toContain('CLEANUP');
  });

  it('VALID_TRANSITIONS: FAILED_UNSAFE → CLEANUP', () => {
    expect(VALID_TRANSITIONS['FAILED_UNSAFE']).toContain('CLEANUP');
  });

  it('CLEANUP is a terminal phase', () => {
    expect(VALID_TRANSITIONS['CLEANUP']).toEqual([]);
  });

  it('transition to CLEANUP from DONE succeeds', () => {
    const run = createRun('repo', 1, 2);
    run.phase = 'DONE';
    run.workspacePath = '/tmp/test-ws';

    const result = transition(run, 'CLEANUP', 'cleaning up');
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('CLEANUP');
  });

  it('transition to CLEANUP from FAILED_BLOCKED succeeds', () => {
    const run = createRun('repo', 1, 2);
    run.phase = 'FAILED_BLOCKED';
    run.workspacePath = '/tmp/test-ws';

    const result = transition(run, 'CLEANUP', 'cleaning up');
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('CLEANUP');
  });

  it('transition to CLEANUP from FAILED_UNSAFE succeeds', () => {
    const run = createRun('repo', 1, 2);
    run.phase = 'FAILED_UNSAFE';
    run.workspacePath = '/tmp/test-ws';

    const result = transition(run, 'CLEANUP', 'cleaning up');
    expect(result.ok).toBe(true);
    expect(result.run.phase).toBe('CLEANUP');
  });

  it('workspace cleanup function can be registered', () => {
    let cleaned = false;
    registerWorkspaceCleanup(async (_path, _id) => {
      cleaned = true;
      return { cleaned: true };
    });

    const fn = getWorkspaceCleanupFn();
    expect(fn).not.toBeNull();
  });

  it('runCleanup handles missing workspace path gracefully', async () => {
    registerWorkspaceCleanup(async (_path, _id) => ({
      cleaned: true,
    }));

    const run = createRun('repo', 1, 2);
    run.workspacePath = null;

    const result = await runCleanup(run);
    expect(result.cleaned).toBe(true);
    expect(result.reason).toContain('No workspace path');
  });
});
