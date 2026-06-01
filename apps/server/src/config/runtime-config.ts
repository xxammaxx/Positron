// Positron — Runtime Config Loading (extracted from index.ts)
// Pure functions for environment-based configuration resolution.

import type { GitHubAdapter } from '@positron/github-adapter';
import type { RepositoryConfig } from '@positron/shared';
import { FakeGitHubAdapter, createRealGitHubAdapter } from '@positron/github-adapter';
import { loadRepositoryConfig, normalizeRepositoryConfig } from '@positron/shared';

export type GitHubMode = 'fake' | 'real';

export interface GitHubAdapterResult {
  adapter: GitHubAdapter;
  mode: GitHubMode;
}

export function resolveAdapter(adapter?: GitHubAdapter, log?: { warn: (msg: string) => void }): GitHubAdapterResult {
  if (adapter) {
    return { adapter, mode: adapter instanceof FakeGitHubAdapter ? 'fake' : 'real' };
  }

  const mode = (process.env.POSITRON_GITHUB_MODE ?? process.env.GITHUB_MODE ?? 'fake') as GitHubMode;
  if (mode === 'real') {
    return { adapter: createRealGitHubAdapter(), mode: 'real' };
  }
  if (process.env.NODE_ENV === 'production' && log) {
    log.warn('PRODUCTION-MODE but POSITRON_GITHUB_MODE is not set to "real" — using fake adapter!');
    log.warn('Set POSITRON_GITHUB_MODE=real and configure GITHUB_TOKEN for production use.');
  }
  return { adapter: new FakeGitHubAdapter(), mode: 'fake' };
}

export function resolveRepositoryConfig(repository?: RepositoryConfig): RepositoryConfig {
  if (repository) {
    return normalizeRepositoryConfig(repository);
  }
  const loaded = loadRepositoryConfig(process.env);
  if (!loaded) {
    throw new Error('POSITRON_REPO_OWNER and POSITRON_REPO_NAME must be configured');
  }
  return loaded;
}
