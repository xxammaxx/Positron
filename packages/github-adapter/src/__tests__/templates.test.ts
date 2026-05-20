import { describe, expect, test } from 'vitest';
import { renderAccepted, renderStatusUpdate, renderBlocked, renderDone } from '../templates.js';

describe('Comment Templates', () => {
  test('renderAccepted', () => {
    const body = renderAccepted('abc-123', 42);
    expect(body).toContain('## Positron Run Accepted');
    expect(body).toContain('`abc-123`');
    expect(body).toContain('#42');
    expect(body).toContain('GitHub issue claimed.');
  });

  test('renderStatusUpdate', () => {
    const body = renderStatusUpdate('run-1', 'IMPLEMENT', 'active', 'Tests passed');
    expect(body).toContain('## Positron Run Update');
    expect(body).toContain('`IMPLEMENT`');
    expect(body).toContain('`active`');
    expect(body).toContain('Tests passed');
  });

  test('renderBlocked without evidence', () => {
    const body = renderBlocked('run-x', 'TEST', 'Tests failed');
    expect(body).toContain('## Positron Blocked');
    expect(body).toContain('Tests failed');
    expect(body).not.toContain('### Evidence');
  });

  test('renderBlocked with evidence', () => {
    const body = renderBlocked('run-x', 'TEST', 'Tests failed', '- Log: test.log');
    expect(body).toContain('### Evidence');
    expect(body).toContain('- Log: test.log');
  });

  test('renderDone', () => {
    const body = renderDone('final-1', '- PR: #5');
    expect(body).toContain('## Positron Done');
    expect(body).toContain('Completed.');
    expect(body).toContain('- PR: #5');
  });
});
