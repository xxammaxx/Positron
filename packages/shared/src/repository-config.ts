// Positron — Repository Configuration (Issue #13: Owner Config)

/**
 * Repository configuration for Positron runtime.
 * Replaces hardcoded owner/repo assumptions.
 */
export interface RepositoryConfig {
  /** Repository owner (GitHub user or organization) */
  owner: string;
  /** Default repository name (may be overridden per-run) */
  repo: string;
  /** Optional default branch for workspace preparation */
  defaultBranch?: string;
  /** Optional remote URL; auto-constructed from owner/repo if not set */
  remoteUrl?: string;
}

/**
 * Runtime configuration used by the server and live E2E harness.
 */
export interface PositronRuntimeConfig {
  githubMode: 'fake' | 'real';
  githubTokenPresent: boolean;
  repository: RepositoryConfig;
  workspaceRoot?: string;
}

/**
 * Validation pattern for GitHub owner names.
 * Alphanumeric, dots, underscores, hyphens. No slashes, no path traversal.
 */
const OWNER_PATTERN = /^[A-Za-z0-9_.-]+$/;

/**
 * Validation pattern for GitHub repo names.
 * Alphanumeric, dots, underscores, hyphens. No slashes, no path traversal.
 */
const REPO_PATTERN = /^[A-Za-z0-9_.-]+$/;

/**
 * Load repository configuration from environment variables.
 *
 * Required env vars:
 *   POSITRON_REPO_OWNER — GitHub owner (user or org)
 *   POSITRON_REPO_NAME  — Default repository name
 *
 * Optional:
 *   POSITRON_REPO_REMOTE_URL — Custom remote URL (auto-constructed if omitted)
 *
 * Returns null if required env vars are not set — caller should handle this.
 */
export function loadRepositoryConfig(
  env: Record<string, string | undefined> = process.env,
): RepositoryConfig | null {
  const owner = trimEnv(env['POSITRON_REPO_OWNER']);
  const repo = trimEnv(env['POSITRON_REPO_NAME']);

  if (!owner || !repo) return null;

  try {
    return normalizeRepositoryConfig({
      owner,
      repo,
      defaultBranch: trimEnv(env['POSITRON_REPO_DEFAULT_BRANCH']),
      remoteUrl: trimEnv(env['POSITRON_REPO_REMOTE_URL']),
    });
  } catch {
    return null;
  }
}

/**
 * Load runtime configuration from environment variables.
 */
export function loadPositronRuntimeConfig(
  env: Record<string, string | undefined> = process.env,
): PositronRuntimeConfig | null {
  const repository = loadRepositoryConfig(env);
  if (!repository) return null;

  return {
    githubMode: env['GITHUB_MODE'] === 'real' ? 'real' : 'fake',
    githubTokenPresent: Boolean(trimEnv(env['GITHUB_TOKEN'])),
    repository,
    workspaceRoot: trimEnv(env['POSITRON_WORKSPACE_ROOT']) ?? undefined,
  };
}

/**
 * Normalize and validate an explicit repository config object.
 */
export function normalizeRepositoryConfig(config: RepositoryConfig): RepositoryConfig {
  const owner = config.owner.trim();
  const repo = config.repo.trim();

  if (!isValidOwner(owner) || !isValidRepo(repo)) {
    throw new Error(`Invalid owner/repo: ${config.owner}/${config.repo}`);
  }

  const defaultBranch = trimEnv(config.defaultBranch);
  const remoteUrl = trimEnv(config.remoteUrl) ?? buildRemoteUrl(owner, repo);
  const normalized: RepositoryConfig = { owner, repo, remoteUrl };
  if (defaultBranch) {
    normalized.defaultBranch = defaultBranch;
  }
  return normalized;
}

/**
 * Validate a GitHub owner name against allowed characters.
 * Rejects empty strings, path separators, and URL-like values.
 */
export function isValidOwner(value: string): boolean {
  if (!value || value.length === 0) return false;
  if (value.includes('/') || value.includes('\\')) return false;
  if (value.includes('..')) return false;
  if (value.startsWith('.') || value.startsWith('-')) return false;
  return OWNER_PATTERN.test(value);
}

/**
 * Validate a GitHub repo name against allowed characters.
 */
export function isValidRepo(value: string): boolean {
  if (!value || value.length === 0) return false;
  if (value.includes('/') || value.includes('\\')) return false;
  if (value.includes('..')) return false;
  if (value.startsWith('.') || value.startsWith('-')) return false;
  return REPO_PATTERN.test(value);
}

/**
 * Build a remote URL from owner and repo name.
 * Safe against injection — validates inputs first.
 */
export function buildRemoteUrl(owner: string, repo: string): string {
  if (!isValidOwner(owner) || !isValidRepo(repo)) {
    throw new Error(`Invalid owner/repo: ${owner}/${repo}`);
  }
  return `https://github.com/${owner}/${repo}.git`;
}

function trimEnv(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
