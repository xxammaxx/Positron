// Tests for FakeSpecKitAdapter (Issue #15)

import { describe, it, expect, beforeEach } from 'vitest';
import { FakeSpecKitAdapter, FAKE_HEALTH_AVAILABLE, FAKE_HEALTH_UNAVAILABLE } from '../fake-adapter.js';
import type { SpecKitArtifactRef, SpecKitRunInput } from '@positron/shared';

const baseInput: SpecKitRunInput = {
  runId: 'test-run-1',
  workspacePath: '/tmp/test-workspace',
  issueTitle: 'Test Issue',
  issueNumber: 15,
  mode: 'safe-cli',
};

const detectOnlyInput: SpecKitRunInput = { ...baseInput, mode: 'detect-only' };
const artifactOnlyInput: SpecKitRunInput = { ...baseInput, mode: 'artifact-only' };

describe('FakeSpecKitAdapter — healthCheck', () => {
  it('returns available=true by default', async () => {
    const adapter = new FakeSpecKitAdapter();
    const health = await adapter.healthCheck('/tmp/test');
    expect(health.available).toBe(true);
    expect(health.version).toBe('0.8.12');
  });

  it('returns available=false when configured unavailable', async () => {
    const adapter = new FakeSpecKitAdapter();
    adapter.setUnavailable('CLI not found');
    const health = await adapter.healthCheck('/tmp/test');
    expect(health.available).toBe(false);
    expect(health.reason).toBe('CLI not found');
  });

  it('uses provided health in constructor', async () => {
    const adapter = new FakeSpecKitAdapter(FAKE_HEALTH_UNAVAILABLE);
    const health = await adapter.healthCheck('/tmp/test');
    expect(health.available).toBe(false);
  });

  it('setAvailable updates version', async () => {
    const adapter = new FakeSpecKitAdapter();
    adapter.setAvailable('1.2.3');
    const health = await adapter.healthCheck('/tmp/test');
    expect(health.version).toBe('1.2.3');
  });
});

describe('FakeSpecKitAdapter — initialize', () => {
  it('returns skipped in detect-only mode', async () => {
    const adapter = new FakeSpecKitAdapter();
    const result = await adapter.initialize(detectOnlyInput);
    expect(result.status).toBe('skipped');
    expect(result.exitCode).toBeNull();
  });

  it('returns skipped in artifact-only mode', async () => {
    const adapter = new FakeSpecKitAdapter();
    const result = await adapter.initialize(artifactOnlyInput);
    expect(result.status).toBe('skipped');
  });

  it('returns success in safe-cli mode', async () => {
    const adapter = new FakeSpecKitAdapter();
    const artifacts: SpecKitArtifactRef[] = [
      { kind: 'constitution', path: '.specify/memory/constitution.md', exists: true },
    ];
    adapter.setArtifacts(artifacts);

    const result = await adapter.initialize(baseInput);
    expect(result.status).toBe('success');
    expect(result.exitCode).toBe(0);
    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0].kind).toBe('constitution');
  });

  it('returns failed when initFails=true', async () => {
    const adapter = new FakeSpecKitAdapter();
    adapter.setInitFails(true);
    const result = await adapter.initialize(baseInput);
    expect(result.status).toBe('failed');
    expect(result.exitCode).toBe(1);
  });
});

describe('FakeSpecKitAdapter — detectArtifacts', () => {
  it('returns configured artifacts', async () => {
    const adapter = new FakeSpecKitAdapter();
    const artifacts: SpecKitArtifactRef[] = [
      { kind: 'spec', path: 'specs/001/spec.md', exists: true, sha256: 'abc123' },
      { kind: 'plan', path: 'specs/001/plan.md', exists: true, sha256: 'def456' },
    ];
    adapter.setArtifacts(artifacts);

    const result = await adapter.detectArtifacts(baseInput);
    expect(result).toHaveLength(2);
    expect(result[0].kind).toBe('spec');
    expect(result[1].kind).toBe('plan');
  });

  it('returns empty array when no artifacts configured', async () => {
    const adapter = new FakeSpecKitAdapter();
    const result = await adapter.detectArtifacts(baseInput);
    expect(result).toEqual([]);
  });
});

describe('FakeSpecKitAdapter — slash commands', () => {
  it('runSpecify returns blocked in safe-cli mode', async () => {
    const adapter = new FakeSpecKitAdapter();
    const result = await adapter.runSpecify(baseInput);
    expect(result.status).toBe('blocked');
    expect(result.artifacts).toEqual([]);
    expect(result.blockedReason).toContain('agent execution');
  });

  it('runSpecify returns existing spec artifacts in artifact-only mode', async () => {
    const adapter = new FakeSpecKitAdapter();
    const artifacts: SpecKitArtifactRef[] = [
      { kind: 'spec', path: 'specs/001/spec.md', exists: true },
    ];
    adapter.setArtifacts(artifacts);
    const result = await adapter.runSpecify(artifactOnlyInput);
    // In artifact-only, it should find matching artifacts
    expect(result.status).toBe('success');
    expect(result.artifacts.length).toBeGreaterThan(0);
    expect(result.artifacts[0].kind).toBe('spec');
  });

  it('runPlan returns blocked in safe-cli mode', async () => {
    const adapter = new FakeSpecKitAdapter();
    const result = await adapter.runPlan(baseInput);
    expect(result.status).toBe('blocked');
  });

  it('runTasks returns blocked in safe-cli mode', async () => {
    const adapter = new FakeSpecKitAdapter();
    const result = await adapter.runTasks(baseInput);
    expect(result.status).toBe('blocked');
  });

  it('runAnalyze returns blocked in safe-cli mode', async () => {
    const adapter = new FakeSpecKitAdapter();
    const result = await adapter.runAnalyze(baseInput);
    expect(result.status).toBe('blocked');
  });

  it('runSpecify returns skipped in detect-only mode when no artifacts', async () => {
    const adapter = new FakeSpecKitAdapter();
    const result = await adapter.runSpecify(detectOnlyInput);
    expect(result.status).toBe('skipped');
    expect(result.artifacts).toEqual([]);
  });
});

describe('FakeSpecKitAdapter — call log', () => {
  it('tracks command calls', async () => {
    const adapter = new FakeSpecKitAdapter();
    await adapter.healthCheck('/tmp');
    await adapter.runSpecify(baseInput);
    await adapter.runPlan(baseInput);

    const log = adapter.getCommandCallLog();
    expect(log).toContain('healthCheck');
    expect(log).toContain('runSpecify');
    expect(log).toContain('runPlan');
  });

  it('clearCallLog empties the log', async () => {
    const adapter = new FakeSpecKitAdapter();
    await adapter.healthCheck('/tmp');
    adapter.clearCallLog();
    expect(adapter.getCommandCallLog()).toEqual([]);
  });
});
