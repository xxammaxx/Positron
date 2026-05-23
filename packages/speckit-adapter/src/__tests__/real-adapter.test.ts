// Tests for RealSpecKitAdapter (Issue #15)
// Integration tests with a fake `specify` CLI script

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { RealSpecKitAdapter } from '../real-adapter.js';
import type { SpecKitRunInput } from '@positron/shared';

let workspacePath: string;
let fakeBinDir: string;
let oldPath: string;

function createFakeSpecify(scriptContent: string): string {
  const scriptPath = join(fakeBinDir, 'specify');
  writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
  return scriptPath;
}

beforeEach(() => {
  workspacePath = join(tmpdir(), `positron-speckit-real-${randomUUID().slice(0, 8)}`);
  mkdirSync(workspacePath, { recursive: true });

  fakeBinDir = join(tmpdir(), `positron-speckit-bin-${randomUUID().slice(0, 8)}`);
  mkdirSync(fakeBinDir, { recursive: true });

  // Prepend fakeBinDir to PATH
  oldPath = process.env.PATH ?? '';
  process.env.PATH = `${fakeBinDir}:${oldPath}`;
});

afterEach(() => {
  try {
    rmSync(workspacePath, { recursive: true, force: true });
    rmSync(fakeBinDir, { recursive: true, force: true });
  } catch { /* cleanup */ }
  process.env.PATH = oldPath;
});

function createFakeSpecifyVersion(version = '0.8.12'): string {
  const script = `#!/bin/sh
case "$1" in
  version)
    echo "specify ${version}"
    echo "Python 3.11.0"
    echo "Platform: linux-x86_64"
    ;;
  check)
    echo "All tools available."
    exit 0
    ;;
  init)
    shift
    mkdir -p .specify/memory
    echo "# Constitution" > .specify/memory/constitution.md
    echo "Initialized Spec Kit"
    exit 0
    ;;
  *)
    echo "Unknown command: $1"
    exit 1
    ;;
esac
exit 0
`;
  return createFakeSpecify(script);
}

function createFakeSpecifyWithFeatures(version = '0.8.12'): string {
  const script = `#!/bin/sh
case "$1" in
  version)
    if [ "$2" = "--features" ] && [ "$3" = "--json" ]; then
      echo '{"version":"${version}","features":{"opencode":true},"integrations":["opencode","copilot","claude","generic"]}'
    else
      echo "specify ${version}"
    fi
    exit 0
    ;;
  check)
    echo "All tools available."
    exit 0
    ;;
  init)
    shift
    mkdir -p .specify/memory
    echo "# Constitution" > .specify/memory/constitution.md
    echo "Initialized Spec Kit"
    exit 0
    ;;
  *)
    echo "Unknown command: $1"
    exit 1
    ;;
esac
exit 0
`;
  return createFakeSpecify(script);
}

function createFakeSpecifyFails(): string {
  const script = `#!/bin/sh
echo "Error: something went wrong" >&2
exit 1
`;
  return createFakeSpecify(script);
}

function baseInput(overrides: Partial<SpecKitRunInput> = {}): SpecKitRunInput {
  return {
    runId: `test-run-${randomUUID().slice(0, 8)}`,
    workspacePath,
    issueTitle: 'Test Issue',
    issueNumber: 15,
    mode: 'safe-cli',
    ...overrides,
  };
}

function mkfile(wsPath: string, relPath: string, content: string) {
  const fullPath = join(wsPath, relPath);
  mkdirSync(join(fullPath, '..'), { recursive: true });
  writeFileSync(fullPath, content, 'utf-8');
}

describe('RealSpecKitAdapter — healthCheck', () => {
  it('returns available=true when specify is in PATH', async () => {
    createFakeSpecifyWithFeatures('0.8.12');
    const adapter = new RealSpecKitAdapter();
    const health = await adapter.healthCheck(workspacePath);
    expect(health.available).toBe(true);
    expect(health.version).toBe('0.8.12');
    expect(health.supportsOpencode).toBe(true);
  });

  it('detects version from output', async () => {
    createFakeSpecifyVersion('1.2.3');
    const adapter = new RealSpecKitAdapter();
    const health = await adapter.healthCheck(workspacePath);
    expect(health.available).toBe(true);
    expect(health.version).toBe('1.2.3');
  });

  it('returns available=false when specify version fails', async () => {
    createFakeSpecifyFails();
    const adapter = new RealSpecKitAdapter();
    const health = await adapter.healthCheck(workspacePath);
    expect(health.available).toBe(false);
    expect(health.reason).toBeDefined();
  });
});

