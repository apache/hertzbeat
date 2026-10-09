/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { servicesExactWindow, type ServicesQuery } from '@/shared/navigation/services-path';
import { scopedQueryKey } from '@/shared/query-context';
const root = ['services'] as const;
export const servicesQueryKeys = {
  list: (query: ServicesQuery) =>
    [...root, 'list', query.search, query.environmentFilter, query.pageIndex ?? 0] as const,
  detail: (id: number) => [...root, 'detail', id] as const,
  evidence: (kind: 'red' | 'operations' | 'freshness' | 'performance', query: ServicesQuery, revision: number) =>
    scopedQueryKey(
      [...root, kind, query.search, query.environmentFilter, query.sort, query.order, query.pageIndex],
      query,
      servicesExactWindow(query),
      revision
    )
};
