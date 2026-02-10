"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

export function invalidateCache(key: string) {
  cache.delete(key);
}

export function useCachedRpc<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  staleMs = 30_000
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  stale: boolean;
} {
  const entry = cache.get(cacheKey) as CacheEntry<T> | undefined;
  const [data, setData] = useState<T | null>(entry?.data ?? null);
  const [loading, setLoading] = useState(!entry);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const doFetch = useCallback(
    async (background: boolean) => {
      if (background) {
        setStale(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const result = await fetchFnRef.current();
        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fetch failed");
      } finally {
        setLoading(false);
        setStale(false);
      }
    },
    [cacheKey]
  );

  useEffect(() => {
    const entry = cache.get(cacheKey) as CacheEntry<T> | undefined;
    if (entry) {
      setData(entry.data);
      const age = Date.now() - entry.timestamp;
      if (age > staleMs) {
        doFetch(true);
      }
    } else {
      doFetch(false);
    }
  }, [cacheKey, staleMs, doFetch]);

  const refresh = useCallback(() => {
    cache.delete(cacheKey);
    doFetch(false);
  }, [cacheKey, doFetch]);

  return { data, loading, error, refresh, stale };
}
