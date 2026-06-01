import { describe, it, expect } from 'vitest';
import {
  isPushAllowed, isMergeAllowed, isMergeKillSwitchActive, isMergeDryRun,
  isFixLoopEnabled, hasWorkspaceChanges, resolveMaxAttempts, isStrictTestMode,
  isRealSpecKitEnabled, mapFailureKind,
} from '../pipeline/safety-decisions.js';

describe('isPushAllowed', () => {
  it('should return false by default', () => {
    expect(isPushAllowed({})).toBe(false);
  });
  it('should return true when POSITRON_ENABLE_PUSH=true', () => {
    expect(isPushAllowed({ POSITRON_ENABLE_PUSH: 'true' })).toBe(true);
  });
  it('should return false for any other value', () => {
    expect(isPushAllowed({ POSITRON_ENABLE_PUSH: 'false' })).toBe(false);
    expect(isPushAllowed({ POSITRON_ENABLE_PUSH: '1' })).toBe(false);
  });
});

describe('isMergeAllowed', () => {
  it('should return false by default', () => {
    expect(isMergeAllowed({})).toBe(false);
  });
  it('should return true when POSITRON_ENABLE_MERGE=true', () => {
    expect(isMergeAllowed({ POSITRON_ENABLE_MERGE: 'true' })).toBe(true);
  });
});

describe('isMergeKillSwitchActive', () => {
  it('should return true by default (safety first)', () => {
    expect(isMergeKillSwitchActive({})).toBe(true);
  });
  it('should return true when env var is not "false"', () => {
    expect(isMergeKillSwitchActive({ POSITRON_MERGE_KILL_SWITCH: 'true' })).toBe(true);
    expect(isMergeKillSwitchActive({ POSITRON_MERGE_KILL_SWITCH: '' })).toBe(true);
  });
  it('should return false only when env var is "false"', () => {
    expect(isMergeKillSwitchActive({ POSITRON_MERGE_KILL_SWITCH: 'false' })).toBe(false);
  });
});

describe('isMergeDryRun', () => {
  it('should return false by default', () => {
    expect(isMergeDryRun({})).toBe(false);
  });
  it('should return true when POSITRON_MERGE_DRY_RUN=true', () => {
    expect(isMergeDryRun({ POSITRON_MERGE_DRY_RUN: 'true' })).toBe(true);
  });
});

describe('isFixLoopEnabled', () => {
  it('should return false by default', () => {
    expect(isFixLoopEnabled({})).toBe(false);
  });
  it('should return true when POSITRON_ENABLE_FIX_LOOP=true', () => {
    expect(isFixLoopEnabled({ POSITRON_ENABLE_FIX_LOOP: 'true' })).toBe(true);
  });
});

describe('hasWorkspaceChanges', () => {
  it('should return false when workspace is clean', () => {
    expect(hasWorkspaceChanges(true)).toBe(false);
  });
  it('should return true when workspace is dirty', () => {
    expect(hasWorkspaceChanges(false)).toBe(true);
  });
});

describe('resolveMaxAttempts', () => {
  it('should return default when env var not set', () => {
    expect(resolveMaxAttempts({})).toBe(3);
  });
  it('should return parsed value when set', () => {
    expect(resolveMaxAttempts({ POSITRON_MAX_FIX_LOOPS: '5' })).toBe(5);
  });
  it('should return default for NaN values', () => {
    expect(resolveMaxAttempts({ POSITRON_MAX_FIX_LOOPS: 'abc' })).toBe(3);
  });
  it('should return default for empty string', () => {
    expect(resolveMaxAttempts({ POSITRON_MAX_FIX_LOOPS: '' })).toBe(3);
  });
});

describe('isStrictTestMode', () => {
  it('should return false by default', () => {
    expect(isStrictTestMode({})).toBe(false);
  });
  it('should return true when POSITRON_STRICT_TEST_MODE=true', () => {
    expect(isStrictTestMode({ POSITRON_STRICT_TEST_MODE: 'true' })).toBe(true);
  });
});

describe('isRealSpecKitEnabled', () => {
  it('should return false by default', () => {
    expect(isRealSpecKitEnabled({})).toBe(false);
  });
  it('should return true when POSITRON_ENABLE_REAL_SPECKIT=true', () => {
    expect(isRealSpecKitEnabled({ POSITRON_ENABLE_REAL_SPECKIT: 'true' })).toBe(true);
  });
});

