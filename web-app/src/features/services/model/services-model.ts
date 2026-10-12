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

import {
  classifyEntityReadError,
  type EntityDetail,
  type EntityPage,
  type EntityRedSignal
} from '@/features/entity/queries';
import type { OptionalRemoteValueState, RemoteFailureKind } from '@/shared/remote-state';
import type { ServicesQuery } from '@/shared/navigation/services-path';
import type { ServicePerformancePage } from '../model/service-performance-model';
import { normalizeInvestigationTimeZone } from '@/shared/query-context';
import { createGlobalTimeState, globalTimeWindow, updateGlobalRange, type GlobalTimeRange } from '@/shared/time';
export type ServiceOperation = {
  value: string;
  traceCount: number;
  errorTraceCount: number;
  latencyAvgMs: number | null;
  latencyP95Ms: number | null;
};

export type ServiceRead<Data> = OptionalRemoteValueState<Data, RemoteFailureKind>;
export type ServicesViewModel = {
  query: ServicesQuery;
  draft: { search: string; environment: string; range?: GlobalTimeRange | undefined };
  list: ServiceRead<EntityPage>;
  performance?: ServiceRead<ServicePerformancePage> | undefined;
  detail: ServiceRead<EntityDetail>;
  identity?: EntityRedSignal['identity'] | undefined;
  red: ServiceRead<EntityRedSignal>;
  operations: ServiceRead<ServiceOperation[]>;
  freshness: ServiceRead<number | null>;
  validWindow: boolean;
  timeLabel: string;
  paths: { traces: string; logs: string; metrics: string; entity?: string | undefined };
};
export type ServicesViewProps = { state: ServicesViewModel; actions: ServicesActions };
export type ServicesActions = {
  updateDraft: (draft: ServicesViewModel['draft']) => void;
  query: () => void;
  select: (id: number, identity?: ServicesViewModel['identity']) => void;
  directoryQuery: (patch: Pick<ServicesQuery, 'view' | 'sort' | 'order' | 'search' | 'environmentFilter'>) => void;
  directory: () => void;
  page: (index: number) => void;
  operation: (name: string, errorsOnly: boolean) => void;
  open: (path: string) => void;
  refresh: () => void;
};

export function serviceRead<Data>(
  result: { data: Data | undefined; isPending: boolean; isFetching: boolean; error: unknown },
  enabled = true
): ServiceRead<Data> {
  if (!enabled) return { kind: 'idle' };
  if (result.error) return { kind: classifyEntityReadError(result.error) };
  if (result.isPending || result.isFetching) return { kind: 'loading' };
  return result.data === undefined ? { kind: 'error' } : { kind: 'ready', data: result.data };
}

export function committedServiceQuery(
  source: ServicesQuery,
  draft: ServicesViewModel['draft'],
  now: number
): ServicesQuery {
  const changed = (source.search ?? '') !== draft.search || (source.environmentFilter ?? '') !== draft.environment;
  const query = changed
    ? {
        view: source.view,
        sort: source.sort,
        order: source.order,
        search: draft.search,
        environmentFilter: draft.environment,
        start: source.start,
        end: source.end,
        timeZone: source.timeZone,
        entityId: undefined,
        operation: undefined
      }
    : source;
  if (!draft.range) return query;
  const window = globalTimeWindow(updateGlobalRange(createGlobalTimeState(now), draft.range, now));
  return {
    ...query,
    start: window.from,
    end: window.to,
    timeZone: normalizeInvestigationTimeZone(source.timeZone) ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}
