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
  type MonitorDefinitionFailureKind,
  userCanWriteMonitorDefinitions
} from '../model/monitor-definition-model';
import { monitorDefinitionQueryKeys } from './monitor-definition-query-keys';
import { useMonitorDefinitionDelete } from './use-monitor-definition-delete';
import { useMonitorDefinitionWorkspace } from './use-monitor-definition-workspace';

export function useMonitorDefinitionController() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language ?? 'en-US';
  const session = useSession().session;
  const canWrite = userCanWriteMonitorDefinitions(session?.roles ?? []);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const catalogQueryKey = monitorDefinitionQueryKeys.catalog(language);
  const catalog = useQuery({
    queryKey: catalogQueryKey,
    queryFn: ({ signal }) => loadMonitorDefinitionCatalog(language, signal)
  });
  const changed = () => {
    void queryClient.invalidateQueries({ queryKey: monitorDefinitionQueryKeys.all });
  };
  const catalogProof = {
    load: async (signal: AbortSignal) => {
      await queryClient.cancelQueries({ queryKey: catalogQueryKey });
      signal.throwIfAborted();
      return loadMonitorDefinitionCatalog(language, signal);
    },
    publish: (value: NonNullable<typeof catalog.data>) => queryClient.setQueryData(catalogQueryKey, value)
  };
  const workspace = useMonitorDefinitionWorkspace({ canWrite, catalogProof, language, onChanged: changed });
  const deletion = useMonitorDefinitionDelete(canWrite, catalogProof, changed);
  const records = catalog.data?.items ?? [];
  const failure = catalog.error instanceof MonitorDefinitionRequestError ? catalog.error.kind : 'error';
  let listState: ListState = { kind: 'ready' };
  if (catalog.isPending) listState = { kind: 'loading' };
  else if (catalog.isError) listState = { kind: 'error', failure };
  else if (records.length === 0) listState = { kind: 'empty' };
  return {
    canWrite,
    deleteFailure: deletion.deleteFailure,
    deletePending: deletion.deletePending,
    deleteTarget: deletion.deleteTarget,
    deleteWriteRecovery: deletion.deleteWriteRecovery,
    items: filterMonitorDefinitions(records, search),
    listState,
    notice: deletion.notice,
    search,
    workspace: workspace.workspace,
    actions: {
      ...workspace.actions,
      ...deletion.actions,
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
