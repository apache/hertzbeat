/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { QueryClient } from '@tanstack/react-query';

import type { ExclusiveOperation } from '@/shared/exclusive-operation/use-exclusive-operation';

import { loadStatusOrg, saveStatusOrg } from '../api/status-management-api';
import type { StatusOrg, StatusOrgRecord } from '../model/status-management-contract';
import {
  isAmbiguousStatusWriteFailure,
  requireCreatedStatusOrgWritable,
  requireStatusOrgWritable
} from './status-management-canonical-proof';
import { statusManagementQueryKeys } from './status-management-query-keys';
import type { StatusOperationOwner } from './status-transaction-recovery';
import type { StatusManagementNotifications } from './use-status-management-notifications';

type OrgWriteReceipt = {
  owner: StatusOperationOwner;
  value: StatusOrg;
  expected: StatusOrgRecord | undefined;
};

export type OrgWriteRecovery = {
  stage: 'proof' | 'commit-uncertain';
  receipt: OrgWriteReceipt;
};

export type OrgWriteContext = {
  command: ExclusiveOperation;
  notify: StatusManagementNotifications;
  queryClient: QueryClient;
  recovery: React.RefObject<OrgWriteRecovery | undefined>;
  proofPending: React.RefObject<boolean>;
  setSaving: (value: boolean) => void;
  setWriteRecovery: (value: OrgWriteRecovery['stage'] | undefined) => void;
};

export async function startStatusOrgSave(context: OrgWriteContext, org: StatusOrgRecord | undefined, value: StatusOrg) {
  if (context.recovery.current) throw new StatusCommandBusyError();
  const owner = context.command.begin();
  if (!owner) throw new StatusCommandBusyError();
  const receipt = { owner, value: { ...org, ...value }, expected: org };
  context.setSaving(true);
  try {
    const canonical = await saveStatusOrg(receipt.value);
    if (receipt.expected) requireStatusOrgWritable(canonical, receipt.value);
    else requireCreatedStatusOrgWritable(canonical, receipt.value);
    completeStatusOrgWrite(context, canonical, owner);
    return canonical;
  } catch (error) {
    if (!context.command.isCurrent(owner)) throw error;
    if (!isAmbiguousStatusWriteFailure(error)) return rejectStatusOrgWrite(context, owner, error);
    if (!receipt.expected) {
      retainStatusOrgWrite(context, 'commit-uncertain', receipt);
      context.notify.writeUnverified();
      throw error;
    }
    return proveOrRetainStatusOrgWrite(context, receipt, error);
  } finally {
    if (context.command.isCurrent(owner)) context.setSaving(false);
  }
}

export async function retryStatusOrgWrite(context: OrgWriteContext) {
  const retained = context.recovery.current;
  if (!retained || retained.stage !== 'proof' || context.proofPending.current) return undefined;
  if (!context.command.isCurrent(retained.receipt.owner)) return undefined;
  context.proofPending.current = true;
  context.setSaving(true);
  try {
    const canonical = await proveStatusOrgWrite(retained.receipt);
    if (!context.command.isCurrent(retained.receipt.owner)) return undefined;
    context.recovery.current = undefined;
    context.setWriteRecovery(undefined);
    context.proofPending.current = false;
    completeStatusOrgWrite(context, canonical, retained.receipt.owner);
    return canonical;
  } catch {
    return undefined;
  } finally {
    if (context.command.isCurrent(retained.receipt.owner)) {
      context.proofPending.current = false;
      context.setSaving(false);
    }
  }
}

async function proveOrRetainStatusOrgWrite(context: OrgWriteContext, receipt: OrgWriteReceipt, error: unknown) {
  try {
    const canonical = await proveStatusOrgWrite(receipt);
    completeStatusOrgWrite(context, canonical, receipt.owner);
    return canonical;
  } catch {
    if (context.command.isCurrent(receipt.owner)) retainStatusOrgWrite(context, 'proof', receipt);
    throw error;
  }
}

async function proveStatusOrgWrite(receipt: OrgWriteReceipt) {
  const canonical = await loadStatusOrg();
  requireStatusOrgWritable(canonical, receipt.value);
  return canonical;
}

function completeStatusOrgWrite(context: OrgWriteContext, canonical: StatusOrgRecord, owner: StatusOperationOwner) {
  if (!context.command.isCurrent(owner)) return;
  context.queryClient.setQueryData(statusManagementQueryKeys.org(), canonical);
  context.notify.saveSuccess();
  context.setSaving(false);
  context.command.end(owner);
}

function retainStatusOrgWrite(context: OrgWriteContext, stage: OrgWriteRecovery['stage'], receipt: OrgWriteReceipt) {
  context.recovery.current = { stage, receipt };
  context.setWriteRecovery(stage);
}

function rejectStatusOrgWrite(context: OrgWriteContext, owner: StatusOperationOwner, error: unknown): never {
  context.notify.saveFailed();
  context.setSaving(false);
  context.command.end(owner);
  throw error;
}

class StatusCommandBusyError extends Error {
  constructor() {
    super('Another status-management command is already running');
    this.name = 'StatusCommandBusyError';
  }
}
