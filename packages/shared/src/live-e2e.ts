// Positron — Live E2E Test-Konfiguration

import crypto from 'node:crypto';

/** Konfiguration für Live-GitHub-E2E-Tests */
export interface LiveGitHubE2EConfig {
  /** Owner des Test-Repositories */
  owner: string;
  /** Name des Test-Repositories */
  repo: string;
  /** GitHub Token */
  token: string;
  /** Ob Schreiboperationen erlaubt sind */
  allowWrite: boolean;
}

/** Ergebnis eines Live-E2E-Tests */
export interface LiveGitHubE2EResult {
  success: boolean;
  runId: string;
  summary: string;
  details?: Record<string, unknown>;
}

/** Lädt die Live-E2E-Konfiguration aus Umgebungsvariablen */
export function loadLiveGitHubE2EConfig(env?: Record<string, string | undefined>): LiveGitHubE2EConfig | null {
  const e = env ?? process.env;
  const token = e['GITHUB_TOKEN'] ?? '';
  const owner = e['POSITRON_REPO_OWNER'] ?? '';
  const repo = e['POSITRON_REPO_NAME'] ?? '';

  if (!token || !owner || !repo) {
    return null;
  }

  return {
    token,
    owner,
    repo,
    allowWrite: e['POSITRON_LIVE_TEST_ALLOW_WRITE'] === 'true',
  };
}

/** Prüft ob Live-GitHub-E2E-Tests übersprungen werden sollen */
export function shouldSkipLiveGitHubE2E(env?: Record<string, string | undefined>): boolean {
  const e = env ?? process.env;
  return e['POSITRON_ENABLE_LIVE_GITHUB_TESTS'] !== 'true';
}

/** Prüft ob schreibende Live-E2E-Tests übersprungen werden sollen */
export function shouldSkipLiveGitHubWriteE2E(env?: Record<string, string | undefined>): boolean {
  const e = env ?? process.env;
  return e['POSITRON_LIVE_TEST_ALLOW_WRITE'] !== 'true';
}

/** Generiert eine eindeutige Run-ID für Live-E2E-Tests */
export function generateLiveRunId(): string {
  return `live-${crypto.randomUUID().slice(0, 8)}`;
}

/** Marker für Live-E2E-Test-Kommentare */
export function liveE2EMarker(runId: string): string {
  return `<!-- positron:live-e2e:${runId} -->`;
}

/** Prüft ob ein String nur ASCII-Zeichen enthält */
export function isAsciiOnly(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 127) return false;
  }
  return true;
}