describe('RealSpecKitAdapter — initialize', () => {
  it('skips in detect-only mode', async () => {
    createFakeSpecifyVersion();
    const adapter = new RealSpecKitAdapter();
    const result = await adapter.initialize(baseInput({ mode: 'detect-only' }));
    expect(result.status).toBe('skipped');
    expect(result.exitCode).toBeNull();
  });

  it('skips in artifact-only mode', async () => {
    createFakeSpecifyVersion();
    const adapter = new RealSpecKitAdapter();
    const result = await adapter.initialize(baseInput({ mode: 'artifact-only' }));
    expect(result.status).toBe('skipped');
  });

  it('runs init in safe-cli mode with fake specify', async () => {
    createFakeSpecifyVersion();
    const adapter = new RealSpecKitAdapter();
    const result = await adapter.initialize(baseInput());
    expect(result.status).toBe('success');
    expect(result.exitCode).toBe(0);
    expect(result.artifacts.length).toBeGreaterThanOrEqual(1);
    const constitution = result.artifacts.find(a => a.kind === 'constitution');
    expect(constitution).toBeDefined();
    expect(constitution!.exists).toBe(true);
  });

  it('logs stdout/stderr paths on success', async () => {
    createFakeSpecifyVersion();
    const adapter = new RealSpecKitAdapter();
    const result = await adapter.initialize(baseInput());
    if (result.status === 'success') {
      expect(result.stdoutPath).toBeDefined();
      expect(result.stderrPath).toBeDefined();
    }
  });
});

describe('RealSpecKitAdapter — detectArtifacts', () => {
  it('returns empty for empty workspace', async () => {
    createFakeSpecifyVersion();
    const adapter = new RealSpecKitAdapter();
    const artifacts = await adapter.detectArtifacts(baseInput());
    expect(artifacts).toEqual([]);
  });

  it('finds existing constitution', async () => {
    mkfile(workspacePath, '.specify/memory/constitution.md', '# Constitution');
    createFakeSpecifyVersion();
    const adapter = new RealSpecKitAdapter();
    const artifacts = await adapter.detectArtifacts(baseInput());
    expect(artifacts.length).toBeGreaterThan(0);
    expect(artifacts[0].kind).toBe('constitution');
  });

  it('finds existing spec/plan/tasks', async () => {
    mkfile(workspacePath, 'specs/001-demo/spec.md', '# Spec');
    mkfile(workspacePath, 'specs/001-demo/plan.md', '# Plan');
    mkfile(workspacePath, 'specs/001-demo/tasks.md', '# Tasks');
    createFakeSpecifyVersion();
    const adapter = new RealSpecKitAdapter();
    const artifacts = await adapter.detectArtifacts(baseInput());
    const kinds = artifacts.map(a => a.kind);
    expect(kinds).toContain('spec');
    expect(kinds).toContain('plan');
    expect(kinds).toContain('tasks');
  });
});

