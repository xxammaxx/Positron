import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

type HealthStatusValue = 'ok' | 'degraded' | 'error' | 'loading';

export default function HealthIndicator(): React.ReactElement {
  const [status, setStatus] = useState<HealthStatusValue>('loading');
  const [tooltip, setTooltip] = useState('');

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval>;

    async function check(): Promise<void> {
      try {
        const health = await api.getHealth();
        if (cancelled) return;
        setStatus(health.status);
        const adapterEntries = Object.entries(health.adapters ?? {});
        const adapterStatus = adapterEntries
          .map(([name, ok]) => `${name}: ${ok ? '✅' : '❌'}`)
          .join('\n');
        setTooltip(`Uptime: ${health.uptime}s\n${adapterStatus}`);
      } catch {
        if (cancelled) return;
        setStatus('error');
        setTooltip('Health check failed');
      }
    }

    check();
    interval = setInterval(check, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const dotColor =
    status === 'ok'
      ? 'bg-green-500'
      : status === 'degraded'
        ? 'bg-yellow-500'
        : status === 'error'
          ? 'bg-red-500'
          : 'bg-slate-500 animate-pulse';

  const label =
    status === 'ok'
      ? 'Online'
      : status === 'degraded'
        ? 'Degraded'
        : status === 'error'
          ? 'Offline'
          : 'Checking...';

  return (
    <div className="relative group">
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      {tooltip && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-slate-700 border border-slate-600 rounded-lg p-3 text-xs text-slate-200 whitespace-pre-line opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
          {tooltip}
        </div>
      )}
    </div>
  );
}
