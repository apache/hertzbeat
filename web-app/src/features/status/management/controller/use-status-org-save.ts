/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
import type { StatusManagementNotifications } from './use-status-management-notifications';

export function useStatusOrgSave(
  org: StatusOrgRecord | undefined,
  command: ExclusiveOperation,
  notify: StatusManagementNotifications
) {
  const [saving, setSaving] = useState(false);
  const [writeRecovery, setWriteRecovery] = useState<OrgWriteRecovery['stage']>();
  const context: OrgWriteContext = {
    command,
    notify,
    queryClient: useQueryClient(),
    recovery: useRef<OrgWriteRecovery | undefined>(undefined),
    proofPending: useRef(false),
    setSaving,
    setWriteRecovery
  };
  return {
    save: (value: StatusOrg) => startStatusOrgSave(context, org, value),
    retryWrite: () => retryStatusOrgWrite(context),
    saving,
    writeRecovery
  };
}
