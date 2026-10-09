/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { skipToken, useQuery } from '@tanstack/react-query';
import { useSession } from '@/core/auth/session-context';

import { useSharedTimeOptional } from '@/shared/time';

import { loadTraceInvestigation } from '../api/explore-investigation-api';
import { ExploreInvestigationContractError } from '../api/explore-investigation-schema';
import type { TraceInvestigationViewState } from '../model/explore-investigation-contract';
import { exploreInvestigationRoute } from '../model/explore-investigation-model';
import { createTraceInvestigationPersesResults } from '../model/explore-investigation-perses-model';
import { exploreQueryContext, type TraceExploreQuery } from '../model/explore-model';
import { exploreQueryKeys } from './explore-query-keys';

export function useTraceInvestigationController(query: TraceExploreQuery) {
  const { session } = useSession();
  const identity = JSON.stringify(
    session ? [session.authenticated, session.username, session.workspaceId, session.roles] : []
  );
  const route = exploreInvestigationRoute(query);
  const traceRoute = route.kind === 'trace' ? route : undefined;
  const refreshRevision = useSharedTimeOptional()?.refreshRevision ?? 0;
  const ownerKey = traceRoute
    ? [
        identity,
        ...exploreQueryKeys.traceInvestigation(
          exploreQueryContext(query),
          traceRoute.window,
          traceRoute.traceId,
          undefined,
          refreshRevision
        )
      ]
    : undefined;
  const request = useQuery({
    queryKey: traceRoute
      ? [
          identity,
          ...exploreQueryKeys.traceInvestigation(
            exploreQueryContext(query),
            traceRoute.window,
            traceRoute.traceId,
            traceRoute.spanId,
            refreshRevision
          )
        ]
      : ['explore-investigation', 'trace', 'inactive'],
    queryFn: traceRoute
      ? ({ signal }) => loadTraceInvestigation(traceRoute.traceId, traceRoute.spanId, traceRoute.window, signal)
      : skipToken,
    retry: false,
    enabled: Boolean(session?.authenticated),
    placeholderData: (previous, previousQuery) =>
      ownerKey && sameEvidenceOwner(ownerKey, previousQuery?.queryKey) ? previous : undefined,
    staleTime: 30_000
  });
  return {
    state: traceInvestigationState(query, route, request),
    evidenceCurrent: !request.isPlaceholderData && !request.isFetching && !request.error,
    evidenceIdentity: JSON.stringify(ownerKey),
    refetch: () => (traceRoute ? request.refetch().then(() => undefined) : Promise.resolve())
  };
}

function sameEvidenceOwner(current: readonly unknown[], previous: readonly unknown[] | undefined) {
  if (!previous) return false;
  const stripSelection = (key: readonly unknown[]) =>
    key.map((part, index) =>
      index === key.length - 1 && part && typeof part === 'object' && 'traceId' in part
        ? { traceId: part.traceId }
        : part
    );
  return JSON.stringify(stripSelection(current)) === JSON.stringify(stripSelection(previous));
}

function traceInvestigationState(
  query: TraceExploreQuery,
  route: ReturnType<typeof exploreInvestigationRoute>,
  request: {
    data?: Awaited<ReturnType<typeof loadTraceInvestigation>> | undefined;
    error: Error | null;
  }
): TraceInvestigationViewState {
  if (route.kind === 'inactive') return { kind: 'inactive' };
  if (route.kind !== 'trace') return { kind: 'invalid' };
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
    perses: createTraceInvestigationPersesResults(query, request.data)
  };
}
