import { useEffect, useState, useRef } from 'react';
import { api } from '../api.js';
import type { Metrics } from '../types.js';

const DEFAULT_REFRESH_MS = 10_000;

export function useMetrics(refreshIntervalMs?: number): {
  metrics: Metrics | null;
  isLoading: boolean;
  error: string | null;
} {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const interval = refreshIntervalMs ?? DEFAULT_REFRESH_MS;

  useEffect(() => {
    async function fetchMetrics(): Promise<void> {
      try {
        const data = await api.getMetrics();
        setMetrics(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch metrics',
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetrics();
    intervalRef.current = setInterval(fetchMetrics, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [interval]);

  return { metrics, isLoading, error };
}
