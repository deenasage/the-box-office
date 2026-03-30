import { useState, useEffect, useCallback, useRef } from "react";

interface UseFetchOptions {
  /** If false, skip the fetch entirely */
  enabled?: boolean;
}

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFetch<T>(
  url: string | null,
  options: UseFetchOptions = {}
): UseFetchResult<T> {
  const { enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!url || !enabled) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);

    fetch(url, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<T>;
      })
      .then(setData)
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") {
          setError(e instanceof Error ? e.message : "Failed to fetch");
        }
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [url, enabled, tick]);

  const refetch = useCallback(() => setTick((n) => n + 1), []);

  return { data, loading, error, refetch };
}
