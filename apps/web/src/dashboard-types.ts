// Operator Dashboard — Enhanced types (Issue #28)
import type { RunRecord, RunEvent, RunDetail, RunDetailWithMeta, HealthStatus, SafetyState } from './types.js';

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

export interface RunControlState {
  /** Whether the backend supports this control action */
  supported: boolean;
  /** Whether the action can be invoked right now */
  enabled: boolean;
  /** Explanation if disabled or unsupported */
  reason?: string;
  /** Icon/emoji for the action */
  icon: string;
  /** Button label */
  label: string;
}
