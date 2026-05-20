import { describe, expect, test } from 'vitest';
import { TestRunner } from '../test-runner.js';
import type { DetectedTestCommand } from '../detector.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const runner = new TestRunner();

function makeCommand(overrides: Partial<DetectedTestCommand> = {}): DetectedTestCommand {
  return {
    id: 'cmd-1', kind: 'test', command: 'node',
    args: ['-e', 'process.exit(0)'], cwd: os.tmpdir(),
    source: 'package.json', scriptName: 'test',
    priority: 1, reason: 'test', estimatedRisk: 'low',
    ...overrides,
  };
}

describe('TestRunner', () => {
  test('PASS wenn alle Commands Exit 0', async () => {
    const report = await runner.runDetectedCommands({
      runId: 'r1', workspacePath: os.tmpdir(),
      commands: [makeCommand({ id: '1' })],
      mode: 'standard',
    });
    expect(report.status).toBe('PASS');
    expect(report.commands).toHaveLength(1);
    expect(report.commands[0].status).toBe('passed');
  });

  test('FAIL wenn ein Command Exit != 0', async () => {
    const report = await runner.runDetectedCommands({
      runId: 'r2', workspacePath: os.tmpdir(),
      commands: [makeCommand({ id: 'f', command: 'node', args: ['-e', 'process.exit(1)'] })],
      mode: 'standard',
    });
    expect(report.status).toBe('FAIL');
  });

  test('BLOCKED wenn keine Commands', async () => {
    const report = await runner.runDetectedCommands({
      runId: 'r3', workspacePath: os.tmpdir(),
      commands: [], mode: 'standard',
    });
    expect(report.status).toBe('BLOCKED');
  });

  test('BLOCKED bei Command-Timeout', async () => {
    const report = await runner.runDetectedCommands({
      runId: 'r4', workspacePath: os.tmpdir(),
      commands: [makeCommand({
        id: 'to', kind: 'test',
        command: 'node', args: ['-e', 'setTimeout(() => {}, 10000)'],
        priority: 1,
      })],
      mode: 'standard',
    });
    expect(report.status).toBe('BLOCKED');
  });

  test('Artifacts werden geschrieben', async () => {
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-'));
    const report = await runner.runDetectedCommands({
      runId: 'r5', workspacePath: ws,
      commands: [makeCommand({ id: 'art' })],
    });
    expect(report.artifactPath).toBeDefined();
    expect(fs.existsSync(report.artifactPath!)).toBe(true);
  });

  test('renderComment erzeugt Markdown', () => {
    const report = {
      runId: 'r6', workspacePath: '/tmp', status: 'PASS' as const,
      startedAt: '', finishedAt: '', commands: [], blockedReasons: [], summary: '',
    };
    const md = runner.renderComment(report);
    expect(md).toContain('## Positron Test Report');
    expect(md).toContain('PASS');
  });
});
