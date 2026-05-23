// Tests for Commit & Push Policy (Issue #19)
import { describe, it, expect } from 'vitest';
import {
  guardBranch, generateCommitMessage, evaluatePushPolicy, isValidPositronBranch,
} from '../commit-policy.js';

describe('guardBranch', () => {
  it('allows positron/issue-42', () => {
    expect(guardBranch('positron/issue-42').allowed).toBe(true);
  });
  it('allows positron/issue-42-fix-bug', () => {
    expect(guardBranch('positron/issue-42-fix-bug').allowed).toBe(true);
  });
  it('rejects main', () => {
    const r = guardBranch('main');
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain('Protected');
  });
  it('rejects master', () => {
    expect(guardBranch('master').allowed).toBe(false);
  });
  it('rejects develop', () => {
    expect(guardBranch('develop').allowed).toBe(false);
  });
  it('rejects empty', () => {
    expect(guardBranch('').allowed).toBe(false);
  });
  it('rejects random branch', () => {
    expect(guardBranch('feature/test').allowed).toBe(false);
  });
  it('rejects positron/main', () => {
    expect(guardBranch('positron/main').allowed).toBe(false);
  });
});

describe('generateCommitMessage', () => {
  it('generates with issue number', () => {
    const msg = generateCommitMessage({ issueNumber: 42, runId: 'abc123def456' });
    expect(msg).toContain('feat(issue-42)');
    expect(msg).toContain('Run: abc123de');
  });
  it('includes test result', () => {
    const msg = generateCommitMessage({ issueNumber: 42, runId: 'x', testResult: 'PASS' });
    expect(msg).toContain('Tests: PASS');
  });
});

describe('evaluatePushPolicy', () => {
  it('blocks when allow flag is false', () => {
    const r = evaluatePushPolicy('positron/issue-1', false, false);
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain('POSITRON_ENABLE_PUSH');
  });
  it('blocks main even with flag', () => {
    const r = evaluatePushPolicy('main', false, true);
    expect(r.allowed).toBe(false);
  });
  it('blocks force push', () => {
    const r = evaluatePushPolicy('positron/issue-1', true, true);
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain('Force');
  });
  it('allows valid branch with flag', () => {
    const r = evaluatePushPolicy('positron/issue-42', false, true);
    expect(r.allowed).toBe(true);
  });
});

describe('isValidPositronBranch', () => {
  it('true for positron/issue-1', () => expect(isValidPositronBranch('positron/issue-1')).toBe(true));
  it('false for main', () => expect(isValidPositronBranch('main')).toBe(false));
  it('false for feature/test', () => expect(isValidPositronBranch('feature/test')).toBe(false));
});
