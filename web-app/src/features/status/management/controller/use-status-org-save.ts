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

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { ExclusiveOperation } from '@/shared/exclusive-operation/use-exclusive-operation';

import type { StatusOrg, StatusOrgRecord } from '../model/status-management-contract';
import {
  retryStatusOrgWrite,
  startStatusOrgSave,
  type OrgWriteContext,
  type OrgWriteRecovery
} from './status-org-write-operations';
import { useStatusOperationScope } from './status-transaction-recovery';
import type { StatusManagementNotifications } from './use-status-management-notifications';

export function useStatusOrgSave(
  org: StatusOrgRecord | undefined,
  command: ExclusiveOperation,
  notify: StatusManagementNotifications
) {
  const [saving, setSaving] = useState(false);
  const [writeRecovery, setWriteRecovery] = useState<OrgWriteRecovery['stage']>();
  const operation = useStatusOperationScope(command);
  const recovery = useRef<OrgWriteRecovery | undefined>(undefined);
  const proofPending = useRef(false);
  const context: OrgWriteContext = {
    command: operation.command,
    notify,
    queryClient: useQueryClient(),
    recovery,
    proofPending,
    setSaving,
    setWriteRecovery
  };
  return {
    save: (value: StatusOrg) => startStatusOrgSave(context, org, value),
    retryWrite: () => retryStatusOrgWrite(context),
    retireWrite: () => {
      operation.retire();
      recovery.current = undefined;
      proofPending.current = false;
      setSaving(false);
      setWriteRecovery(undefined);
    },
    saving,
    writeRecovery
  };
}
