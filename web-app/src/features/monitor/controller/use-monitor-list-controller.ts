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

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { classifyMonitorReadError, loadMonitorApps, loadMonitors } from '../api/monitor-api';
import {
  buildMonitorRoutePath,
  monitorAppOptions,
  monitorSelectionScope,
  readMonitorQuery,
  writeMonitorQuery,
  type MonitorQuery
} from '../model/monitor-model';
import type { MonitorAppsEvidence, MonitorListEvidence } from '../model/monitor-list-model';
import { monitorQueryKeys } from './monitor-query-keys';
import { useMonitorListCommands } from './use-monitor-list-commands';
import { useMonitorSelection } from './use-monitor-selection';

export function useMonitorListController() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const query = readMonitorQuery(params);
  const source = writeMonitorQuery(query).toString();
  const [draftState, setDraftState] = useState({ source, search: query.search, labels: query.labels });
  const queryChanged = draftState.source !== source;
  const draft = queryChanged
    ? { search: query.search, labels: query.labels }
    : {
        search: draftState.search,
        labels: draftState.labels
      };
  const { monitors, apps, reread } = useMonitorListResources(query);
  const records = monitors.data?.content;
  const selection = useMonitorSelection(monitorSelectionScope(query), records);
  const commands = useMonitorListCommands(source, reread, selection);
  const updateQuery = (patch: Partial<MonitorQuery>) => setParams(writeMonitorQuery({ ...query, ...patch }));
  return {
    state: {
      query,
      draft,
      operating: commands.operating,
      selectedIds: selection.selectedIds,
      monitors: resolveMonitorEvidence(monitors.isPending, monitors.error, monitors.data),
      apps: resolveAppsEvidence(apps.isPending, apps.error, apps.data),
      refreshing: monitors.isFetching
    },
    actions: {
      setSearch: (search: string) => setDraftState({ source, search, labels: draft.labels }),
      setLabels: (labels: string) => setDraftState({ source, search: draft.search, labels }),
      submitSearch: () => updateQuery({ search: draft.search.trim(), pageIndex: 0 }),
      submitFilters: () => updateQuery({ search: draft.search.trim(), labels: draft.labels.trim(), pageIndex: 0 }),
      changeApp: (app: string) => updateQuery({ app, pageIndex: 0 }),
      changeStatus: (status: string) => updateQuery({ status, pageIndex: 0 }),
      changePage: (page: number, pageSize: number) => updateQuery({ pageIndex: page - 1, pageSize }),
      refresh: commands.refresh,
      create: () => {
        void navigate('/monitors/new');
      },
      open: (id: number, mode: 'view' | 'edit') => {
        void navigate(buildMonitorRoutePath(id, mode, `${location.pathname}${location.search}`));
      },
      run: commands.run,
      runBulk: commands.runBulk,
      selectIds: selection.selectIds
    }
  };
}

function useMonitorListResources(query: MonitorQuery) {
  const queryClient = useQueryClient();
  const monitors = useQuery({
    queryKey: monitorQueryKeys.list(query),
    queryFn: ({ signal }) => loadMonitors(query, signal),
    retry: false
  });
  const apps = useQuery({
    queryKey: monitorQueryKeys.apps(),
    queryFn: ({ signal }) => loadMonitorApps(signal),
    retry: false
  });
  const reread = () =>
    queryClient.fetchQuery({
      queryKey: monitorQueryKeys.list(query),
      queryFn: ({ signal }) => loadMonitors(query, signal),
      staleTime: 0
    });
  return { monitors, apps, reread };
}

function resolveMonitorEvidence(
  pending: boolean,
  error: Error | null,
  page: Awaited<ReturnType<typeof loadMonitors>> | undefined
): MonitorListEvidence {
  if (pending) return { kind: 'loading' };
  if (error) return { kind: classifyMonitorReadError(error) };
  if (!page) return { kind: 'error' };
  if (page.content.length === 0 && page.totalElements === 0) return { kind: 'empty' };
  return { kind: 'ready', records: page.content, total: page.totalElements };
}

function resolveAppsEvidence(
  pending: boolean,
  error: Error | null,
  apps: Awaited<ReturnType<typeof loadMonitorApps>> | undefined
): MonitorAppsEvidence {
  if (pending) return { kind: 'loading' };
  if (error) return { kind: classifyMonitorReadError(error) };
  if (!apps) return { kind: 'error' };
  return { kind: 'ready', options: monitorAppOptions(apps) };
}
