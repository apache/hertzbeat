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

import { useSourceScopedValue } from '@/shared/query-context';

import { classifyEntityReadError, loadEntityMonitors } from '../api/entity-api';
import type { EntityMonitorQuery } from '../model/entity-contract';
import { defaultEntityMonitorQuery, normalizeEntityMonitorQuery } from '../model/entity-monitor-query';
import type { EntityMonitorEvidence } from '../model/entity-view-model';
import { entityQueryKeys } from './entity-query-keys';

type MonitorScope = EntityMonitorQuery & { entityId: number | undefined };

export function useEntityMonitorsController(entityId: number | undefined) {
  const { value: scope, setValue: setScope } = useSourceScopedValue(
    entityId === undefined ? 'missing' : String(entityId),
    monitorScope(entityId)
  );
  const query = normalizeEntityMonitorQuery(scope);
  const result = useQuery({
    queryKey: entityQueryKeys.monitors(entityId, query),
    queryFn: entityId === undefined ? skipToken : ({ signal }) => loadEntityMonitors(entityId, query, signal),
    retry: false
  });
  return {
    state: {
      query,
      evidence: resolveMonitors(result.isPending, result.error, result.data),
      refreshing: result.isFetching && !result.isPending
    },
    actions: {
      changeMonitorPage: (pageIndex: number) => {
        setScope({ ...scope, pageIndex });
      },
      changeMonitorFilters: (filters: Pick<EntityMonitorQuery, 'status' | 'app'>) => {
        setScope({ ...monitorScope(entityId), ...normalizeEntityMonitorQuery(filters) });
      },
      refreshMonitors: () => {
        void result.refetch();
      }
    }
  };
}

function monitorScope(entityId: number | undefined): MonitorScope {
  return { entityId, ...defaultEntityMonitorQuery };
}

function resolveMonitors(
  pending: boolean,
  error: Error | null,
  page: Awaited<ReturnType<typeof loadEntityMonitors>> | undefined
): EntityMonitorEvidence {
  if (pending) return { kind: 'loading' };
  if (error) return { kind: classifyEntityReadError(error) };
  if (!page) return { kind: 'error' };
  if (page.totalElements === 0) return { kind: 'empty' };
  return { kind: 'ready', records: page.content, total: page.totalElements };
}
