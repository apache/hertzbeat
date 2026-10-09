/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useQuery } from '@tanstack/react-query';
import { loadEntityRedSignal } from '@/features/entity/queries';
import { servicesExactWindow, type ServicesQuery } from '@/shared/navigation/services-path';
import { loadServiceDetail, loadServiceOperations, loadServiceTraceFreshness, loadServices } from '../api/services-api';
import { loadServicePerformance } from '../api/service-performance';
import { servicesQueryKeys } from './services-query-keys';

export function useServiceQueries(query: ServicesQuery, revision: number) {
  const id = Number(query.entityId);
  const validId = Number.isSafeInteger(id) && id > 0;
  const list = useQuery({
    queryKey: servicesQueryKeys.list(query),
    queryFn: ({ signal }) => loadServices(query, signal),
    enabled: !query.entityId && query.view === 'registered',
    retry: false
  });
  const performance = useQuery({
    queryKey: servicesQueryKeys.evidence('performance', query, revision),
    queryFn: ({ signal }) => loadServicePerformance(query, signal),
    enabled: !query.entityId && query.view !== 'registered' && Boolean(servicesExactWindow(query)),
    retry: false
  });
  const detail = useQuery({
    queryKey: servicesQueryKeys.detail(id),
    queryFn: ({ signal }) => loadServiceDetail(id, signal),
    enabled: validId,
    retry: false
  });
  const enabled = Boolean(servicesExactWindow(query)) && detail.data?.entity.type === 'service' && !detail.error;
  const evidence = useServiceSignalQueries(query, revision, enabled);
  return {
    list,
    performance,
    detail,
    ...evidence,
    enabled,
    validId,
    refresh: () => {
      void Promise.all([
        ...(!query.entityId ? [query.view === 'registered' ? list.refetch() : performance.refetch()] : []),
        ...(validId ? [detail.refetch()] : []),
        ...(enabled ? [evidence.red.refetch(), evidence.operations.refetch(), evidence.freshness.refetch()] : [])
      ]);
    }
  };
}
function useServiceSignalQueries(query: ServicesQuery, revision: number, enabled: boolean) {
  const red = useQuery({
    queryKey: servicesQueryKeys.evidence('red', query, revision),
    queryFn: ({ signal }) => loadEntityRedSignal(Number(query.entityId), servicesExactWindow(query)!, signal),
    enabled,
    retry: false
  });
  const operations = useQuery({
    queryKey: servicesQueryKeys.evidence('operations', query, revision),
    queryFn: ({ signal }) => loadServiceOperations(query, signal),
    enabled,
    retry: false
  });
  const freshness = useQuery({
    queryKey: servicesQueryKeys.evidence('freshness', query, revision),
    queryFn: ({ signal }) => loadServiceTraceFreshness(query, signal),
    enabled,
    retry: false
  });
  return { red, operations, freshness };
}
