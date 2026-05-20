import { describe, expect, test } from 'vitest';
import { runCommand, GitCommandPolicyError } from '../command-runner.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tmpDir = path.join(os.tmpdir(), `positron-test-${Date.now()}`);
fs.mkdirSync(tmpDir, { recursive: true });

describe('CommandRunner', () => {
  test('git status ausführen', async () => {
    // Init tmp git repo
    const repoDir = path.join(tmpDir, 'test-repo');
    fs.mkdirSync(repoDir, { recursive: true });
    // Init muss ohne CommandRunner (git init ist erlaubt via init subcommand)
    await runCommand('git', ['init', '-b', 'main'], repoDir);
    
    const result = await runCommand('git', ['status'], repoDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('main');
  });

  test('verbotene Kommandos — push', async () => {
    await expect(runCommand('git', ['push'], tmpDir)).rejects.toThrow(GitCommandPolicyError);
  });

  test('verbotene Kommandos — commit', async () => {
    await expect(runCommand('git', ['commit'], tmpDir)).rejects.toThrow(GitCommandPolicyError);
  });

  test('Shell-Metacharacter blockiert', async () => {
    await expect(runCommand('git', ['status; rm -rf /'], tmpDir)).rejects.toThrow(GitCommandPolicyError);
  });

  test('git status in initialisiertem Repo', async () => {
    const repoDir = path.join(tmpDir, 'init-repo');
    fs.mkdirSync(repoDir, { recursive: true });
    await runCommand('git', ['init'], repoDir);
    const result = await runCommand('git', ['status'], repoDir, { timeoutMs: 5000 });
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
  });
});
