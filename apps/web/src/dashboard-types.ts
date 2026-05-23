// Operator Dashboard — Enhanced types (Issue #22)
import type { RunRecord, RunEvent, RunDetail, HealthStatus } from './types.js';

export interface AdapterHealth {
  github: { available: boolean; mode: string };
  specKit: { available: boolean; version?: string };
  openCode: { available: boolean; version?: string };
}

export interface MergeGateStatus {
  enabled: boolean;
  killSwitch: boolean;
  dryRun: boolean;
  runStatus: string;
  hasTestEvidence: boolean;
  branch: string | null;
  canMerge: boolean;
  blockedReasons: string[];
}

export type RunControlAction = 'pause' | 'abort' | 'resume' | 'retry';
