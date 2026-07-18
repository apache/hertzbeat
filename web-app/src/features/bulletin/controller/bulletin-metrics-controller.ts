/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useQuery, type QueryClient } from '@tanstack/react-query';

import { classifyBulletinError, loadBulletinMetrics } from '../api/bulletin-api';
import { bulletinQueryKeys } from './bulletin-query-keys';

const bulletinMetricsRefreshIntervalMs = 30_000;

export function useBulletinMetrics(selectedId: number | null) {
  const query = useQuery({
    queryKey: bulletinQueryKeys.metrics(selectedId),
    queryFn: () => loadBulletinMetrics(selectedId!),
    enabled: selectedId != null,
    retry: false,
    refetchInterval: bulletinMetricsRefreshIntervalMs
  });
  if (selectedId == null) return { kind: 'idle' as const };
  if (query.isPending) return { kind: 'loading' as const };
  if (query.isError) return { kind: classifyBulletinError(query.error, 'metrics') };
  return query.data.content.length
    ? { kind: 'ready' as const, data: query.data }
    : { kind: 'empty' as const };
}

export async function refreshSavedBulletinMetrics(client: QueryClient, id: number) {
  const queryKey = bulletinQueryKeys.metrics(id);
  await client.invalidateQueries({ queryKey, exact: true, refetchType: 'none' });
  await client.fetchQuery({
    queryKey,
    queryFn: () => loadBulletinMetrics(id),
    staleTime: 0
  });
}
