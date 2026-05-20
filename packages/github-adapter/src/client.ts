// Positron — GitHub API Client Factory

import { Octokit } from '@octokit/rest';
import { retry } from '@octokit/plugin-retry';
import { throttling } from '@octokit/plugin-throttling';
import { redactSecrets, redactValue } from '@positron/shared';

const MyOctokit = Octokit.plugin(retry, throttling);

export interface GitHubClientOptions {
  token?: string;
  userAgent?: string;
}

/** Erstellt einen authentifizierten Octokit-Client mit Retry und Throttling. */
export function createGitHubClient(options: GitHubClientOptions = {}): Octokit {
  const token = options.token ?? process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN ist nicht gesetzt');

  const octokit = new MyOctokit({
    auth: token,
    userAgent: options.userAgent ?? 'positron-github-adapter/0.1.0',
    request: { retries: 2 },
    throttle: {
      onRateLimit(retryAfter: number, opts: { method: string; url: string }, client: Octokit, retryCount: number) {
        client.log.warn(`Rate limit: ${opts.method} ${opts.url}`);
        return retryCount < 2;
      },
      onSecondaryRateLimit(_retryAfter: number, opts: { method: string; url: string }, client: Octokit) {
        client.log.warn(`Secondary rate limit: ${opts.method} ${opts.url}`);
        return false;
      },
    },
  });

  return createSafeLogger(octokit);
}

/** Wrappt den Logger, sodass alle Log-Ausgaben (message + additionalInfo) redacted werden. */
export function createSafeLogger(octokit: Octokit): Octokit {
  const orig = octokit.log;

  function redactedLogArgs(msg: string, additionalInfo?: unknown): [string, string?] {
    const safeMsg = redactSecrets(msg);
    const safeInfo = additionalInfo !== undefined ? redactValue(additionalInfo) : undefined;
    return [safeMsg, safeInfo];
  }

  octokit.log = {
    info: (msg, info) => {
      const [m, i] = redactedLogArgs(msg, info);
      orig.info(m, i as object | undefined);
    },
    warn: (msg, info) => {
      const [m, i] = redactedLogArgs(msg, info);
      orig.warn(m, i as object | undefined);
    },
    error: (msg, info) => {
      const [m, i] = redactedLogArgs(msg, info);
      orig.error(m, i as object | undefined);
    },
    debug: (msg, info) => {
      const [m, i] = redactedLogArgs(msg, info);
      orig.debug(m, i as object | undefined);
    },
  } as Octokit['log'];

  return octokit;
}
