/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { QueryClient } from '@tanstack/react-query';

import type { ExclusiveOperation } from '@/shared/exclusive-operation/use-exclusive-operation';

import { saveStatusComponent } from '../api/status-management-api';
import type { StatusComponent } from '../model/status-management-contract';
import { isAmbiguousStatusWriteFailure } from './status-management-canonical-proof';
import { projectStatusComponents, projectStatusComponentUpdate } from './status-component-projection';
import type { StatusOperationOwner, StatusWriteReceipt, StatusWriteRecovery } from './status-transaction-recovery';
import type { StatusManagementNotifications } from './use-status-management-notifications';

type ComponentEditor = { complete: (epoch: number) => void; currentEpoch: () => number };

export type ComponentWriteContext = {
  command: ExclusiveOperation;
  editor: ComponentEditor;
  retireIncidentDetail: () => void;
  notify: StatusManagementNotifications;
  queryClient: QueryClient;
  committedDeletes: React.RefObject<Set<number>>;
  recovery: React.RefObject<StatusWriteRecovery<StatusComponent> | undefined>;
  recoveryProofPending: React.RefObject<boolean>;
  setSaving: (value: boolean) => void;
  setWriteRecovery: (value: StatusWriteRecovery<StatusComponent>['stage'] | undefined) => void;
};

export function startComponentSave(context: ComponentWriteContext, value: StatusComponent) {
  if (context.recovery.current) return;
  const owner = context.command.begin();
  if (!owner) return;
  context.retireIncidentDetail();
  context.setSaving(true);
  void runComponentWrite(context, createReceipt(value, context.editor.currentEpoch(), owner));
}

export function retryComponentWrite(context: ComponentWriteContext) {
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
  void runComponentWriteProof(context, recovery.receipt);
}

async function runComponentWrite(context: ComponentWriteContext, receipt: StatusWriteReceipt<StatusComponent>) {
  const keepLocked = await executeComponentWrite(context, receipt);
  if (!context.command.isCurrent(receipt.owner)) return;
  context.setSaving(false);
  if (!keepLocked) context.command.end(receipt.owner);
}

async function executeComponentWrite(context: ComponentWriteContext, receipt: StatusWriteReceipt<StatusComponent>) {
  try {
    await saveStatusComponent(receipt.value, receipt.kind === 'create');
  } catch (error) {
    if (!context.command.isCurrent(receipt.owner)) return false;
    if (!isAmbiguousStatusWriteFailure(error)) {
      context.notify.saveFailed();
      return false;
    }
    if (receipt.kind === 'create') return retainUnverifiableCreate(context, receipt);
  }
  if (!context.command.isCurrent(receipt.owner)) return false;
  return proveOrRetainComponentWrite(context, receipt);
}

async function proveOrRetainComponentWrite(
  context: ComponentWriteContext,
  receipt: StatusWriteReceipt<StatusComponent>
) {
  try {
    await proveComponentWrite(context, receipt);
    if (!context.command.isCurrent(receipt.owner)) return false;
    completeComponentWrite(context, receipt);
    return false;
  } catch {
    if (!context.command.isCurrent(receipt.owner)) return false;
    context.recovery.current = { stage: 'proof', receipt };
    context.setWriteRecovery('proof');
    return true;
  }
}

function retainUnverifiableCreate(context: ComponentWriteContext, receipt: StatusWriteReceipt<StatusComponent>) {
  context.recovery.current = { stage: 'commit-uncertain', receipt };
  context.setWriteRecovery('commit-uncertain');
  context.notify.writeUnverified();
  return true;
}

async function runComponentWriteProof(context: ComponentWriteContext, receipt: StatusWriteReceipt<StatusComponent>) {
  try {
    await proveComponentWrite(context, receipt);
    if (!context.command.isCurrent(receipt.owner)) return;
    context.recovery.current = undefined;
    context.recoveryProofPending.current = false;
    context.setSaving(false);
    context.setWriteRecovery(undefined);
    completeComponentWrite(context, receipt);
    context.command.end(receipt.owner);
  } catch {
    if (!context.command.isCurrent(receipt.owner)) return;
    context.recoveryProofPending.current = false;
    context.setSaving(false);
  }
}

function proveComponentWrite(context: ComponentWriteContext, receipt: StatusWriteReceipt<StatusComponent>) {
  const isCurrent = () => context.command.isCurrent(receipt.owner);
  return receipt.kind === 'create'
    ? projectStatusComponents(context.queryClient, context.committedDeletes.current, undefined, undefined, isCurrent)
    : projectStatusComponentUpdate(context.queryClient, context.committedDeletes.current, receipt.value, isCurrent);
}

function completeComponentWrite(context: ComponentWriteContext, receipt: StatusWriteReceipt<StatusComponent>) {
  context.editor.complete(receipt.editorEpoch);
  context.notify.saveSuccess();
}

function createReceipt(
  value: StatusComponent,
  editorEpoch: number,
  owner: StatusOperationOwner
): StatusWriteReceipt<StatusComponent> {
  return value.id == null
    ? { kind: 'create', value, editorEpoch, owner }
    : { kind: 'update', value, editorEpoch, owner };
}
