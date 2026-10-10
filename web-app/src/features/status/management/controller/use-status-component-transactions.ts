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

import { useRef } from 'react';
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
import { useStatusDeleteRecovery, useStatusWriteRecovery } from './status-transaction-recovery';
import type { StatusManagementNotifications } from './use-status-management-notifications';

type ComponentEditor = { complete: (epoch: number) => void; currentEpoch: () => number };

export function useStatusComponentTransactions(
  command: ExclusiveOperation,
  editor: ComponentEditor,
  notify: StatusManagementNotifications,
  retireIncidentDetail: () => void
) {
  const queryClient = useQueryClient();
  const committedDeletes = useRef(new Set<number>());
  const write = useStatusWriteRecovery<StatusComponent>(command);
  const deletion = useStatusDeleteRecovery(command);
  const writeContext: ComponentWriteContext = {
    ...write.context,
    editor,
    retireIncidentDetail,
    notify,
    queryClient,
    committedDeletes
  };
  const deleteContext: ComponentDeleteContext = {
    ...deletion.context,
    retireIncidentDetail,
    notify,
    queryClient,
    committedDeletes
  };
  return {
    save: (value: StatusComponent) => startComponentSave(writeContext, value),
    retryWrite: () => retryComponentWrite(writeContext),
    remove: (id: number) => startComponentRemove(deleteContext, id),
    refresh: () => refreshComponentProjection(deleteContext),
    retireWrite: write.retire,
    retireDelete: deletion.retire,
    saving: write.saving,
    writeRecovery: write.stage,
    deleteRecovery: deletion.recovering,
    deleteRecoveryPending: deletion.proofPendingState
  };
}
