/**
 * SSE Broadcaster — Stub for Issue #65 build compatibility.
 * Full implementation will be provided in Issue #66 (Live Operations Pass).
 */

import type { Response } from 'express';

const clients = new Map<string, Set<Response>>();

export function broadcastSSE(
  runId: string,
  event: string,
  data: Record<string, unknown>,
): void {
  const runClients = clients.get(runId);
  if (!runClients) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of runClients) {
    try { res.write(payload); } catch { /* client disconnected */ }
  }
}

export function addSSEClient(runId: string, res: Response): void {
  if (!clients.has(runId)) clients.set(runId, new Set());
  clients.get(runId)!.add(res);
  res.on('close', () => {
    clients.get(runId)?.delete(res);
    if (clients.get(runId)?.size === 0) clients.delete(runId);
  });
}

export function removeSSEClient(runId: string, res: Response): void {
  clients.get(runId)?.delete(res);
}

export function resetEventSequence(_runId: string): void {
  /* stub — full implementation in Issue #66 */
}

export function primeEventSequence(_runId: string): void {
  /* stub — full implementation in Issue #66 */
}
