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

import type { QueryClient } from '@tanstack/react-query';

import { loadStatusIncident, loadStatusIncidents } from '../api/status-management-api';
import { StatusManagementContractError, type StatusIncident } from '../model/status-management-contract';
import type { StatusIncidentQuery } from '../model/status-incident-query';
import { requireStatusId, requireStatusIncidentWritable } from './status-management-canonical-proof';
import { statusManagementQueryKeys } from './status-management-query-keys';

export function projectStatusIncidents(
  queryClient: QueryClient,
  query: StatusIncidentQuery,
  committedDeletes: Set<number>,
  before?: (signal: AbortSignal) => Promise<void>,
  isCurrent?: () => boolean
) {
  return queryClient.fetchQuery({
    queryKey: statusManagementQueryKeys.incidents(query),
    queryFn: async ({ signal }) => {
      await before?.(signal);
      requireCurrentProjection(isCurrent);
      const page = await loadStatusIncidents(query, signal);
      requireCurrentProjection(isCurrent);
      if (page.content.some(record => record.id != null && committedDeletes.has(record.id))) {
        throw new StatusManagementContractError();
      }
      committedDeletes.clear();
      return page;
    },
    staleTime: 0,
    retry: false
  });
}

export function projectStatusIncidentUpdate(
  queryClient: QueryClient,
  query: StatusIncidentQuery,
  committedDeletes: Set<number>,
  value: StatusIncident,
  isCurrent?: () => boolean
) {
  if (value.id == null) return projectStatusIncidents(queryClient, query, committedDeletes, undefined, isCurrent);
  const id = requireStatusId(value.id);
  return projectStatusIncidents(
    queryClient,
    query,
    committedDeletes,
    async signal => {
      requireStatusIncidentWritable(await loadStatusIncident(id, signal), value);
    },
    isCurrent
  );
}

function requireCurrentProjection(isCurrent: (() => boolean) | undefined) {
  if (isCurrent && !isCurrent()) throw new StatusManagementContractError();
}
