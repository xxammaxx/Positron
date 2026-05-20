import { describe, expect, test } from 'vitest';
import { filterByLabel, isPullRequest } from '../issues.js';
import type { PolledIssue } from '../issues.js';

const makeIssue = (overrides: Partial<PolledIssue> = {}): PolledIssue => ({
  number: 1, title: 'Test', state: 'open', labels: [], updatedAt: '2020-01-01', url: 'https://example.com', ...overrides,
});

describe('filterByLabel', () => {
  test('findet Issues mit Label', () => {
    const issues = [makeIssue({ labels: ['bug'] }), makeIssue({ number: 2, labels: ['feature'] })];
    expect(filterByLabel(issues, 'bug')).toHaveLength(1);
  });

  test('leeres Array', () => {
    expect(filterByLabel([], 'bug')).toEqual([]);
  });

  test('kein Match', () => {
    const issues = [makeIssue({ labels: ['docs'] })];
    expect(filterByLabel(issues, 'bug')).toEqual([]);
  });
});

describe('isPullRequest', () => {
  test('normales Issue', () => {
    expect(isPullRequest({ number: 1, title: '', state: '', labels: [], updated_at: '', html_url: '' })).toBe(false);
  });

  test('Pull Request', () => {
    expect(isPullRequest({
      number: 1, title: '', state: '', labels: [], updated_at: '', html_url: '',
      pull_request: { url: '...' },
    })).toBe(true);
  });
});
