/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { skipToken, useQuery } from '@tanstack/react-query';

import { useSharedTimeOptional } from '@/shared/time';

import { loadLogInvestigation } from '../api/explore-investigation-api';
import { ExploreInvestigationContractError } from '../api/explore-investigation-schema';
import type { LogInvestigationViewState } from '../model/explore-investigation-contract';
import { exploreInvestigationRoute } from '../model/explore-investigation-model';
import { createLogInvestigationPersesResults } from '../model/explore-investigation-perses-model';
import { exploreQueryContext, type LogExploreQuery } from '../model/explore-model';
import { exploreQueryKeys } from './explore-query-keys';

export function useLogInvestigationController(query: LogExploreQuery) {
  const route = exploreInvestigationRoute(query);
  const logRoute = route.kind === 'log' ? route : undefined;
  const refreshRevision = useSharedTimeOptional()?.refreshRevision ?? 0;
  const request = useQuery({
    queryKey: logRoute
      ? exploreQueryKeys.logInvestigation(
          exploreQueryContext(query),
          logRoute.window,
          logRoute.logRecordUid,
          refreshRevision
        )
      : ['explore-investigation', 'log', 'inactive'],
    queryFn: logRoute
      ? ({ signal }) => loadLogInvestigation(logRoute.logRecordUid, logRoute.window, signal)
      : skipToken,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });
  return {
    state: logInvestigationState(query, route, request),
    evidenceCurrent: !request.isPlaceholderData && !request.isFetching && !request.error,
    refetch: () => (logRoute ? request.refetch().then(() => undefined) : Promise.resolve())
  };
}

function logInvestigationState(
  query: LogExploreQuery,
  route: ReturnType<typeof exploreInvestigationRoute>,
  request: {
    data?: Awaited<ReturnType<typeof loadLogInvestigation>> | undefined;
    error: Error | null;
  }
): LogInvestigationViewState {
  if (route.kind === 'inactive') return { kind: 'inactive' };
  if (route.kind !== 'log') return { kind: 'invalid' };
  if (request.error) {
    return {
      kind: request.error instanceof ExploreInvestigationContractError ? 'contract_error' : 'unavailable',
      route
    };
  }
  if (!request.data) return { kind: 'loading', route };
  return {
    kind: 'ready',
    route,
    snapshot: request.data,
    perses: createLogInvestigationPersesResults(query, request.data)
  };
}
