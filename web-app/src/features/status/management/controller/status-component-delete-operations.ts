/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { QueryClient } from '@tanstack/react-query';

import type { ExclusiveOperation } from '@/shared/exclusive-operation/use-exclusive-operation';

import { deleteStatusComponent, loadStatusComponent } from '../api/status-management-api';
import {
  isAmbiguousStatusWriteFailure,
  proveStatusMissing,
  requireStatusId
} from './status-management-canonical-proof';
import { projectStatusComponents } from './status-component-projection';
import type { StatusDeleteReceipt, StatusOperationOwner } from './status-transaction-recovery';
import type { StatusManagementNotifications } from './use-status-management-notifications';

export type ComponentDeleteContext = {
  command: ExclusiveOperation;
  retireIncidentDetail: () => void;
  notify: StatusManagementNotifications;
  queryClient: QueryClient;
  committedDeletes: React.RefObject<Set<number>>;
  recovery: React.RefObject<StatusDeleteReceipt | undefined>;
  recoveryProofPending: React.RefObject<boolean>;
  setDeleteRecovery: (value: boolean) => void;
  setDeleteRecoveryPending: (value: boolean) => void;
};

export function startComponentRemove(context: ComponentDeleteContext, id: number) {
  const exactId = requireStatusId(id);
  if (context.committedDeletes.current.has(exactId)) return;
  const owner = context.command.begin();
  if (!owner) return;
  context.retireIncidentDetail();
  void runComponentDelete(context, exactId, owner);
}

export async function refreshComponentProjection(context: ComponentDeleteContext) {
  const receipt = context.recovery.current;
  if (receipt && context.command.isCurrent(receipt.owner)) return retryComponentDelete(context, receipt);
  const owner = context.command.begin();
  if (!owner) return false;
  context.retireIncidentDetail();
  try {
    await projectStatusComponents(context.queryClient, context.committedDeletes.current, undefined, undefined, () =>
      context.command.isCurrent(owner)
    );
    return context.command.isCurrent(owner);
  } catch {
    return false;
  } finally {
    context.command.end(owner);
  }
}

async function runComponentDelete(context: ComponentDeleteContext, id: number, owner: StatusOperationOwner) {
  const receipt = { id, owner };
  try {
    await deleteStatusComponent(id);
    if (!context.command.isCurrent(owner)) return;
    markComponentDeleted(context, id);
  } catch (error) {
    if (!context.command.isCurrent(owner)) return;
    if (!isAmbiguousStatusWriteFailure(error)) {
      context.notify.deleteFailed();
      context.command.end(owner);
      return;
    }
  }
  await settleComponentDelete(context, receipt);
}

async function settleComponentDelete(context: ComponentDeleteContext, receipt: StatusDeleteReceipt) {
  try {
    await proveComponentDelete(context, receipt);
    if (!context.command.isCurrent(receipt.owner)) return;
    context.notify.deleteSuccess();
    context.command.end(receipt.owner);
  } catch {
    if (!context.command.isCurrent(receipt.owner)) return;
    context.recovery.current = receipt;
    context.setDeleteRecovery(true);
  }
}

async function retryComponentDelete(context: ComponentDeleteContext, receipt: StatusDeleteReceipt) {
  if (context.recoveryProofPending.current) return false;
  context.recoveryProofPending.current = true;
  context.setDeleteRecoveryPending(true);
  try {
    await proveComponentDelete(context, receipt);
    if (!context.command.isCurrent(receipt.owner)) return false;
    context.recovery.current = undefined;
    context.recoveryProofPending.current = false;
    context.setDeleteRecoveryPending(false);
    context.setDeleteRecovery(false);
    context.notify.deleteSuccess();
    context.command.end(receipt.owner);
    return true;
  } catch {
    if (!context.command.isCurrent(receipt.owner)) return false;
    context.recoveryProofPending.current = false;
    context.setDeleteRecoveryPending(false);
    return false;
  }
}

function proveComponentDelete(context: ComponentDeleteContext, receipt: StatusDeleteReceipt) {
  return projectStatusComponents(
    context.queryClient,
    context.committedDeletes.current,
    async () => {
      await proveStatusMissing(() => loadStatusComponent(receipt.id));
      if (!context.command.isCurrent(receipt.owner)) return;
      if (!context.committedDeletes.current.has(receipt.id)) markComponentDeleted(context, receipt.id);
    },
    undefined,
    () => context.command.isCurrent(receipt.owner)
  );
}

function markComponentDeleted(context: ComponentDeleteContext, id: number) {
  context.committedDeletes.current.add(id);
}
