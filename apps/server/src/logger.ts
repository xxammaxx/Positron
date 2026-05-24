// Positron — Leichter strukturierter Logger
// Verwendet process.env.POSITRON_LOG_LEVEL (debug|info|warn|error).
// Keine externen Dependencies — nur console im Fallback.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[90m',   // grey
  info: '\x1b[36m',    // cyan
  warn: '\x1b[33m',    // yellow
  error: '\x1b[31m',   // red
};
const RESET = '\x1b[0m';

function getConfiguredLevel(): LogLevel {
  const env = (process.env['POSITRON_LOG_LEVEL'] ?? 'info').toLowerCase();
  if (env in LOG_LEVELS) return env as LogLevel;
  return 'info';
}

function formatTimestamp(): string {
  return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
}

export function createLogger(component: string) {
  const configuredLevel = getConfiguredLevel();
  const threshold = LOG_LEVELS[configuredLevel];

  function log(level: LogLevel, message: string, meta?: unknown): void {
    if (LOG_LEVELS[level] < threshold) return;

    const ts = formatTimestamp();
    const color = LOG_COLORS[level];
    const prefix = `${color}[${ts}] [${level.toUpperCase()}] [${component}]${RESET}`;

    if (meta !== undefined) {
      let metaStr: string;
      if (meta instanceof Error) {
        metaStr = `${meta.message}\n${meta.stack ?? ''}`;
      } else if (typeof meta === 'string') {
        metaStr = meta;
      } else {
        try { metaStr = JSON.stringify(meta, null, 0); }
        catch { metaStr = String(meta); }
      }
      console.log(`${prefix} ${message} ${metaStr}`);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  return {
    debug: (msg: string, meta?: unknown) => log('debug', msg, meta),
    info: (msg: string, meta?: unknown) => log('info', msg, meta),
    warn: (msg: string, meta?: unknown) => log('warn', msg, meta),
    error: (msg: string, meta?: unknown) => log('error', msg, meta),
  };
}

export type Logger = ReturnType<typeof createLogger>;
