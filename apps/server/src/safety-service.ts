// Positron — Safety Service (extracted from index.ts)

export const SAFETY_KEYS = ['enableMerge', 'mergeDryRun', 'enablePush', 'killSwitch', 'enableFixLoop'] as const;

export const ENV_KEY_MAP: Record<string, string> = {
  enableMerge: 'POSITRON_ENABLE_MERGE',
  mergeDryRun: 'POSITRON_MERGE_DRY_RUN',
  enablePush: 'POSITRON_ENABLE_PUSH',
  killSwitch: 'POSITRON_MERGE_KILL_SWITCH',
  enableFixLoop: 'POSITRON_ENABLE_FIX_LOOP',
};

export type SafetyKey = keyof typeof ENV_KEY_MAP;
export type SafetyState = Record<SafetyKey, boolean>;

/** Liest Safety-State aus process.env + DB-Overrides */
export function getSafetyState(getDb?: () => import('better-sqlite3').Database): SafetyState {
  const result: Record<string, boolean> = {
    enableMerge: process.env.POSITRON_ENABLE_MERGE === 'true',
    mergeDryRun: process.env.POSITRON_MERGE_DRY_RUN === 'true',
    enablePush: process.env.POSITRON_ENABLE_PUSH === 'true',
    killSwitch: process.env.POSITRON_MERGE_KILL_SWITCH !== 'false',
    enableFixLoop: process.env.POSITRON_ENABLE_FIX_LOOP === 'true',
  };
  if (getDb) {
    try {
      const rows = getDb().prepare('SELECT key, value FROM settings WHERE key LIKE ?').all('safety.%') as Array<{ key: string; value: string }>;
      for (const row of rows) {
        const safetyKey = row.key.replace('safety.', '');
        if (safetyKey in result) {
          result[safetyKey] = row.value === 'true';
        }
      }
    } catch { /* table may not exist yet */ }
  }
  return result as SafetyState;
}
