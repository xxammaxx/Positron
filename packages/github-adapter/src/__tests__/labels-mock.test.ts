import { describe, expect, test, vi } from 'vitest';
import { syncManagedLabels } from '../labels.js';
import type { Octokit } from '@octokit/rest';
import { RequestError } from '@octokit/request-error';

function mockOctokit(labels: string[] = []) {
  return {
    rest: {
      issues: {
        listLabelsOnIssue: vi.fn().mockResolvedValue({
          data: labels.map(name => ({ name })),
        }),
        addLabels: vi.fn().mockResolvedValue({}),
        removeLabel: vi.fn().mockResolvedValue({}),
      },
    },
  } as unknown as Octokit;
}

describe('syncManagedLabels — mocked Octokit', () => {
  test('fügt fehlende Labels hinzu', async () => {
    const octokit = mockOctokit([]);
    const result = await syncManagedLabels(octokit, 'o', 'r', 1, ['positron:running']);

    expect(result.added).toEqual(['positron:running']);
    expect(result.removed).toEqual([]);
    expect(octokit.rest.issues.addLabels).toHaveBeenCalled();
  });

  test('entfernt überschüssige positron:-Labels', async () => {
    const octokit = mockOctokit(['positron:ready', 'positron:running', 'bug']);
    const result = await syncManagedLabels(octokit, 'o', 'r', 1, ['positron:running']);

    expect(result.added).toEqual([]);
    expect(result.removed).toEqual(['positron:ready']);
    // 'bug' bleibt unberührt (kein positron:-Prefix)
    expect(octokit.rest.issues.addLabels).not.toHaveBeenCalled();
    expect(octokit.rest.issues.removeLabel).toHaveBeenCalledTimes(1);
  });

  test('keine Änderung bei gleichem Stand', async () => {
    const octokit = mockOctokit(['positron:running', 'bug']);
    const result = await syncManagedLabels(octokit, 'o', 'r', 1, ['positron:running']);

    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(octokit.rest.issues.addLabels).not.toHaveBeenCalled();
    expect(octokit.rest.issues.removeLabel).not.toHaveBeenCalled();
  });

  test('behandelt 404 beim Entfernen als harmlos', async () => {
    const octokit = mockOctokit(['positron:ready']);
    // removeLabel wirft 404 — Label existiert nicht mehr
    (octokit.rest.issues.removeLabel as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new RequestError('Not Found', 404, { request: { method: 'DELETE', url: '...', headers: {} } })
    );

    const result = await syncManagedLabels(octokit, 'o', 'r', 1, []);
    expect(result.removed).toEqual([]); // 404 → kein removed-Eintrag
  });

  test('propagiert nicht-404-Fehler beim Entfernen', async () => {
    const octokit = mockOctokit(['positron:ready']);
    (octokit.rest.issues.removeLabel as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new RequestError('Forbidden', 403, { request: { method: 'DELETE', url: '...', headers: {} } })
    );

    await expect(syncManagedLabels(octokit, 'o', 'r', 1, [])).rejects.toThrow('Forbidden');
  });
});
