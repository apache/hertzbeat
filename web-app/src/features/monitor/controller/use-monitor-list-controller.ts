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
import { App } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import {
  classifyMonitorReadError, loadMonitorApps, loadMonitors, MonitorContractError, mutateMonitors,
  type Monitor, type MonitorAction
} from '../api/monitor-api';
import { useMonitorSelection } from '../hooks/use-monitor-selection';
import {
  buildMonitorRoutePath, monitorAppOptions, monitorSelectionScope, readMonitorQuery, writeMonitorQuery,
  type MonitorQuery
} from '../model/monitor-model';
import type { MonitorAppsEvidence, MonitorListEvidence } from '../model/monitor-list-model';
import { monitorQueryKeys } from './monitor-query-keys';

export function useMonitorListController() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const query = readMonitorQuery(params);
  const source = writeMonitorQuery(query).toString();
  const [draftState, setDraftState] = useState({ source, search: query.search, labels: query.labels });
  const [operating, setOperating] = useState(false);
  const queryChanged = draftState.source !== source;
  const draft = queryChanged ? { search: query.search, labels: query.labels } : {
    search: draftState.search, labels: draftState.labels
  };
  const monitors = useQuery({
    queryKey: monitorQueryKeys.list(query), queryFn: ({ signal }) => loadMonitors(query, signal), retry: false
  });
  const apps = useQuery({
    queryKey: monitorQueryKeys.apps(), queryFn: ({ signal }) => loadMonitorApps(signal), retry: false
  });
  const records = monitors.data?.content;
  const selection = useMonitorSelection(monitorSelectionScope(query), records);
  const updateQuery = (patch: Partial<MonitorQuery>) => setParams(writeMonitorQuery({ ...query, ...patch }));
  const reread = () => queryClient.fetchQuery({
    queryKey: monitorQueryKeys.list(query), queryFn: ({ signal }) => loadMonitors(query, signal), staleTime: 0
  });
  const run = async (action: MonitorAction, ids: number[]) => {
    if (operating || ids.length === 0) return;
    setOperating(true);
    try {
      await mutateMonitors(action, ids);
      const canonical = await reread();
      requireMutationConvergence(action, ids, canonical.content);
      selection.clear();
      void message.success(t('monitorActions.success'));
    } catch {
      void message.error(t('monitorActions.failed'));
    } finally {
      setOperating(false);
    }
  };
  const runBulk = (action: MonitorAction) => run(action, selection.validatedIds());
  return {
    state: {
      query, draft, operating, selectedIds: selection.selectedIds,
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
      refresh: () => reread().then(() => undefined).catch(() => undefined),
      create: () => { void navigate('/monitors/new'); },
      open: (id: number, mode: 'view' | 'edit') => {
        void navigate(buildMonitorRoutePath(id, mode, `${location.pathname}${location.search}`));
      },
      run, runBulk, selectIds: selection.selectIds
    }
  };
}

function resolveMonitorEvidence(pending: boolean, error: Error | null, page: Awaited<ReturnType<typeof loadMonitors>> | undefined): MonitorListEvidence {
  if (pending) return { kind: 'loading' };
  if (error) return { kind: classifyMonitorReadError(error) };
  if (!page) return { kind: 'error' };
  if (page.content.length === 0 && page.totalElements === 0) return { kind: 'empty' };
  return { kind: 'ready', records: page.content, total: page.totalElements };
}

function resolveAppsEvidence(pending: boolean, error: Error | null, apps: Awaited<ReturnType<typeof loadMonitorApps>> | undefined): MonitorAppsEvidence {
  if (pending) return { kind: 'loading' };
  if (error) return { kind: classifyMonitorReadError(error) };
  if (!apps) return { kind: 'error' };
  return { kind: 'ready', options: monitorAppOptions(apps) };
}

function requireMutationConvergence(action: MonitorAction, ids: number[], records: Monitor[]) {
  const indexed = new Map(records.map(record => [record.id, record]));
  if (action === 'delete' && ids.some(id => indexed.has(id))) {
    throw new MonitorContractError('Deleted monitor remains in the authoritative list');
  }
  const expectedStatus = action === 'enable' ? 1 : action === 'pause' ? 0 : undefined;
  if (expectedStatus !== undefined && ids.some(id => indexed.get(id)?.status !== expectedStatus)) {
    throw new MonitorContractError('Monitor status did not converge after mutation');
  }
}
