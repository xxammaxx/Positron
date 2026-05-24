import type { SSEConnectionStatus } from '../useRunSSE.js';

export function ConnectionStatus({ status }: { status: SSEConnectionStatus }) {
  const color = status === 'connected' ? 'bg-emerald-500'
    : status === 'reconnecting' ? 'bg-amber-500 animate-pulse'
    : 'bg-slate-600';

  const label = status === 'connected' ? 'Live'
    : status === 'reconnecting' ? 'Reconnecting...'
    : 'Disconnected';

  return (
    <div className="flex items-center gap-1.5 text-xs" title={`SSE: ${status}`}>
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className={
        status === 'connected' ? 'text-emerald-400' :
        status === 'reconnecting' ? 'text-amber-400' :
        'text-slate-500'
      }>
        {label}
      </span>
    </div>
  );
}
