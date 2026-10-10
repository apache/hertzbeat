/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
          refreshRevision,
          query.source
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
            refreshRevision,
            query.source
          )
        ]
      : ['explore-investigation', 'trace', 'inactive'],
    queryFn: traceRoute
      ? ({ signal }) =>
          loadTraceInvestigation(traceRoute.traceId, traceRoute.spanId, traceRoute.window, signal, query.source)
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
        ? { traceId: part.traceId, ...('source' in part ? { source: part.source } : {}) }
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
