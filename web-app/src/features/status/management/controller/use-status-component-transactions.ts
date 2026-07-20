/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { ExclusiveOperation } from '@/shared/exclusive-operation/use-exclusive-operation';

import type { StatusComponent } from '../model/status-management-contract';
import {
  refreshComponentProjection,
  startComponentRemove,
  type ComponentDeleteContext
} from './status-component-delete-operations';
import {
  retryComponentWrite,
  startComponentSave,
  type ComponentWriteContext
} from './status-component-write-operations';
import type { StatusManagementNotifications } from './use-status-management-notifications';

type ComponentEditor = { complete: (epoch: number) => void; currentEpoch: () => number };

export function useStatusComponentTransactions(
  command: ExclusiveOperation,
  editor: ComponentEditor,
  notify: StatusManagementNotifications,
  retireIncidentDetail: () => void
) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [writeRecovery, setWriteRecovery] = useState<'proof' | 'commit-uncertain'>();
  const [deleteRecovery, setDeleteRecovery] = useState(false);
  const [deleteRecoveryPending, setDeleteRecoveryPending] = useState(false);
  const committedDeletes = useRef(new Set<number>());
  const recoveryProofPending = useRef(false);
  const writeContext: ComponentWriteContext = {
    command,
    editor,
    retireIncidentDetail,
    notify,
    queryClient,
    committedDeletes,
    recovery: useRef(undefined),
    recoveryProofPending,
    setSaving,
    setWriteRecovery
  };
  const deleteContext: ComponentDeleteContext = {
    command,
    retireIncidentDetail,
    notify,
    queryClient,
    committedDeletes,
    recovery: useRef(undefined),
    recoveryProofPending,
    setDeleteRecovery,
    setDeleteRecoveryPending
  };
  return {
    save: (value: StatusComponent) => startComponentSave(writeContext, value),
    retryWrite: () => retryComponentWrite(writeContext),
    remove: (id: number) => startComponentRemove(deleteContext, id),
    refresh: () => refreshComponentProjection(deleteContext),
    saving,
    writeRecovery,
    deleteRecovery,
    deleteRecoveryPending
  };
}
