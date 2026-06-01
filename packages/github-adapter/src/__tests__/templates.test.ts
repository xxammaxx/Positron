import { describe, it, expect } from 'vitest';
import { renderAccepted, renderStatusUpdate, renderBlocked, renderDone } from '../templates.js';

describe('renderAccepted', () => {
  it('should include runId and issue number', () => {
    const out = renderAccepted('run-1', 42);
    expect(out).toContain('run-1');
    expect(out).toContain('#42');
    expect(out).toContain('accepted');
  });

  it('should include branch when provided', () => {
    const out = renderAccepted('run-1', 42, 'positron/issue-42-test');
    expect(out).toContain('positron/issue-42-test');
  });

  it('should not include branch section when undefined', () => {
    const out = renderAccepted('run-1', 42);
    expect(out).not.toContain('**Branch:**');
  });

  it('should not render "null" text when branch is undefined', () => {
    const out = renderAccepted('run-1', 42);
    expect(out).not.toContain('null');
    expect(out).not.toContain('undefined');
  });
});

describe('renderStatusUpdate', () => {
  it('should include phase and status', () => {
    const out = renderStatusUpdate('run-1', 'IMPLEMENT', 'active');
    expect(out).toContain('IMPLEMENT');
    expect(out).toContain('active');
    expect(out).toContain('Status Update');
  });

  it('should include branch when provided', () => {
    const out = renderStatusUpdate('run-1', 'TEST', 'passed', 'positron/issue-1-test');
    expect(out).toContain('positron/issue-1-test');
  });
});

describe('renderBlocked', () => {
  it('should include reason', () => {
    const out = renderBlocked('run-1', 'Push rejected');
    expect(out).toContain('blocked');
    expect(out).toContain('Push rejected');
  });
});

describe('renderDone', () => {
  it('should include summary', () => {
    const out = renderDone('run-1', 'All phases completed');
    expect(out).toContain('completed');
    expect(out).toContain('All phases completed');
  });

  it('should include branch when provided', () => {
    const out = renderDone('run-1', 'Done', 'positron/issue-99-fix');
    expect(out).toContain('positron/issue-99-fix');
  });

  it('should not render "null" text when branch is undefined', () => {
    const out = renderDone('run-1', 'Summary');
    expect(out).not.toContain('null');
    expect(out).not.toContain('undefined');
  });
});
