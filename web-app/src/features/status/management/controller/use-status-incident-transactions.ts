/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useLayoutEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { ExclusiveOperation } from '@/shared/exclusive-operation/use-exclusive-operation';

import type { StatusIncident } from '../model/status-management-contract';
import type { StatusIncidentQuery } from '../model/status-incident-query';
import {
  refreshIncidentProjection,
  startIncidentRemove,
  type IncidentDeleteContext
} from './status-incident-delete-operations';
import { retryIncidentWrite, startIncidentSave, type IncidentWriteContext } from './status-incident-write-operations';
import { useStatusDeleteRecovery, useStatusWriteRecovery } from './status-transaction-recovery';
import type { StatusManagementNotifications } from './use-status-management-notifications';

type IncidentEditor = { complete: (epoch: number) => void; currentEpoch: () => number; retireDetail: () => void };

export function useStatusIncidentTransactions(
  query: StatusIncidentQuery,
  command: ExclusiveOperation,
  editor: IncidentEditor,
  notify: StatusManagementNotifications
) {
  const latestQuery = useLatestIncidentQuery(query);
  const queryClient = useQueryClient();
  const committedDeletes = useRef(new Set<number>());
  const write = useStatusWriteRecovery<StatusIncident>(command);
  const deletion = useStatusDeleteRecovery(command);
  const writeContext: IncidentWriteContext = {
    ...write.context,
    query: latestQuery,
    editor,
    notify,
    queryClient,
    committedDeletes
  };
  const deleteContext: IncidentDeleteContext = {
    ...deletion.context,
    query: latestQuery,
    retireDetail: editor.retireDetail,
    notify,
    queryClient,
    committedDeletes
  };
  return {
    save: (value: StatusIncident) => startIncidentSave(writeContext, value),
    retryWrite: () => retryIncidentWrite(writeContext),
    remove: (id: number) => startIncidentRemove(deleteContext, id),
    refresh: () => refreshIncidentProjection(deleteContext),
    retireWrite: write.retire,
    retireDelete: deletion.retire,
    saving: write.saving,
    writeRecovery: write.stage,
    deleteRecovery: deletion.recovering,
    deleteRecoveryPending: deletion.proofPendingState
  };
}

function useLatestIncidentQuery(query: StatusIncidentQuery) {
  const latestQuery = useRef(query);
  useLayoutEffect(() => {
    latestQuery.current = query;
  }, [query]);
  return latestQuery;
}
