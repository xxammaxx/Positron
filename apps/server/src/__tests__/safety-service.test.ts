import { describe, it, expect, afterEach } from 'vitest';
import { SAFETY_KEYS, ENV_KEY_MAP, getSafetyState } from '../safety-service.js';

describe('SAFETY_KEYS', () => {
  it('should contain 5 keys', () => {
    expect(SAFETY_KEYS).toHaveLength(5);
    expect(SAFETY_KEYS).toContain('enableMerge');
    expect(SAFETY_KEYS).toContain('mergeDryRun');
    expect(SAFETY_KEYS).toContain('enablePush');
    expect(SAFETY_KEYS).toContain('killSwitch');
    expect(SAFETY_KEYS).toContain('enableFixLoop');
  });
});

describe('ENV_KEY_MAP', () => {
  it('should map safety keys to env vars', () => {
    expect(ENV_KEY_MAP.enableMerge).toBe('POSITRON_ENABLE_MERGE');
    expect(ENV_KEY_MAP.mergeDryRun).toBe('POSITRON_MERGE_DRY_RUN');
    expect(ENV_KEY_MAP.enablePush).toBe('POSITRON_ENABLE_PUSH');
    expect(ENV_KEY_MAP.killSwitch).toBe('POSITRON_MERGE_KILL_SWITCH');
    expect(ENV_KEY_MAP.enableFixLoop).toBe('POSITRON_ENABLE_FIX_LOOP');
  });
});

describe('getSafetyState', () => {
  const OLD_ENV = process.env;

  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it('should return default values when env not set', () => {
    delete process.env.POSITRON_ENABLE_MERGE;
    delete process.env.POSITRON_MERGE_DRY_RUN;
    delete process.env.POSITRON_ENABLE_PUSH;
    delete process.env.POSITRON_MERGE_KILL_SWITCH;
    delete process.env.POSITRON_ENABLE_FIX_LOOP;

    const state = getSafetyState();
    expect(state.enableMerge).toBe(false);
    expect(state.mergeDryRun).toBe(false);
    expect(state.enablePush).toBe(false);
    expect(state.killSwitch).toBe(true); // NOT 'false' → default true
    expect(state.enableFixLoop).toBe(false);
  });

  it('should read values from process.env', () => {
    process.env.POSITRON_ENABLE_MERGE = 'true';
    process.env.POSITRON_MERGE_DRY_RUN = 'true';
    process.env.POSITRON_ENABLE_PUSH = 'true';
    process.env.POSITRON_MERGE_KILL_SWITCH = 'false';
    process.env.POSITRON_ENABLE_FIX_LOOP = 'true';

    const state = getSafetyState();
    expect(state.enableMerge).toBe(true);
    expect(state.mergeDryRun).toBe(true);
    expect(state.enablePush).toBe(true);
    expect(state.killSwitch).toBe(false);
    expect(state.enableFixLoop).toBe(true);
  });

  it('should accept getDb parameter for DB overrides', () => {
    process.env.POSITRON_ENABLE_MERGE = 'false';
    const mockDb = {
      prepare: () => ({
        all: () => [{ key: 'safety.enableMerge', value: 'true' }],
      }),
    } as any;
    const state = getSafetyState(() => mockDb);
    expect(state.enableMerge).toBe(true); // DB override
  });

  it('should handle DB errors gracefully', () => {
    const badDb = () => { throw new Error('DB error'); };
    const state = getSafetyState(badDb as any);
    expect(state).toBeDefined();
    expect(typeof state.enableMerge).toBe('boolean');
  });

  it('should ignore unknown DB keys not in safety keys', () => {
    process.env.POSITRON_ENABLE_MERGE = 'true';
    const mockDb = {
      prepare: () => ({
        all: () => [{ key: 'safety.unknown_key', value: 'true' }],
      }),
    } as any;
    const state = getSafetyState(() => mockDb);
    // Unknown key should be ignored; enableMerge stays from env
    expect(state.enableMerge).toBe(true);
  });
});
