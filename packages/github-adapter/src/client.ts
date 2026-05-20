// Positron — GitHub API Client Factory

import { Octokit } from '@octokit/rest';
import { retry } from '@octokit/plugin-retry';
import { throttling } from '@octokit/plugin-throttling';
import { redactSecrets } from '@positron/shared';

const MyOctokit = Octokit.plugin(retry, throttling);

export interface GitHubClientOptions {
  token?: string;
  userAgent?: string;
}

/** Erstellt einen authentifizierten Octokit-Client mit Retry und Throttling. */
export function createGitHubClient(options: GitHubClientOptions = {}): Octokit {
  const token = options.token ?? process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN ist nicht gesetzt');

  return new MyOctokit({
    auth: token,
    userAgent: options.userAgent ?? 'positron-github-adapter/0.1.0',
    request: {
      retries: 2,
    },
    throttle: {
      onRateLimit: (retryAfter: number, opts: Record<string, unknown>, client: Octokit, retryCount: number) => {
        client.log.warn(`GitHub rate limit: ${String(opts.method ?? '?')} ${String(opts.url ?? '?')}`);
        return retryCount < 2;
      },
      onSecondaryRateLimit: (retryAfter: number, opts: Record<string, unknown>, client: Octokit) => {
        client.log.warn(`GitHub secondary rate limit: ${String(opts.method ?? '?')} ${String(opts.url ?? '?')}`);
        return false;
      },
    },
  });
}

/** Erstellt einen sicheren Logger, der Secrets redactet. */
export function createSafeLogger(octokit: Octokit): Octokit {
  const orig = octokit.log;
  const s = (msg: string) => redactSecrets(msg);
  const info = (msg: string, data?: object) => orig.info(s(msg), data);
  const warn = (msg: string, data?: object) => orig.warn(s(msg), data);
  const error = (msg: string, data?: object) => orig.error(s(msg), data);
  const debug = (msg: string, data?: object) => orig.debug(s(msg), data);
  octokit.log = { info, warn, error, debug } as Octokit['log'];
  return octokit;
}
