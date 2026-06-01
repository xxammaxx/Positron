import { describe, it, expect } from 'vitest';
import {
  buildOpenCodeRunCommand, buildOpenCodeContextMessage, buildOpenCodeVersionCommand,
  classifyOpenCodeResult,
} from '../build-opencode-command.js';
import type { OpenCodeRunInput } from '@positron/shared';

describe('buildOpenCodeRunCommand', () => {
  it('should build valid opencode run args', () => {
    const args = buildOpenCodeRunCommand('speckit.specify', 'specify', 'context');
    expect(args[0]).toBe('run');
    expect(args[1]).toBe('--command');
    expect(args[2]).toBe('speckit.specify');
    expect(args[3]).toBe('--format');
    expect(args[4]).toBe('json');
    expect(args[5]).toBe('context');
  });

  it('must NOT contain unsupported flags', () => {
    const args = buildOpenCodeRunCommand('speckit.specify', 'specify', 'msg');
    const joined = args.join(' ');
    expect(joined).not.toContain('--issue');
    expect(joined).not.toContain('--mode');
    expect(joined).not.toContain('--unsafe');
    expect(joined).not.toContain('--dangerous');
  });

  it('must NOT allow shell metacharacters as separate commands', () => {
    const args = buildOpenCodeRunCommand('cmd', 'phase', 'msg; rm -rf /');
    // The context message is a single argument — spawn passes it directly, no shell interpretation
    expect(args.length).toBe(6); // run, --command, cmd, --format, json, contextMsg
    // The shell metacharacters should be contained within the single arg
    const lastArg = args[args.length - 1];
    expect(lastArg).toContain(';');
    // Must NOT be executed as a separate command
    expect(args).not.toContain('bash');
    expect(args).not.toContain('-c');
  });
});

describe('buildOpenCodeContextMessage', () => {
  const baseInput: OpenCodeRunInput = {
    runId: 'r1', workspacePath: '/ws', issueTitle: 'Test Issue', issueNumber: 42, mode: 'safe-cli',
  };

  it('should include phase name and issue reference', () => {
    const msg = buildOpenCodeContextMessage('specify', baseInput);
    expect(msg).toContain('specify');
    expect(msg).toContain('#42');
    expect(msg).toContain('Test Issue');
  });

  it('should include issue body when present', () => {
    const input = { ...baseInput, issueBody: 'This is the issue description' };
    const msg = buildOpenCodeContextMessage('plan', input);
    expect(msg).toContain('issue description');
  });

  it('should NOT include issue body when absent', () => {
    const msg = buildOpenCodeContextMessage('tasks', baseInput);
    // Should not contain excessive whitespace from empty body
    expect(msg).toContain('tasks');
    expect(msg).not.toContain('undefined');
  });

  it('should truncate long titles', () => {
    const input = { ...baseInput, issueTitle: 'x'.repeat(1000) };
    const msg = buildOpenCodeContextMessage('analyze', input);
    // Only first 500 chars of title
    expect(msg.length).toBeLessThan(2000);
  });

  it('should handle missing issue number with ?', () => {
    const input = { ...baseInput, issueNumber: undefined };
    const msg = buildOpenCodeContextMessage('review', input);
    expect(msg).toContain('Issue ?');
  });

  it('should handle missing issueTitle with empty fallback', () => {
    const input = { ...baseInput, issueTitle: undefined as any };
    const msg = buildOpenCodeContextMessage('test', input);
    expect(msg).toBeTruthy();
    expect(msg).not.toContain('undefined');
  });
});

describe('buildOpenCodeVersionCommand', () => {
  it('should return --version', () => {
    expect(buildOpenCodeVersionCommand()).toEqual(['--version']);
  });
});

describe('classifyOpenCodeResult', () => {
  const baseResult = { exitCode: 0, stdout: '', stderr: '', durationMs: 100 };

  it('should classify exit 0 as success', () => {
    const r = classifyOpenCodeResult(baseResult, 'cmd', 'phase');
    expect(r.status).toBe('success');
  });

  it('should classify non-zero exit as failed', () => {
    const r = classifyOpenCodeResult({ ...baseResult, exitCode: 1, stderr: 'error' }, 'cmd', 'phase');
    expect(r.status).toBe('failed');
    expect(r.summary).toContain('error');
  });

  it('should classify null exit (timeout) as failed', () => {
    const r = classifyOpenCodeResult({ ...baseResult, exitCode: null }, 'cmd', 'phase');
    expect(r.status).toBe('failed');
    expect(r.summary).toContain('not executed');
  });

  it('should detect JSON error in stdout', () => {
    const stdout = '{"type":"error","error":{"data":{"message":"API error"}}}';
    const r = classifyOpenCodeResult({ ...baseResult, stdout }, 'cmd', 'phase');
    expect(r.status).toBe('failed');
    expect(r.hasJsonError).toBe(true);
    expect(r.errorMessage).toBe('API error');
  });
});
