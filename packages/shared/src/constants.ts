// Positron — Konstanten und Limits

import type { PositronLabel } from './types.js';

export const POSITRON_LABELS: readonly PositronLabel[] = [
  'positron:ready', 'positron:running', 'positron:research',
  'positron:repo-sync', 'positron:planning', 'positron:implementing',
  'positron:testing', 'positron:blocked',
  'positron:failed', 'positron:pr-created', 'positron:merged', 'positron:done',
] as const;

export const POSITRON_LABEL_PREFIX = 'positron:';
export const MAX_FIX_LOOPS = 3;
export const MAX_DIFF_SIZE = 400;
export const POLLING_INTERVAL_MS = 60_000;
export const MAX_POLLING_INTERVAL_MS = 180_000;
export const CLI_TIMEOUT_MS = 120_000;
export const CLI_MAX_RETRIES = 2;
export const POSITRON_VERSION = '0.1.0';
export const BRANCH_PREFIX = 'positron/issue';
export const MAX_BRANCH_SLUG_LENGTH = 50;
