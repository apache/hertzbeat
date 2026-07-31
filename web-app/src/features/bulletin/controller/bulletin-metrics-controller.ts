/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { skipToken, useQuery, type QueryClient } from '@tanstack/react-query';
import { useCallback, useLayoutEffect, useRef } from 'react';

import { loadBulletinMetrics } from '../api/bulletin-api';
import { classifyBulletinFailure } from '../model/bulletin-failure';
import { hasBulletinMetricFields } from '../model/bulletin-metrics-model';
import {
  bulletinRefreshInterval,
  defaultBulletinRefreshSeconds,
  type BulletinRefreshSeconds
} from '../model/bulletin-refresh-model';
import { bulletinQueryKeys } from './bulletin-query-keys';

export function useBulletinMetricsController(
  selectedId: number | null,
  canRead = true,
  refreshSeconds: BulletinRefreshSeconds = defaultBulletinRefreshSeconds
) {
  const canReadRef = useRef(canRead);
  const selectedIdRef = useRef(selectedId);
  useLayoutEffect(() => {
    canReadRef.current = canRead;
    selectedIdRef.current = selectedId;
  }, [canRead, selectedId]);
  const query = useQuery({
    queryKey: bulletinQueryKeys.metrics(selectedId),
    // `enabled: false` still permits manual refetch; skipToken removes the unsafe null-id query function.
    queryFn: !canRead || selectedId == null ? skipToken : ({ signal }) => loadBulletinMetrics(selectedId, signal),
    retry: false,
    refetchInterval: canRead && selectedId != null ? bulletinRefreshInterval(refreshSeconds) : false
  });
  const { refetch } = query;
  const refresh = useCallback(async () => {
    if (!canReadRef.current || selectedIdRef.current == null) return true;
    try {
      const result = await refetch({ cancelRefetch: false });
      return !result.isError && result.data !== undefined;
    } catch {
      return false;
    }
  }, [refetch]);
  return {
    refresh,
    refreshing: canRead && selectedId != null && query.isFetching,
    state: resolveBulletinMetricsState(selectedId, canRead, query)
  };
}

export function useBulletinMetrics(
  selectedId: number | null,
  canRead = true,
  refreshSeconds: BulletinRefreshSeconds = defaultBulletinRefreshSeconds
) {
  return useBulletinMetricsController(selectedId, canRead, refreshSeconds).state;
}

function resolveBulletinMetricsState(
  selectedId: number | null,
  canRead: boolean,
  query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof loadBulletinMetrics>>>>
) {
  if (!canRead || selectedId == null) return { kind: 'idle' as const };
  if (query.isPending) return { kind: 'loading' as const };
  if (query.isError) return { kind: classifyBulletinFailure(query.error) };
  return hasBulletinMetricFields(query.data)
    ? { kind: 'ready' as const, data: query.data }
    : { kind: 'empty' as const };
}

export async function refreshSavedBulletinMetrics(client: QueryClient, id: number) {
  const queryKey = bulletinQueryKeys.metrics(id);
  await client.invalidateQueries({ queryKey, exact: true, refetchType: 'none' });
  await client.fetchQuery({
    queryKey,
    queryFn: ({ signal }) => loadBulletinMetrics(id, signal),
    staleTime: 0
  });
}
