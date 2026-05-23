// Tests for Spec Kit Artifact Scanner (Issue #15)

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { scanWorkspace, isPathSafe, computeSha256 } from '../artifact-scanner.js';
import type { SpecKitArtifactRef } from '@positron/shared';

let workspacePath: string;

beforeEach(() => {
  workspacePath = join(tmpdir(), `positron-speckit-test-${randomUUID().slice(0, 8)}`);
  mkdirSync(workspacePath, { recursive: true });
});

afterEach(() => {
  try { rmSync(workspacePath, { recursive: true, force: true }); } catch { /* cleanup */ }
});

function mkfile(relPath: string, content = 'test content') {
  const fullPath = join(workspacePath, relPath);
  mkdirSync(join(fullPath, '..'), { recursive: true });
  writeFileSync(fullPath, content, 'utf-8');
}

describe('scanWorkspace', () => {
  it('returns empty array for empty workspace', () => {
    const artifacts = scanWorkspace(workspacePath);
    expect(artifacts).toEqual([]);
  });

  it('detects constitution artifact', () => {
    mkfile('.specify/memory/constitution.md', '# Constitution');
    const artifacts = scanWorkspace(workspacePath);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].kind).toBe('constitution');
    expect(artifacts[0].exists).toBe(true);
    expect(artifacts[0].sha256).toBeDefined();
    expect(artifacts[0].sha256).toHaveLength(64);
  });

  it('detects spec artifact', () => {
    mkfile('specs/001-demo/spec.md', '# Spec\nFeature spec');
    const artifacts = scanWorkspace(workspacePath);
    expect(artifacts.length).toBeGreaterThanOrEqual(1);
    const spec = artifacts.find(a => a.kind === 'spec');
    expect(spec).toBeDefined();
    expect(spec!.path).toContain('spec.md');
    expect(spec!.sha256).toBeDefined();
  });

  it('detects plan artifact', () => {
    mkfile('specs/001-demo/plan.md', '# Plan');
    const artifacts = scanWorkspace(workspacePath);
    const plan = artifacts.find(a => a.kind === 'plan');
    expect(plan).toBeDefined();
    expect(plan!.path).toContain('plan.md');
  });

  it('detects tasks artifact', () => {
    mkfile('specs/001-demo/tasks.md', '# Tasks\n- [ ] Task 1');
    const artifacts = scanWorkspace(workspacePath);
    const tasks = artifacts.find(a => a.kind === 'tasks');
    expect(tasks).toBeDefined();
    expect(tasks!.path).toContain('tasks.md');
  });

  it('detects research artifact', () => {
    mkfile('specs/001-demo/research.md', '# Research');
    const artifacts = scanWorkspace(workspacePath);
    const research = artifacts.find(a => a.kind === 'research');
    expect(research).toBeDefined();
  });

  it('detects data-model artifact', () => {
    mkfile('specs/001-demo/data-model.md', '# Data Model');
    const artifacts = scanWorkspace(workspacePath);
    const dm = artifacts.find(a => a.kind === 'data-model');
    expect(dm).toBeDefined();
  });

  it('detects quickstart artifact', () => {
    mkfile('specs/001-demo/quickstart.md', '# Quickstart');
    const artifacts = scanWorkspace(workspacePath);
    const qs = artifacts.find(a => a.kind === 'quickstart');
    expect(qs).toBeDefined();
  });

  it('detects checklist artifact', () => {
    mkfile('specs/001-demo/checklists/requirements.md', '# Checklist');
    const artifacts = scanWorkspace(workspacePath);
    const cl = artifacts.find(a => a.kind === 'checklist');
    expect(cl).toBeDefined();
  });

  it('detects contract artifact', () => {
    mkfile('specs/001-demo/contracts/api.yaml', 'openapi: "3.0"');
    const artifacts = scanWorkspace(workspacePath);
    const ct = artifacts.find(a => a.kind === 'contract');
    expect(ct).toBeDefined();
  });

  it('detects multiple artifacts in a single scan', () => {
    mkfile('.specify/memory/constitution.md', '# Constitution');
    mkfile('specs/001-demo/spec.md', '# Spec');
    mkfile('specs/001-demo/plan.md', '# Plan');
    mkfile('specs/001-demo/tasks.md', '# Tasks');
    mkfile('specs/001-demo/research.md', '# Research');
    mkfile('specs/001-demo/checklists/requirements.md', '# Checklist');

    const artifacts = scanWorkspace(workspacePath);
    const kinds = artifacts.map(a => a.kind);

    expect(kinds).toContain('constitution');
    expect(kinds).toContain('spec');
    expect(kinds).toContain('plan');
    expect(kinds).toContain('tasks');
    expect(kinds).toContain('research');
    expect(kinds).toContain('checklist');
  });

  it('does not crash with missing specs directory', () => {
    // Workspace has no specs/ or .specify/ directories
    expect(() => scanWorkspace(workspacePath)).not.toThrow();
  });

  it('returns empty for non-existent workspace', () => {
    const nonExistent = join(tmpdir(), 'non-existent-' + randomUUID().slice(0, 8));
    const artifacts = scanWorkspace(nonExistent);
    expect(artifacts).toEqual([]);
  });

  it('sha256 is consistent for same content', () => {
    mkfile('specs/001-demo/spec.md', '# Same Content');
    const artifacts1 = scanWorkspace(workspacePath);
    const artifacts2 = scanWorkspace(workspacePath);
    expect(artifacts1[0].sha256).toBe(artifacts2[0].sha256);
  });

  it('sha256 differs for different content', () => {
    mkfile('specs/001-demo/spec.md', '# Content A');
    const a1 = scanWorkspace(workspacePath);

    // Create new workspace with different content
    const ws2 = join(tmpdir(), `positron-speckit-test-${randomUUID().slice(0, 8)}`);
    mkdirSync(ws2, { recursive: true });
    mkdirSync(join(ws2, 'specs/001-demo'), { recursive: true });
    writeFileSync(join(ws2, 'specs/001-demo/spec.md'), '# Content B', 'utf-8');

    const a2 = scanWorkspace(ws2);
    rmSync(ws2, { recursive: true, force: true });

    expect(a1[0].sha256).not.toBe(a2[0].sha256);
  });

  it('handles UTF-8 content with umlauts', () => {
    mkfile('specs/001-demo/spec.md', '# Spezifikation\n\n## Überblick\n\nDas ist eine deutsche Spezifikation mit Umlauten: äöüßÄÖÜ');
    const artifacts = scanWorkspace(workspacePath);
    expect(artifacts.length).toBeGreaterThan(0);
    expect(artifacts[0].kind).toBe('spec');
    expect(artifacts[0].sha256).toBeDefined();
  });
});

describe('isPathSafe', () => {
  it('returns true for paths within workspace', () => {
    expect(isPathSafe(workspacePath, join(workspacePath, 'specs'))).toBe(true);
    expect(isPathSafe(workspacePath, join(workspacePath, '.specify', 'memory'))).toBe(true);
  });

  it('returns false for paths outside workspace', () => {
    expect(isPathSafe(workspacePath, '/etc/passwd')).toBe(false);
    expect(isPathSafe(workspacePath, join(tmpdir(), 'other'))).toBe(false);
  });

  it('returns false for path traversal', () => {
    expect(isPathSafe(workspacePath, join(workspacePath, '..', '..', 'etc', 'passwd'))).toBe(false);
  });

  it('returns true for workspace path itself', () => {
    expect(isPathSafe(workspacePath, workspacePath)).toBe(true);
  });
});

describe('computeSha256', () => {
  it('returns hex string for readable file', () => {
    mkfile('test.txt', 'hello world');
    const hash = computeSha256(join(workspacePath, 'test.txt'));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns undefined for non-existent file', () => {
    const hash = computeSha256(join(workspacePath, 'does-not-exist.txt'));
    expect(hash).toBeUndefined();
  });
});
