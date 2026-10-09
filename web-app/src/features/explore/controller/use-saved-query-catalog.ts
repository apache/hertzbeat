/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useQueries, useQueryClient } from '@tanstack/react-query';

import { loadSavedQueries } from '../api/explore-saved-query-api';
import { classifyExploreSignalError } from '../api/explore-signal-api-model';
import type { ExploreSignal } from '../model/explore-query';
import type { SavedQueryGroup } from '../model/explore-saved-query-view-model';

const signals: ExploreSignal[] = ['metrics', 'logs', 'traces'];
const savedQueryKeys = {
  all: ['explore-saved-queries'] as const,
  list: (signal: ExploreSignal) => ['explore-saved-queries', signal] as const
};

export function useSavedQueryCatalog(enabled: boolean) {
  const client = useQueryClient();
  const results = useQueries({
    queries: signals.map(signal => ({
      queryKey: savedQueryKeys.list(signal),
      queryFn: ({ signal: abortSignal }: { signal: AbortSignal }) => loadSavedQueries(signal, abortSignal),
      enabled,
      retry: false,
      staleTime: 0
    }))
  });
  const groups: SavedQueryGroup[] = results.map((result, index) => ({
    signal: signals[index]!,
    state: result.error ? failureState(result.error) : result.isPending ? 'loading' : 'ready',
    records: result.error ? [] : (result.data ?? [])
  }));
  return { groups, refresh: () => void client.invalidateQueries({ queryKey: savedQueryKeys.all }) };
}

function failureState(error: unknown): SavedQueryGroup['state'] {
  const kind = classifyExploreSignalError(error);
  return kind === 'missing' ||
    kind === 'invalid_query' ||
    kind === 'invalid_filter' ||
    kind === 'calculated_budget_exceeded' ||
    kind === 'calculated_invalid_pattern'
    ? 'error'
    : kind;
}
