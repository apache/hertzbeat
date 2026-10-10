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

import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { buildEntityDetailPath } from '@/shared/navigation/app-paths';
import {
  buildServicesPath,
  parseServicesQuery,
  servicesExactWindow,
  type ServicesQuery
} from '@/shared/navigation/services-path';
import { useQueryDraft } from '@/shared/query-context';
import { formatShortLocalTimeRange, useSharedTime } from '@/shared/time';
import { buildServiceSignalPath } from '../model/services-navigation';
import {
  serviceRead,
  committedServiceQuery,
  type ServicesActions,
  type ServicesViewModel
} from '../model/services-model';
import { useServiceQueries } from './use-service-queries';

export function useServicesController(): { state: ServicesViewModel; actions: ServicesActions } {
  const [params, setParams] = useSearchParams();
  const source = parseServicesQuery(params);
  const time = useSharedTime();
  const navigate = useNavigate();
  const query = withInitialWindow(source, time.window);
  const canonical = buildServicesPath(query);
  useEffect(() => {
    if (!params.has('start') && !params.has('end')) setParams(canonical.split('?')[1] ?? '', { replace: true });
  }, [canonical, params, setParams]);
  const window = servicesExactWindow(query);
  const draft = useQueryDraft<ServicesViewModel['draft']>(params.toString(), {
    search: source.search ?? '',
    environment: source.environmentFilter ?? ''
  });
  const { list, performance, detail, red, operations, freshness, enabled, validId, refresh } = useServiceQueries(
    query,
    time.refreshRevision
  );
  const signalSource = withSignalIdentity(query, red.error ? undefined : red.data?.identity);
  const paths = servicePaths(signalSource, enabled);
  const update = (next: ServicesQuery) => setParams(buildServicesPath(next).split('?')[1] ?? '');
  return {
    state: {
      query,
      draft: draft.value,
      list: serviceRead(list),
      performance: serviceRead(performance),
      detail: serviceRead(detail, validId),
      identity: enabled ? red.data?.identity : undefined,
      red: serviceRead(red, enabled),
      operations: serviceRead(operations, enabled),
      freshness: serviceRead(freshness, enabled),
      validWindow: Boolean(window),
      timeLabel: window ? formatShortLocalTimeRange(window.from, window.to) : '',
      paths
    },
    actions: {
      updateDraft: draft.setValue,
      query: () => {
        if (window || draft.value.range) update(committedServiceQuery(query, draft.value, Date.now()));
      },
      select: (id, identity) => update(withSignalIdentity(selectedServiceQuery(query, id), identity)),
      directoryQuery: patch => update({ ...selectedServiceQuery(query), ...patch, pageIndex: undefined }),
      directory: () => update(selectedServiceQuery(query)),
      page: pageIndex => update({ ...query, pageIndex }),
      operation: (operation, errorsOnly) => {
        const next = { ...signalSource, operation, errorsOnly };
        void navigate(buildServiceSignalPath(next, 'traces'));
      },
      open: path => void navigate(path),
      refresh
    }
  };
}

function withInitialWindow(source: ServicesQuery, window: { from: number; to: number } | undefined): ServicesQuery {
  if (source.start != null || source.end != null || !window) return source;
  return { ...source, start: window.from, end: window.to, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
}
function servicePaths(source: ServicesQuery, selected: boolean) {
  if (source.entityId && !selected) return { traces: '', logs: '', metrics: '' };
  const valid = servicesExactWindow(source);
  const query = selected ? source : { ...source, entityId: undefined };
  return {
    traces: valid ? buildServiceSignalPath(query, 'traces') : '/explore?signal=traces',
    logs: valid ? buildServiceSignalPath(query, 'logs') : '/explore?signal=logs',
    metrics: valid ? buildServiceSignalPath(query, 'metrics') : '/explore?signal=metrics',
    ...(selected ? { entity: buildEntityDetailPath(Number(source.entityId)) } : {})
  };
}

function selectedServiceQuery(query: ServicesQuery, id?: number): ServicesQuery {
  return {
    view: query.view,
    sort: query.sort,
    order: query.order,
    search: query.search,
    environmentFilter: query.environmentFilter,
    pageIndex: query.pageIndex,
    start: query.start,
    end: query.end,
    timeZone: query.timeZone,
    entityId: id === undefined ? undefined : String(id)
  };
}

function withSignalIdentity(query: ServicesQuery, identity: ServicesViewModel['identity']) {
  return identity
    ? {
        ...query,
        serviceName: identity.serviceName,
        serviceNamespace: identity.serviceNamespace ?? undefined,
        environment: identity.deploymentEnvironment ?? undefined
      }
    : query;
}
