import { useEffect, useRef, useState, useCallback } from 'react';
import type { Run, Metrics } from '../types.js';

interface DashboardData {
  metrics: Metrics | null;
  runs: Run[];
  evidence: { totalArtifacts: number; testEvents: number; errorEvents: number; warningEvents: number } | null;
  isConnected: boolean;
}

const POLL_INTERVAL = 10_000;

export function useDashboardSSE(): DashboardData {
  const [data, setData] = useState<DashboardData>({
    metrics: null, runs: [], evidence: null, isConnected: false,
  });
  const sourceRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackActiveRef = useRef(false);

  const fetchPoll = useCallback(async () => {
    try {
      const baseUrl = '';
      const [metricsRes, runsRes, evidenceRes] = await Promise.all([
        fetch(`${baseUrl}/api/metrics`).then(r => r.json()).catch(() => null),
        fetch(`${baseUrl}/api/runs?limit=50`).then(r => r.json()).catch(() => ({ runs: [] })),
        fetch(`${baseUrl}/api/evidence`).then(r => r.json()).catch(() => null),
      ]);
      setData({
        metrics: metricsRes?.metrics ?? null,
        runs: runsRes?.runs ?? [],
        evidence: evidenceRes?.summary ?? null,
        isConnected: true,
      });
    } catch {
      // Silently retry on next poll
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const es = new EventSource('/api/stream');
    sourceRef.current = es;

    es.onopen = () => {
      if (!mounted) return;
      setData(prev => ({ ...prev, isConnected: true }));
      fallbackActiveRef.current = false;
    };

    es.addEventListener('initial', (e: MessageEvent) => {
      if (!mounted) return;
      try {
        const d = JSON.parse(e.data);
        setData({
          metrics: d.metrics ?? null,
          runs: d.runs ?? [],
          evidence: d.evidence ?? null,
          isConnected: true,
        });
      } catch { /* ignore */ }
    });

    es.addEventListener('dashboard-update', (e: MessageEvent) => {
      if (!mounted) return;
      try {
        const d = JSON.parse(e.data);
        setData(prev => ({
          metrics: d.metrics ?? prev.metrics,
          runs: d.runs ?? prev.runs,
          evidence: d.evidence ?? prev.evidence,
          isConnected: true,
        }));
      } catch { /* ignore */ }
    });

    es.onerror = () => {
      if (!mounted) return;
      es.close();
      setData(prev => ({ ...prev, isConnected: false }));

      // Fallback to polling
      if (!fallbackActiveRef.current) {
        fallbackActiveRef.current = true;
        fetchPoll();
        pollRef.current = setInterval(fetchPoll, POLL_INTERVAL);
      }
    };

    return () => {
      mounted = false;
      es.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchPoll]);

  return data;
}
