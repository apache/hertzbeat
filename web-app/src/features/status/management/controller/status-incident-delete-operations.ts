/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { QueryClient } from '@tanstack/react-query';

import type { ExclusiveOperation } from '@/shared/exclusive-operation/use-exclusive-operation';

import { deleteStatusIncident, loadStatusIncident } from '../api/status-management-api';
import type { StatusIncidentQuery } from '../model/status-incident-query';
import {
  isAmbiguousStatusWriteFailure,
  proveStatusMissing,
  requireStatusId
} from './status-management-canonical-proof';
import { projectStatusIncidents } from './status-incident-projection';
import type { StatusDeleteReceipt, StatusOperationOwner } from './status-transaction-recovery';
import type { StatusManagementNotifications } from './use-status-management-notifications';

export type IncidentDeleteContext = {
  query: React.RefObject<StatusIncidentQuery>;
  command: ExclusiveOperation;
  retireDetail: () => void;
  notify: StatusManagementNotifications;
  queryClient: QueryClient;
  committedDeletes: React.RefObject<Set<number>>;
  recovery: React.RefObject<StatusDeleteReceipt | undefined>;
  recoveryProofPending: React.RefObject<boolean>;
  setDeleteRecovery: (value: boolean) => void;
  setDeleteRecoveryPending: (value: boolean) => void;
};

export function startIncidentRemove(context: IncidentDeleteContext, id: number) {
  const exactId = requireStatusId(id);
  if (context.committedDeletes.current.has(exactId)) return;
  const owner = context.command.begin();
  if (!owner) return;
  context.retireDetail();
  void runIncidentDelete(context, exactId, owner);
}

export async function refreshIncidentProjection(context: IncidentDeleteContext) {
  const receipt = context.recovery.current;
  if (receipt && context.command.isCurrent(receipt.owner)) return retryIncidentDelete(context, receipt);
  const owner = context.command.begin();
  if (!owner) return false;
  context.retireDetail();
  try {
    await projectStatusIncidents(
      context.queryClient,
      context.query.current,
      context.committedDeletes.current,
      undefined,
      () => context.command.isCurrent(owner)
    );
    return context.command.isCurrent(owner);
  } catch {
    return false;
  } finally {
    context.command.end(owner);
  }
}

async function runIncidentDelete(context: IncidentDeleteContext, id: number, owner: StatusOperationOwner) {
  const receipt = { id, owner };
  try {
    await deleteStatusIncident(id);
    if (!context.command.isCurrent(owner)) return;
    markIncidentDeleted(context, id);
  } catch (error) {
    if (!context.command.isCurrent(owner)) return;
    if (!isAmbiguousStatusWriteFailure(error)) {
      context.notify.deleteFailed();
      context.command.end(owner);
      return;
    }
  }
  await settleIncidentDelete(context, receipt);
}

async function settleIncidentDelete(context: IncidentDeleteContext, receipt: StatusDeleteReceipt) {
  try {
    await proveIncidentDelete(context, receipt);
    if (!context.command.isCurrent(receipt.owner)) return;
    context.notify.deleteSuccess();
    context.command.end(receipt.owner);
  } catch {
    if (!context.command.isCurrent(receipt.owner)) return;
    context.recovery.current = receipt;
    context.setDeleteRecovery(true);
  }
}

async function retryIncidentDelete(context: IncidentDeleteContext, receipt: StatusDeleteReceipt) {
  if (context.recoveryProofPending.current) return false;
  context.recoveryProofPending.current = true;
  context.setDeleteRecoveryPending(true);
  try {
    await proveIncidentDelete(context, receipt);
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

function proveIncidentDelete(context: IncidentDeleteContext, receipt: StatusDeleteReceipt) {
  return projectStatusIncidents(
    context.queryClient,
    context.query.current,
    context.committedDeletes.current,
    async () => {
      await proveStatusMissing(() => loadStatusIncident(receipt.id));
      if (!context.command.isCurrent(receipt.owner)) return;
      if (!context.committedDeletes.current.has(receipt.id)) markIncidentDeleted(context, receipt.id);
    },
    () => context.command.isCurrent(receipt.owner)
  );
}

function markIncidentDeleted(context: IncidentDeleteContext, id: number) {
  context.committedDeletes.current.add(id);
}
