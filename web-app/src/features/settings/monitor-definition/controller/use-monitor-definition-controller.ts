/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/core/auth/session-context';

import { loadMonitorDefinitionCatalog, MonitorDefinitionRequestError } from '../api/monitor-definition-api';
import {
  filterMonitorDefinitions,
  monitorDefinitionWorkspaceApp,
  type MonitorDefinitionFailureKind,
  userCanWriteMonitorDefinitions
} from '../model/monitor-definition-model';
import { monitorDefinitionQueryKeys } from './monitor-definition-query-keys';
import { useMonitorDefinitionDelete } from './use-monitor-definition-delete';
import { useMonitorDefinitionRouteController } from './use-monitor-definition-route-controller';
import { useMonitorDefinitionVisibility } from './use-monitor-definition-visibility';
import { useMonitorDefinitionWorkspace } from './use-monitor-definition-workspace';

export function useMonitorDefinitionController() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language ?? 'en-US';
  const session = useSession().session;
  const canWrite = userCanWriteMonitorDefinitions(session?.roles ?? []);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { catalog, catalogProof } = useMonitorDefinitionCatalog(language);
  const workspace = useMonitorDefinitionWorkspace({ canWrite, catalogProof, language });
  const routeActions = useMonitorDefinitionRouteController(workspace.workspace, workspace.actions);
  const deletion = useMonitorDefinitionDelete(canWrite, catalogProof, async receipt => {
    if (receipt.disposition === 'removed') {
      await workspace.actions.applyDeleteDisposition(receipt);
      routeActions.clearDeletedApp(receipt.app);
      return;
    }
    await workspace.actions.applyDeleteDisposition(receipt);
  });
  const visibility = useMonitorDefinitionVisibility({ canWrite, catalogProof, queryClient });
  const records = catalog.data?.items ?? [];
  const failure = catalog.error instanceof MonitorDefinitionRequestError ? catalog.error.kind : 'error';
  let listState: ListState = { kind: 'ready' };
  if (catalog.isPending) listState = { kind: 'loading' };
  else if (catalog.isError) listState = { kind: 'error', failure };
  else if (records.length === 0) listState = { kind: 'empty' };
  return buildMonitorDefinitionViewModel({
    canWrite,
    catalog,
    deletion,
    listState,
    records,
    routeActions,
    search,
    setSearch,
    visibility,
    workspace
  });
}

function useMonitorDefinitionCatalog(language: string) {
  const queryClient = useQueryClient();
  const catalogQueryKey = monitorDefinitionQueryKeys.catalog(language);
  const catalog = useQuery({
    queryKey: catalogQueryKey,
    queryFn: ({ signal }) => loadMonitorDefinitionCatalog(language, signal)
  });
  const catalogProof = {
    load: async (signal: AbortSignal) => {
      await queryClient.cancelQueries({ queryKey: catalogQueryKey });
      signal.throwIfAborted();
      return loadMonitorDefinitionCatalog(language, signal);
    },
    publish: (value: NonNullable<typeof catalog.data>) => queryClient.setQueryData(catalogQueryKey, value)
  };
  return { catalog, catalogProof };
}

function buildMonitorDefinitionViewModel(input: {
  canWrite: boolean;
  catalog: ReturnType<typeof useMonitorDefinitionCatalog>['catalog'];
  deletion: ReturnType<typeof useMonitorDefinitionDelete>;
  listState: ListState;
  records: NonNullable<ReturnType<typeof useMonitorDefinitionCatalog>['catalog']['data']>['items'];
  routeActions: ReturnType<typeof useMonitorDefinitionRouteController>;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  visibility: ReturnType<typeof useMonitorDefinitionVisibility>;
  workspace: ReturnType<typeof useMonitorDefinitionWorkspace>;
}) {
  const { canWrite, catalog, deletion, listState, records, routeActions, search, setSearch, visibility, workspace } =
    input;
  return {
    canWrite,
    deleteFailure: deletion.deleteFailure,
    deletePending: deletion.deletePending,
    deleteTarget: deletion.deleteTarget,
    deleteWriteRecovery: deletion.deleteWriteRecovery,
    items: filterMonitorDefinitions(records, search),
    listState,
    notice: deletion.notice,
    visibilityFailure: visibility.failure,
    visibilityPendingApp: visibility.pendingApp,
    search,
    selectedApp: monitorDefinitionWorkspaceApp(workspace.workspace),
    workspace: workspace.workspace,
    actions: {
      ...workspace.actions,
      ...routeActions,
      ...deletion.actions,
      updateVisibility: visibility.updateVisibility,
      refresh: () => void catalog.refetch(),
      setSearch
    }
  };
}

type ListState =
  | { kind: 'loading' }
  | { kind: 'error'; failure: MonitorDefinitionFailureKind }
  | { kind: 'empty' }
  | { kind: 'ready' };
