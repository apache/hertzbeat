/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useLayoutEffect, useRef, useState } from 'react';
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
import {
  type StatusDeleteReceipt,
  type StatusWriteRecovery,
  useStatusOperationScope
} from './status-transaction-recovery';
import type { StatusManagementNotifications } from './use-status-management-notifications';

type IncidentEditor = { complete: (epoch: number) => void; currentEpoch: () => number; retireDetail: () => void };

export function useStatusIncidentTransactions(
  query: StatusIncidentQuery,
  command: ExclusiveOperation,
  editor: IncidentEditor,
  notify: StatusManagementNotifications
) {
  const [saving, setSaving] = useState(false);
  const [writeRecovery, setWriteRecovery] = useState<'proof' | 'commit-uncertain'>();
  const [deleteRecovery, setDeleteRecovery] = useState(false);
  const [deleteRecoveryPending, setDeleteRecoveryPending] = useState(false);
  const latestQuery = useRef(query);
  useLayoutEffect(() => {
    latestQuery.current = query;
  }, [query]);
  const queryClient = useQueryClient();
  const committedDeletes = useRef(new Set<number>());
  const writeRecoveryProofPending = useRef(false);
  const deleteRecoveryProofPending = useRef(false);
  const writeOperation = useStatusOperationScope(command);
  const deleteOperation = useStatusOperationScope(command);
  const writeRecoveryRef = useRef<StatusWriteRecovery<StatusIncident> | undefined>(undefined);
  const deleteRecoveryRef = useRef<StatusDeleteReceipt | undefined>(undefined);
  const writeContext: IncidentWriteContext = {
    query: latestQuery,
    command: writeOperation.command,
    editor,
    notify,
    queryClient,
    committedDeletes,
    recovery: writeRecoveryRef,
    recoveryProofPending: writeRecoveryProofPending,
    setSaving,
    setWriteRecovery
  };
  const deleteContext: IncidentDeleteContext = {
    query: latestQuery,
    command: deleteOperation.command,
    retireDetail: editor.retireDetail,
    notify,
    queryClient,
    committedDeletes,
    recovery: deleteRecoveryRef,
    recoveryProofPending: deleteRecoveryProofPending,
    setDeleteRecovery,
    setDeleteRecoveryPending
  };
  return {
    save: (value: StatusIncident) => startIncidentSave(writeContext, value),
    retryWrite: () => retryIncidentWrite(writeContext),
    remove: (id: number) => startIncidentRemove(deleteContext, id),
    refresh: () => refreshIncidentProjection(deleteContext),
    retireWrite: () => {
      writeOperation.retire();
      writeRecoveryRef.current = undefined;
      writeRecoveryProofPending.current = false;
      setSaving(false);
      setWriteRecovery(undefined);
    },
    retireDelete: () => {
      deleteOperation.retire();
      deleteRecoveryRef.current = undefined;
      deleteRecoveryProofPending.current = false;
      setDeleteRecovery(false);
      setDeleteRecoveryPending(false);
    },
    saving,
    writeRecovery,
    deleteRecovery,
    deleteRecoveryPending
  };
}