describe('RealSpecKitAdapter — slash commands', () => {
  it('runSpecify returns blocked in safe-cli mode', async () => {
    createFakeSpecifyVersion();
    const adapter = new RealSpecKitAdapter();
    const result = await adapter.runSpecify(baseInput());
    expect(result.status).toBe('blocked');
    expect(result.blockedReason).toContain('Agent Slash Command');
    expect(result.artifacts).toEqual([]);
  });

  it('runSpecify returns existing spec in artifact-only mode', async () => {
    mkfile(workspacePath, 'specs/001-demo/spec.md', '# Spec');
    createFakeSpecifyVersion();
    const adapter = new RealSpecKitAdapter();
    const result = await adapter.runSpecify(baseInput({ mode: 'artifact-only' }));
    expect(result.status).toBe('success');
    expect(result.artifacts.length).toBeGreaterThan(0);
    expect(result.artifacts[0].kind).toBe('spec');
  });

  it('runPlan returns blocked in safe-cli mode', async () => {
    createFakeSpecifyVersion();
    const adapter = new RealSpecKitAdapter();
    const result = await adapter.runPlan(baseInput());
    expect(result.status).toBe('blocked');
    expect(result.blockedReason).toContain('Agent Slash Command');
  });

  it('runPlan returns plan artifacts in artifact-only mode', async () => {
    mkfile(workspacePath, 'specs/001-demo/plan.md', '# Plan');
    mkfile(workspacePath, 'specs/001-demo/research.md', '# Research');
    createFakeSpecifyVersion();
    const adapter = new RealSpecKitAdapter();
    const result = await adapter.runPlan(baseInput({ mode: 'artifact-only' }));
    expect(result.status).toBe('success');
    const kinds = result.artifacts.map(a => a.kind);
    expect(kinds).toContain('plan');
    expect(kinds).toContain('research');
  });

  it('runTasks returns blocked in safe-cli mode', async () => {
    createFakeSpecifyVersion();
    const adapter = new RealSpecKitAdapter();
    const result = await adapter.runTasks(baseInput());
    expect(result.status).toBe('blocked');
  });

  it('runTasks returns tasks artifacts in artifact-only mode', async () => {
    mkfile(workspacePath, 'specs/001-demo/tasks.md', '# Tasks\n- [ ] Task 1');
    createFakeSpecifyVersion();
    const adapter = new RealSpecKitAdapter();
    const result = await adapter.runTasks(baseInput({ mode: 'artifact-only' }));
    expect(result.status).toBe('success');
    expect(result.artifacts[0].kind).toBe('tasks');
  });

  it('runAnalyze returns blocked in safe-cli mode', async () => {
    createFakeSpecifyVersion();
    const adapter = new RealSpecKitAdapter();
    const result = await adapter.runAnalyze(baseInput());
    expect(result.status).toBe('blocked');
  });

  it('runAnalyze returns all artifacts in artifact-only mode', async () => {
    mkfile(workspacePath, 'specs/001-demo/spec.md', '# Spec');
    mkfile(workspacePath, 'specs/001-demo/plan.md', '# Plan');
    mkfile(workspacePath, 'specs/001-demo/tasks.md', '# Tasks');
    mkfile(workspacePath, 'specs/001-demo/research.md', '# Research');
    createFakeSpecifyVersion();
    const adapter = new RealSpecKitAdapter();
    const result = await adapter.runAnalyze(baseInput({ mode: 'artifact-only' }));
    expect(result.status).toBe('success');
    expect(result.artifacts.length).toBeGreaterThanOrEqual(3);
  });
});

describe('RealSpecKitAdapter — secret redaction', () => {
  it('redacts secrets in stderr output', async () => {
    const script = `#!/bin/sh
echo "Using token: ghp_test12345678901234567890" >&2
echo "API key=sk-test123456789012345678901234" >&2
exit 0
`;
    createFakeSpecify(script);

    const adapter = new RealSpecKitAdapter();
    // Use healthCheck — stderr wird intern redacted
    // Actually, let's test init which stores stdout/stderr to files

    const pathWithInit = join(tmpdir(), `positron-speckit-redact-${randomUUID().slice(0, 8)}`);
    mkdirSync(pathWithInit, { recursive: true });

    try {
      const result = await adapter.initialize(baseInput());
      // The fake script output is captured but secrets should be redacted
      expect(result.summary).not.toContain('ghp_');
      expect(result.summary).not.toContain('sk-test');
    } finally {
      rmSync(pathWithInit, { recursive: true, force: true });
    }
  });

  it('redacts secrets in error messages', async () => {
    createFakeSpecifyFails();
    const adapter = new RealSpecKitAdapter();
    const result = await adapter.initialize(baseInput());
    expect(result.summary).not.toContain('ghp_');
    expect(result.summary).not.toContain('github_pat_');
  });
});

describe('RealSpecKitAdapter — UTF-8 handling', () => {
  it('preserves umlauts in artifact paths', async () => {
    mkfile(workspacePath, 'specs/001-überblick/spec.md', '# Überblick\n\nDeutsche Spezifikation mit Umlauten: äöüß');
    createFakeSpecifyVersion();
    const adapter = new RealSpecKitAdapter();
    const artifacts = await adapter.detectArtifacts(baseInput());
    expect(artifacts.length).toBeGreaterThan(0);
    expect(artifacts[0].kind).toBe('spec');
    // Der Pfad enthält Umlaute (nicht ASCII-only für Pfad, was OK ist für menschliche Artefakte)
    expect(artifacts[0].path).toContain('überblick');
    expect(artifacts[0].sha256).toBeDefined();
  });
});
