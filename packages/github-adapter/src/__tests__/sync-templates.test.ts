import { describe, it, expect } from 'vitest';
import {
  syncMarker, renderSyncAccepted, renderSyncPhaseUpdate, renderSyncTestReport,
  renderSyncBlocked, renderSyncFailed, renderSyncDone, renderSyncPrCreated,
  renderSyncMerged, truncateComment, renderEvidenceSection, renderLlmMetadataSection,
} from '../sync-templates.js';
import type { TestReport, EvidenceItem } from '@positron/shared';

describe('syncMarker', () => {
  it('should produce HTML comment with runId, phase, kind', () => {
    const m = syncMarker('run-1', 'IMPLEMENT', 'test');
    expect(m).toContain('run=run-1');
    expect(m).toContain('phase=IMPLEMENT');
    expect(m).toContain('kind=test');
    expect(m).toMatch(/^<!-- /);
    expect(m).toMatch(/ -->$/);
  });
});

describe('renderSyncAccepted', () => {
  it('should include marker, runId, issue', () => {
    const out = renderSyncAccepted('r1', 42);
    expect(out).toContain('r1');
    expect(out).toContain('#42');
    expect(out).toContain('positron:run=r1');
  });
  it('should include branch when provided', () => {
    const out = renderSyncAccepted('r1', 1, 'positron/issue-1-test');
    expect(out).toContain('positron/issue-1-test');
  });
});

describe('renderSyncPhaseUpdate', () => {
  it('should include phase and status', () => {
    const out = renderSyncPhaseUpdate('r1', 'IMPLEMENT', 'active', 'Working on it');
    expect(out).toContain('IMPLEMENT');
    expect(out).toContain('active');
    expect(out).toContain('Working on it');
  });

  it('should omit message when not provided', () => {
    const out = renderSyncPhaseUpdate('r1', 'TEST', 'passed', '');
    expect(out).toContain('TEST');
    expect(out).not.toContain('**Message:**');
  });
});

describe('renderSyncTestReport', () => {
  const report: TestReport = { status: 'passed', summary: 'OK', passed: 5, failed: 0, total: 5, durationMs: 100 };
  it('should include passed icon', () => {
    const out = renderSyncTestReport('r1', report);
    expect(out).toContain('✅');
    expect(out).toContain('5');
  });

  it('should include failed icon for failed status', () => {
    const out = renderSyncTestReport('r1', { ...report, status: 'failed', failed: 3 });
    expect(out).toContain('❌');
  });

  it('should include skip icon for skipped status', () => {
    const out = renderSyncTestReport('r1', { ...report, status: 'skipped' });
    expect(out).toContain('⏭️');
  });

  it('should include branch when provided', () => {
    const out = renderSyncTestReport('r1', report, 'positron/issue-42');
    expect(out).toContain('positron/issue-42');
  });
});

describe('renderSyncBlocked', () => {
  it('should include reason', () => {
    const out = renderSyncBlocked('r1', 'COMMIT', 'Push rejected');
    expect(out).toContain('Blocked');
    expect(out).toContain('Push rejected');
  });

  it('should include evidence when provided', () => {
    const out = renderSyncBlocked('r1', 'TEST', 'Tests failed', 'Evidence log attached');
    expect(out).toContain('Evidence log attached');
  });
});

describe('renderSyncFailed', () => {
  it('should include reason and phase', () => {
    const out = renderSyncFailed('r1', 'TEST', 'Tests failed');
    expect(out).toContain('Failed');
    expect(out).toContain('Tests failed');
  });

  it('should include evidence when provided', () => {
    const out = renderSyncFailed('r1', 'TEST', 'Error', 'Stack trace available');
    expect(out).toContain('Stack trace available');
  });
});

describe('renderSyncDone', () => {
  it('should include evidence', () => {
    const out = renderSyncDone('r1', 'All tests passed');
    expect(out).toContain('Completed');
    expect(out).toContain('All tests passed');
  });

  it('should include branch when provided', () => {
    const out = renderSyncDone('r1', 'Done', 'positron/issue-42');
    expect(out).toContain('positron/issue-42');
  });

  it('should handle missing evidence (?? fallback)', () => {
    const out = renderSyncDone('r1');
    expect(out).toContain('Completed');
  });
});

describe('renderSyncPrCreated', () => {
  it('should include optional fields when provided', () => {
    const out = renderSyncPrCreated('r1', 123, 'https://github.com/x/y/pull/123', 'branch', 42);
    expect(out).toContain('#123');
    expect(out).toContain('https://github.com');
    expect(out).toContain('branch');
    expect(out).toContain('#42');
  });
  it('should not include null optional fields', () => {
    const out = renderSyncPrCreated('r1');
    expect(out).not.toContain('**PR:**');
    expect(out).not.toContain('**Closes:**');
  });
});

describe('renderSyncMerged', () => {
  it('should include PR info when provided', () => {
    const out = renderSyncMerged('r1', 456, 'https://github.com/x/y/pull/456', 'abc123');
    expect(out).toContain('#456');
    expect(out).toContain('abc123');
  });
  it('should not include null fields', () => {
    const out = renderSyncMerged('r1');
    expect(out).not.toContain('**PR:**');
    expect(out).not.toContain('**Branch/SHA:**');
  });
});

describe('truncateComment', () => {
  it('should not truncate short bodies', () => {
    expect(truncateComment('short')).toBe('short');
  });
  it('should truncate long bodies', () => {
    const long = 'x'.repeat(70000);
    const out = truncateComment(long);
    expect(out.length).toBeLessThanOrEqual(64000 + 20);
    expect(out).toContain('truncated');
  });
  it('should handle custom maxLength', () => {
    const out = truncateComment('hello world', 5);
    expect(out).toBe('hello\n\n<!-- truncated -->');
  });
});

describe('renderEvidenceSection', () => {
  it('should return empty for no evidence', () => {
    expect(renderEvidenceSection([], 'r1')).toBe('');
  });
  it('should render table with status icons', () => {
    const items: EvidenceItem[] = [
      { kind: 'test', status: 'pass', summary: 'All passed' },
      { kind: 'lint', status: 'fail', summary: 'Lint errors' },
    ];
    const out = renderEvidenceSection(items, 'r1');
    expect(out).toContain('✅');
    expect(out).toContain('❌');
    expect(out).toContain('Evidence');
  });

  it('should render blocked and skipped icons', () => {
    const items: EvidenceItem[] = [
      { kind: 'build', status: 'blocked', summary: 'Blocked by policy' },
      { kind: 'deploy', status: 'skipped', summary: 'Skipped' },
    ];
    const out = renderEvidenceSection(items, 'r1');
    expect(out).toContain('🚫');
    expect(out).toContain('⏭️');
  });
});

describe('renderLlmMetadataSection', () => {
  it('should return empty string (stub)', () => {
    expect(renderLlmMetadataSection([], 'r1')).toBe('');
  });
});
