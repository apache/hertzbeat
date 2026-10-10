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

import { loadAlertInvestigation } from '../api/alert-investigation-api';
import { AlertInvestigationContractError } from '../api/alert-investigation-schema';
import type { AlertInvestigationViewState } from '../model/alert-investigation-contract';
import { createAlertInvestigationPersesResults } from '../model/alert-investigation-perses-model';
import type { AlertInvestigationRoute } from '../model/alert-investigation-route';
import { alertInvestigationQueryKeys } from './alert-investigation-query-keys';

export function useAlertInvestigationController(route: AlertInvestigationRoute) {
  const readyRoute = route.kind === 'ready' ? route : undefined;
  const session = useSession();
  const workspaceId = session.session?.workspaceId ?? undefined;
  const queryScope = readyRoute && workspaceId ? { readyRoute, workspaceId } : undefined;
  const refreshRevision = useSharedTimeOptional()?.refreshRevision ?? 0;
  const query = useQuery({
    queryKey: queryScope
      ? alertInvestigationQueryKeys.detail(
          queryScope.workspaceId,
          queryScope.readyRoute.alertId,
          queryScope.readyRoute.window,
          refreshRevision
        )
      : ['alert-investigation', 'inactive'],
    queryFn: queryScope
      ? ({ signal }) => loadAlertInvestigation(queryScope.readyRoute.alertId, queryScope.readyRoute.window, signal)
      : skipToken,
    retry: false,
    staleTime: 30_000
  });
  return {
    state: investigationState(route, query, session.loading, workspaceId),
    refetch: () => (queryScope ? query.refetch().then(() => undefined) : Promise.resolve())
  };
}

function investigationState(
  route: AlertInvestigationRoute,
  query: {
    data?: Awaited<ReturnType<typeof loadAlertInvestigation>> | undefined;
    error: Error | null;
  },
  sessionLoading: boolean,
  workspaceId: string | undefined
): AlertInvestigationViewState {
  if (route.kind !== 'ready') return { kind: 'invalid' as const };
  if (!workspaceId) return { kind: sessionLoading ? ('loading' as const) : ('unavailable' as const), route };
  if (query.error) {
    return {
      kind:
        query.error instanceof AlertInvestigationContractError ? ('contract_error' as const) : ('unavailable' as const),
      route
    };
  }
  if (!query.data) return { kind: 'loading' as const, route };
  return {
    kind: 'ready',
    route,
    snapshot: query.data,
    perses: createAlertInvestigationPersesResults(query.data)
  };
}
