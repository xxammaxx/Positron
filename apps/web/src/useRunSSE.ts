import { useState, useEffect, useRef, useCallback } from 'react';
import type { RunRecord, RunEvent, RunDetail, RunDetailWithMeta } from './types.js';
import { enrichDetail } from './dashboard-api.js';

export type SSEConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface SSERunState {
  run: RunRecord;
  events: RunEvent[];
}

export function useRunSSE(runId: string | null) {
  const [runState, setRunState] = useState<SSERunState | null>(null);
  const [status, setStatus] = useState<SSEConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute enriched detail for UI consumption
  const detail = runState ? enrichDetail({ run: runState.run, events: runState.events }) : null;

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!runId) {
      cleanup();
      setRunState(null);
      setStatus('disconnected');
      return;
    }

    let reconnectAttempt = 0;
    const maxReconnectDelay = 30000;
    let mounted = true;

    function connect() {
      if (!mounted) return;

      // Clean up previous connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource(`/api/runs/${runId}/events/stream`);
      eventSourceRef.current = es;

      es.addEventListener('initial', (event: MessageEvent) => {
        if (!mounted) return;
        try {
          const data = JSON.parse(event.data) as SSERunState;
          setRunState(data);
          setStatus('connected');
          setError(null);
          reconnectAttempt = 0;
        } catch (e) {
          setError(`Failed to parse initial state: ${String(e)}`);
        }
      });

      es.addEventListener('run-event', (event: MessageEvent) => {
        if (!mounted) return;
        try {
          const newEvent = JSON.parse(event.data) as RunEvent;
          setRunState(prev => {
            if (!prev) return prev;
            // Prevent duplicates
            if (prev.events.some(e => e.id === newEvent.id)) return prev;
            return {
              ...prev,
              events: [...prev.events, newEvent],
            };
          });
        } catch {
          // skip malformed events
        }
      });

      es.addEventListener('run-update', (event: MessageEvent) => {
        if (!mounted) return;
        try {
          const update = JSON.parse(event.data) as { phase: string; status: string; branch?: string };
          setRunState(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              run: {
                ...prev.run,
                phase: update.phase,
                status: update.status as RunRecord['status'],
                branch: update.branch ?? prev.run.branch,
              },
            };
          });
        } catch {
          // skip malformed updates
        }
      });

      es.addEventListener('run-control', (_event: MessageEvent) => {
        // Control actions (pause/abort/resume/retry) — just trigger re-evaluation
        // The actual state change comes via run-update or run-event
        if (!mounted) return;
      });

      es.addEventListener('run-complete', (event: MessageEvent) => {
        if (!mounted) return;
        try {
          const complete = JSON.parse(event.data) as { phase: string; status: string };
          setRunState(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              run: {
                ...prev.run,
                phase: complete.phase,
                status: complete.status as RunRecord['status'],
              },
            };
          });
        } catch {
          // skip malformed
        }
      });

      es.onopen = () => {
        if (!mounted) return;
        setStatus('connected');
        setError(null);
      };

      es.onerror = () => {
        if (!mounted) return;
        es.close();
        setStatus('reconnecting');
        reconnectAttempt++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), maxReconnectDelay);
        reconnectTimerRef.current = setTimeout(() => {
          if (mounted) connect();
        }, delay);
      };
    }

    connect();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [runId, cleanup]);

  return { runState: runState ?? undefined, detail, status, error };
}
