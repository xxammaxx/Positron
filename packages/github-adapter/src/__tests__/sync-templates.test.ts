import { describe, expect, test } from 'vitest';
import {
  renderSyncAccepted, renderSyncPhaseUpdate, renderSyncTestReport,
  renderSyncBlocked, renderSyncFailed, renderSyncDone,
  syncMarker, truncateComment,
} from '../sync-templates.js';
import { redactSecrets } from '@positron/shared';

describe('syncMarker', () => {
  test('erzeugt korrekten HTML-Marker', () => {
    const m = syncMarker('run-1', 'TEST', 'test-report');
    expect(m).toBe('<!-- positron:run=run-1;phase=TEST;kind=test-report -->');
  });
});

describe('Sync Templates', () => {
  test('Accepted enthält Marker', () => {
    const body = renderSyncAccepted('abc', 42, 'positron/issue-42-test');
    expect(body).toContain('positron:run=abc;phase=CLAIMED;kind=accepted');
    expect(body).toContain('`abc`');
    expect(body).toContain('#42');
  });

  test('Phase Update enthält Marker', () => {
    const body = renderSyncPhaseUpdate('r1', 'REPO_SYNC', 'active', 'Workspace ready');
    expect(body).toContain('phase=REPO_SYNC;kind=phase-update');
    expect(body).toContain('`REPO_SYNC`');
  });

  test('Blocked enthält Reason', () => {
    const body = renderSyncBlocked('r1', 'TEST', 'No package.json', '- Log');
    expect(body).toContain('kind=blocked');
    expect(body).toContain('No package.json');
    expect(body).toContain('- Log');
  });

  test('Failed enthält Reason', () => {
    const body = renderSyncFailed('r1', 'TEST', 'Tests failed');
    expect(body).toContain('kind=failed');
    expect(body).toContain('Tests failed');
  });

  test('Done enthält Evidence', () => {
    const body = renderSyncDone('r1', '- Test: passed', 'positron/issue-1-test');
    expect(body).toContain('kind=done');
    expect(body).toContain('- Test: passed');
  });
});

describe('truncateComment', () => {
  test('kürzt zu langen Text', () => {
    const long = 'x'.repeat(30_000);
    const truncated = truncateComment(long, 100);
    expect(truncated.length).toBeLessThan(200);
  });

  test('behält kurzen Text', () => {
    expect(truncateComment('short', 1_000)).toBe('short');
  });
});
