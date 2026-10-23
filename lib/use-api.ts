import { useCallback, useEffect, useRef, useState } from 'react';

import { api, ApiError } from './api';

/** Fetches `path` on mount and whenever it changes. `refresh()` refetches
 * (used by pull-to-refresh and live updates). Pass null to skip. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(path);
  latest.current = path;

  const load = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent') => {
      if (!path) return;
      if (mode === 'refresh') setRefreshing(true);
      try {
        const result = await api<T>(path);
        if (latest.current === path) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (latest.current === path) setError(e instanceof ApiError ? e.message : 'Something went wrong.');
      } finally {
        if (latest.current === path) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [path]
  );

  useEffect(() => {
    setLoading(!!path);
    load('initial');
  }, [load, path]);

  return {
    data,
    error,
    loading,
    refreshing,
    refresh: () => load('refresh'),
    /** Refetch without showing the pull-to-refresh spinner. */
    reload: () => load('silent'),
  };
}
