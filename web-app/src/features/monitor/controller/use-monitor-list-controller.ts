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

import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useQueryDraft } from '@/shared/query-context';

import { classifyMonitorReadError, loadMonitorApps, loadMonitors } from '../api/monitor-api';
import {
  monitorAppOptions,
  monitorSelectionScope,
  readMonitorQuery,
  writeMonitorQuery,
  type MonitorQuery
} from '../model/monitor-model';
import type { MonitorAppsEvidence, MonitorListEvidence } from '../model/monitor-list-model';
import { useMonitorExport } from './use-monitor-export';
import { useMonitorCapabilities } from './use-monitor-capabilities';
import { useMonitorImport } from './use-monitor-import';
import { useMonitorListCommands } from './use-monitor-list-commands';
import { useMonitorListNavigation } from './use-monitor-list-navigation';
import { useMonitorListResources } from './use-monitor-list-resources';
import { useMonitorListSnapshot } from './use-monitor-list-snapshot';
import { useMonitorPageCorrection } from './use-monitor-page-correction';
import { useMonitorSelection } from './use-monitor-selection';

export { monitorListAutoRefreshMs, monitorListQueryOptions } from './use-monitor-list-resources';

export function useMonitorListController() {
  const capabilities = useMonitorCapabilities();
  const [params, setParams] = useSearchParams();
  const query = readMonitorQuery(params);
  const source = writeMonitorQuery(query).toString();
  const canonicalDraft = useMemo(() => ({ search: query.search, labels: query.labels }), [query.labels, query.search]);
  const draft = useQueryDraft(source, canonicalDraft);
  const { monitors, apps, readMode, reread } = useMonitorListResources(query);
  useMonitorPageCorrection(query, monitors.data, setParams);
  const displayPage = useMonitorListSnapshot(source, monitors.data, readMode, monitors.dataUpdatedAt);
  const records = displayPage?.content;
  const selection = useMonitorSelection(monitorSelectionScope(query), source, records);
  const commands = useMonitorListCommands(source, reread, selection, capabilities);
  const navigation = useMonitorListNavigation(query, capabilities);
  const monitorExport = useMonitorExport(selection.selectedIds, capabilities);
  const monitorImport = useMonitorImport(reread, capabilities, () => selection.selectIds([]));
  const selectionActions = monitorSelectionActions(capabilities.canSelect, selection.selectIds);
  const updateQuery = (patch: Partial<MonitorQuery>) => setParams(writeMonitorQuery({ ...query, ...patch }));
  return {
    state: {
      query,
      draft: draft.value,
      operating: commands.operating || monitorExport.exporting || monitorImport.state.busy,
      selectedIds: selection.selectedIds,
      monitors: resolveMonitorEvidence(monitors.isPending, monitors.error, displayPage),
      apps: resolveAppsEvidence(apps.isPending, apps.error, apps.data),
      refreshing: monitors.isFetching,
      capabilities,
      canExport: monitorExport.canExport,
      monitorImport: monitorImport.state
    },
    actions: {
      setSearch: (search: string) => draft.setValue({ ...draft.value, search }),
      setLabels: (labels: string) => draft.setValue({ ...draft.value, labels }),
      submitSearch: () => updateQuery({ search: draft.value.search.trim(), pageIndex: 0 }),
      submitFilters: () =>
        updateQuery({ search: draft.value.search.trim(), labels: draft.value.labels.trim(), pageIndex: 0 }),
      changeApp: (app: string) => updateQuery({ app, pageIndex: 0 }),
      changeStatus: (status: string) => updateQuery({ status, pageIndex: 0 }),
      changeSort: (sort: MonitorQuery['sort'], order: MonitorQuery['order']) =>
        updateQuery({ sort, order, pageIndex: 0 }),
      changePage: (page: number, pageSize: number) => updateQuery({ pageIndex: page - 1, pageSize }),
      refresh: commands.refresh,
      create: navigation.create,
      open: navigation.open,
      run: commands.run,
      runBulk: commands.runBulk,
      exportSelected: monitorExport.exportSelected,
      exportAll: monitorExport.exportAll,
      copyInstance: commands.copyInstance,
      openImport: monitorImport.actions.open,
      cancelImport: monitorImport.actions.cancel,
      selectImportFile: monitorImport.actions.selectFile,
      submitImport: monitorImport.actions.submit,
      selectIds: selectionActions.selectIds,
      clearSelection: selectionActions.clearSelection
    }
  };
}

function monitorSelectionActions(canSelect: boolean, selectIds: (ids: number[]) => void) {
  return {
    selectIds: (ids: number[]) => {
      if (canSelect) selectIds(ids);
    },
    clearSelection: () => {
      if (canSelect) selectIds([]);
    }
  };
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
