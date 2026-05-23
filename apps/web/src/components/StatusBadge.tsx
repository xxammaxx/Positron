const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-600 text-white',
  success: 'bg-emerald-600 text-white',
  done: 'bg-emerald-600 text-white',
  failed: 'bg-red-600 text-white',
  blocked: 'bg-amber-600 text-white',
  skipped: 'bg-slate-500 text-white',
  running: 'bg-blue-500 text-white animate-pulse',
  pending: 'bg-slate-600 text-slate-300',
};

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status.toLowerCase()] ?? 'bg-slate-600 text-slate-300';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold ${color}`}>
      {status.toUpperCase()}
    </span>
  );
}
