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
          refreshRevision,
          query.source
        )
      : ['explore-investigation', 'log', 'inactive'],
    queryFn: logRoute
      ? ({ signal }) => loadLogInvestigation(logRoute.logRecordUid, logRoute.window, signal, query.source)
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