describe('mapFailureKind', () => {
  it('should map unsafe errors', () => {
    expect(mapFailureKind('unsafe', false, false, true)).toBe('FAILED_UNSAFE');
  });
  it('should map blocked errors', () => {
    expect(mapFailureKind('blocked', false, true, false)).toBe('FAILED_BLOCKED');
  });
  it('should map transient errors', () => {
    expect(mapFailureKind('timeout', true, false, false)).toBe('FAILED_TRANSIENT');
  });
  it('should map generic errors', () => {
    expect(mapFailureKind('unknown', false, false, false)).toBe('FAILED');
  });
});

// ==============================
// Env fallback branch coverage (calling without env param triggers env ?? process.env)
// ==============================

describe('env fallback branches', () => {
  it('should use process.env when env not provided (isPushAllowed)', () => {
    // Don't pass env param — triggers (env ?? process.env) fallback
    const oldVal = process.env.POSITRON_ENABLE_PUSH;
    process.env.POSITRON_ENABLE_PUSH = 'true';
    try {
      expect(isPushAllowed()).toBe(true);
    } finally {
      process.env.POSITRON_ENABLE_PUSH = oldVal;
    }
  });

  it('should use process.env when env not provided (isMergeAllowed)', () => {
    const oldVal = process.env.POSITRON_ENABLE_MERGE;
    process.env.POSITRON_ENABLE_MERGE = 'true';
    try {
      expect(isMergeAllowed()).toBe(true);
    } finally {
      process.env.POSITRON_ENABLE_MERGE = oldVal;
    }
  });

  it('should use process.env when env not provided (isStrictTestMode)', () => {
    const oldVal = process.env.POSITRON_STRICT_TEST_MODE;
    process.env.POSITRON_STRICT_TEST_MODE = 'true';
    try {
      expect(isStrictTestMode()).toBe(true);
    } finally {
      process.env.POSITRON_STRICT_TEST_MODE = oldVal;
    }
  });

  it('should use process.env when env not provided (resolveMaxAttempts)', () => {
    const oldVal = process.env.POSITRON_MAX_FIX_LOOPS;
    process.env.POSITRON_MAX_FIX_LOOPS = '5';
    try {
      expect(resolveMaxAttempts()).toBe(5);
    } finally {
      process.env.POSITRON_MAX_FIX_LOOPS = oldVal;
    }
  });

  it('should use process.env when env not provided (isMergeKillSwitchActive)', () => {
    const oldVal = process.env.POSITRON_MERGE_KILL_SWITCH;
    process.env.POSITRON_MERGE_KILL_SWITCH = 'false';
    try {
      expect(isMergeKillSwitchActive()).toBe(false);
    } finally {
      process.env.POSITRON_MERGE_KILL_SWITCH = oldVal;
    }
  });

  it('should use process.env when env not provided (isMergeDryRun)', () => {
    const oldVal = process.env.POSITRON_MERGE_DRY_RUN;
    process.env.POSITRON_MERGE_DRY_RUN = 'true';
    try {
      expect(isMergeDryRun()).toBe(true);
    } finally {
      process.env.POSITRON_MERGE_DRY_RUN = oldVal;
    }
  });

  it('should use process.env when env not provided (isFixLoopEnabled)', () => {
    const oldVal = process.env.POSITRON_ENABLE_FIX_LOOP;
    process.env.POSITRON_ENABLE_FIX_LOOP = 'true';
    try {
      expect(isFixLoopEnabled()).toBe(true);
    } finally {
      process.env.POSITRON_ENABLE_FIX_LOOP = oldVal;
    }
  });

  it('should use process.env when env not provided (isRealSpecKitEnabled)', () => {
    const oldVal = process.env.POSITRON_ENABLE_REAL_SPECKIT;
    process.env.POSITRON_ENABLE_REAL_SPECKIT = 'true';
    try {
      expect(isRealSpecKitEnabled()).toBe(true);
    } finally {
      process.env.POSITRON_ENABLE_REAL_SPECKIT = oldVal;
    }
  });
});
