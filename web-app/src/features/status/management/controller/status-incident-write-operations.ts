/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { QueryClient } from '@tanstack/react-query';

import type { ExclusiveOperation } from '@/shared/exclusive-operation/use-exclusive-operation';

import { saveStatusIncident } from '../api/status-management-api';
import type { StatusIncident } from '../model/status-management-contract';
import type { StatusIncidentQuery } from '../model/status-incident-query';
import { isAmbiguousStatusWriteFailure } from './status-management-canonical-proof';
import { projectStatusIncidents, projectStatusIncidentUpdate } from './status-incident-projection';
import type { StatusOperationOwner, StatusWriteReceipt, StatusWriteRecovery } from './status-transaction-recovery';
import type { StatusManagementNotifications } from './use-status-management-notifications';

type IncidentEditor = {
  complete: (epoch: number) => void;
  currentEpoch: () => number;
  retireDetail: () => void;
};

export type IncidentWriteContext = {
  query: React.RefObject<StatusIncidentQuery>;
  command: ExclusiveOperation;
  editor: IncidentEditor;
  notify: StatusManagementNotifications;
  queryClient: QueryClient;
  committedDeletes: React.RefObject<Set<number>>;
  recovery: React.RefObject<StatusWriteRecovery<StatusIncident> | undefined>;
  recoveryProofPending: React.RefObject<boolean>;
  setSaving: (value: boolean) => void;
  setWriteRecovery: (value: StatusWriteRecovery<StatusIncident>['stage'] | undefined) => void;
};

export function startIncidentSave(context: IncidentWriteContext, value: StatusIncident) {
  if (context.recovery.current) return;
  const owner = context.command.begin();
  if (!owner) return;
  context.editor.retireDetail();
  context.setSaving(true);
  void runIncidentWrite(context, createReceipt(value, context.editor.currentEpoch(), owner));
}

export function retryIncidentWrite(context: IncidentWriteContext) {
  const recovery = context.recovery.current;
  if (
    !recovery ||
    recovery.stage !== 'proof' ||
    !context.command.isCurrent(recovery.receipt.owner) ||
    context.recoveryProofPending.current
  ) {
    return;
  }
  context.recoveryProofPending.current = true;
  context.setSaving(true);
  void runIncidentWriteProof(context, recovery.receipt);
}

async function runIncidentWrite(context: IncidentWriteContext, receipt: StatusWriteReceipt<StatusIncident>) {
  const keepLocked = await executeIncidentWrite(context, receipt);
  if (!context.command.isCurrent(receipt.owner)) return;
  context.setSaving(false);
  if (!keepLocked) context.command.end(receipt.owner);
}

async function executeIncidentWrite(context: IncidentWriteContext, receipt: StatusWriteReceipt<StatusIncident>) {
  try {
    await saveStatusIncident(receipt.value, receipt.kind === 'create');
  } catch (error) {
    if (!context.command.isCurrent(receipt.owner)) return false;
    if (!isAmbiguousStatusWriteFailure(error)) {
      context.notify.saveFailed();
      return false;
    }
    if (receipt.kind === 'create') return retainUnverifiableCreate(context, receipt);
  }
  if (!context.command.isCurrent(receipt.owner)) return false;
  return proveOrRetainIncidentWrite(context, receipt);
}

async function proveOrRetainIncidentWrite(context: IncidentWriteContext, receipt: StatusWriteReceipt<StatusIncident>) {
  try {
    await proveIncidentWrite(context, receipt);
    if (!context.command.isCurrent(receipt.owner)) return false;
    completeIncidentWrite(context, receipt);
    return false;
  } catch {
    if (!context.command.isCurrent(receipt.owner)) return false;
    context.recovery.current = { stage: 'proof', receipt };
    context.setWriteRecovery('proof');
    return true;
  }
}

function retainUnverifiableCreate(context: IncidentWriteContext, receipt: StatusWriteReceipt<StatusIncident>) {
  context.recovery.current = { stage: 'commit-uncertain', receipt };
  context.setWriteRecovery('commit-uncertain');
  context.notify.writeUnverified();
  return true;
}

async function runIncidentWriteProof(context: IncidentWriteContext, receipt: StatusWriteReceipt<StatusIncident>) {
  try {
    await proveIncidentWrite(context, receipt);
    if (!context.command.isCurrent(receipt.owner)) return;
    context.recovery.current = undefined;
    context.recoveryProofPending.current = false;
    context.setSaving(false);
    context.setWriteRecovery(undefined);
    completeIncidentWrite(context, receipt);
    context.command.end(receipt.owner);
  } catch {
    if (!context.command.isCurrent(receipt.owner)) return;
    context.recoveryProofPending.current = false;
    context.setSaving(false);
  }
}

function proveIncidentWrite(context: IncidentWriteContext, receipt: StatusWriteReceipt<StatusIncident>) {
  const isCurrent = () => context.command.isCurrent(receipt.owner);
  return receipt.kind === 'create'
    ? projectStatusIncidents(
        context.queryClient,
        context.query.current,
        context.committedDeletes.current,
        undefined,
        isCurrent
      )
    : projectStatusIncidentUpdate(
        context.queryClient,
        context.query.current,
        context.committedDeletes.current,
        receipt.value,
        isCurrent
      );
}

function completeIncidentWrite(context: IncidentWriteContext, receipt: StatusWriteReceipt<StatusIncident>) {
  context.editor.complete(receipt.editorEpoch);
  context.notify.saveSuccess();
}

function createReceipt(
  value: StatusIncident,
  editorEpoch: number,
  owner: StatusOperationOwner
): StatusWriteReceipt<StatusIncident> {
  return value.id == null
    ? { kind: 'create', value, editorEpoch, owner }
    : { kind: 'update', value, editorEpoch, owner };
}
