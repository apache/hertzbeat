/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  classifyMonitorDetailReadError,
  classifyMonitorReadError,
  loadMonitorApps,
  loadMonitorCollectors,
  loadMonitorDetail,
  loadMonitorParamDefines,
  type MonitorScrape
} from '../api/monitor-api';
import { normalizeMonitorScrape, type MonitorEditorMode } from '../api/monitor-contract';
import {
  MonitorParamDraftError,
  type MonitorEditorDraft
} from '../model/monitor-editor-model';
import { monitorEditorQueryKeys } from './monitor-editor-query-keys';
import {
  combineMonitorEditorDefines,
  createMonitorEditorCanonicalDraft,
  selectMonitorEditorApp
} from './monitor-editor-resource-model';

export type MonitorEditorEvidence =
  | { kind: 'loading' }
  | { kind: 'missing' | 'unavailable' | 'error' }
  | { kind: 'ready' };

type ResourceInput = {
  mode: MonitorEditorMode;
  id: number | undefined;
  validRoute: boolean;
  requestedApp: string;
  requestedScrape: MonitorScrape;
  rawScrape: string | null;
};

export function useMonitorEditorResources(input: ResourceInput) {
  const apps = useQuery({
    queryKey: monitorEditorQueryKeys.apps(),
    queryFn: ({ signal }) => loadMonitorApps(signal),
    enabled: input.validRoute,
    retry: false
  });
  const collectors = useQuery({
    queryKey: monitorEditorQueryKeys.collectors(),
    queryFn: ({ signal }) => loadMonitorCollectors(signal),
    enabled: input.validRoute,
    retry: false
  });
  const detail = useQuery({
    queryKey: monitorEditorQueryKeys.detail(input.id),
    queryFn: ({ signal }) => loadMonitorDetail(input.id!, signal),
    enabled: input.mode === 'edit' && input.id !== undefined,
    retry: false
  });
  const app = selectMonitorEditorApp(input.mode, input.requestedApp, detail.data, apps.data);
  const scrape = input.mode === 'edit'
    ? normalizeMonitorScrape(input.rawScrape ?? detail.data?.monitor.scrape)
    : input.requestedScrape;
  const source = `${input.mode}:${input.id ?? 'new'}:${app}:${scrape}`;
  const appDefines = useQuery({
    queryKey: monitorEditorQueryKeys.appDefines(app),
    queryFn: ({ signal }) => loadMonitorParamDefines(app, signal),
    enabled: input.validRoute && Boolean(app),
    retry: false
  });
  const sdDefines = useQuery({
    queryKey: monitorEditorQueryKeys.sdDefines(scrape),
    queryFn: ({ signal }) => loadMonitorParamDefines(scrape, signal),
    enabled: input.validRoute && Boolean(app) && scrape !== 'static',
    retry: false
  });
  const defines = useMemo(
    () => combineMonitorEditorDefines(appDefines.data ?? [], sdDefines.data ?? [], scrape),
    [appDefines.data, scrape, sdDefines.data]
  );
  const canonical = useMemo(() => createMonitorEditorCanonicalDraft({
    mode: input.mode,
    id: input.id,
    app,
    apps: apps.data,
    collectors: collectors.data,
    defines,
    detail: detail.data,
    mainDefines: appDefines.data,
    scrape,
    sdDefines: sdDefines.data
  }), [
    app,
    appDefines.data,
    apps.data,
    collectors.data,
    defines,
    detail.data,
    input.id,
    input.mode,
    scrape,
    sdDefines.data
  ]);
  const canonicalDraft = canonical instanceof MonitorParamDraftError ? undefined : canonical;
  const evidence = resolveEvidence(input, { apps, collectors, detail, appDefines, sdDefines }, app, scrape, canonical);

  const retry = async () => {
    const requests = [
      ...(apps.error ? [apps.refetch()] : []),
      ...(collectors.error ? [collectors.refetch()] : []),
      ...(detail.error && input.mode === 'edit' && input.id !== undefined ? [detail.refetch()] : []),
      ...(appDefines.error && app ? [appDefines.refetch()] : []),
      ...(sdDefines.error && app && scrape !== 'static' ? [sdDefines.refetch()] : [])
    ];
    await Promise.all(requests);
  };

  return {
    app,
    appEvidence: apps.data,
    apps: apps.data ?? [],
    canonicalDraft,
    collectors: collectors.data ?? [],
    defines,
    detail: detail.data,
    evidence,
    retry,
    scrape,
    source
  };
}

type ResourceQueries = {
  apps: UseQueryResult;
  collectors: UseQueryResult;
  detail: UseQueryResult;
  appDefines: UseQueryResult;
  sdDefines: UseQueryResult;
};

function resolveEvidence(input: ResourceInput, queries: ResourceQueries, app: string, scrape: MonitorScrape,
  canonical: MonitorEditorDraft | MonitorParamDraftError | undefined): MonitorEditorEvidence {
  if (isMissingEditRoute(input)) return { kind: 'missing' };
  const readErrorKind = resolveReadErrorKind(queries);
  if (readErrorKind) return { kind: readErrorKind };
  if (canonical instanceof MonitorParamDraftError) return { kind: 'error' };
  if (isActiveResourcePending(input, queries, app, scrape)) return { kind: 'loading' };
  if (!canonical) return missingCanonicalEvidence(input, app);
  return { kind: 'ready' };
}

function isMissingEditRoute(input: ResourceInput) {
  return input.mode === 'edit' && input.id === undefined;
}

function resolveReadErrorKind(queries: ResourceQueries): MonitorEditorEvidence['kind'] | undefined {
  if (queries.detail.error) return classifyMonitorDetailReadError(queries.detail.error);
  const error = [queries.apps, queries.collectors, queries.appDefines, queries.sdDefines]
    .find(query => query.error)?.error;
  return error ? classifyMonitorReadError(error) : undefined;
}

function isActiveResourcePending(
  input: ResourceInput,
  queries: ResourceQueries,
  app: string,
  scrape: MonitorScrape
) {
  return [
    queries.apps.isPending,
    queries.collectors.isPending,
    input.mode === 'edit' && queries.detail.isPending,
    Boolean(app) && queries.appDefines.isPending,
    scrape !== 'static' && queries.sdDefines.isPending
  ].some(Boolean);
}

function missingCanonicalEvidence(input: ResourceInput, app: string): MonitorEditorEvidence {
  return input.mode === 'new' && !app ? { kind: 'ready' } : { kind: 'error' };
}
