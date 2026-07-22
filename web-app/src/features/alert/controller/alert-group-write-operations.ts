/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { deleteAlertGroup, loadAlertGroup, saveAlertGroup, updateAlertGroupEnabled } from '../api/alert-group-api';
import {
  AlertGroupContractError,
  alertGroupFailureKind,
  alertGroupWriteOutcome,
  buildAlertGroupPayload,
  buildAlertGroupTogglePayload,
  type AlertGroupConverge,
  type AlertGroupDraft,
  type AlertGroupPage
} from '../model/alert-group-model';
import {
  proveAlertGroupMissing,
  requireAlertGroupConvergence,
  requireExactAlertGroupId
} from '../api/alert-group-write-proof';
import type { AlertGroupOperationReceipt } from '../model/alert-group-operation-state';
import type { AlertGroupNotifications } from './alert-group-submit-failure';
import type { AlertGroupCommandGate, AlertGroupEditor } from './use-alert-group-editor-controller';

export type AlertGroupWriteContext = {
  editor: AlertGroupEditor;
  gate: AlertGroupCommandGate;
  notifications: AlertGroupNotifications;
  rereadList: () => Promise<AlertGroupPage>;
};

export async function updateAlertGroup(context: AlertGroupWriteContext, draft: AlertGroupDraft & { id: number }) {
  if (!context.gate.begin('saving')) return;
  const receipt: AlertGroupOperationReceipt = {
    kind: 'update',
    phase: 'write',
    draft: { ...draft, groupLabels: [...draft.groupLabels] }
  };
  beginReceipt(context, receipt);
  await runReceipt(context, receipt);
}

export async function toggleAlertGroup(context: AlertGroupWriteContext, group: AlertGroupConverge, enable: boolean) {
  if (!context.gate.begin('operating')) return;
  const receipt: AlertGroupOperationReceipt = { kind: 'toggle', phase: 'prepare', id: group.id, enable };
  beginReceipt(context, receipt);
  await runReceipt(context, receipt);
}

export async function removeAlertGroup(context: AlertGroupWriteContext, id: number) {
  if (!context.gate.begin('operating')) return;
  const receipt: AlertGroupOperationReceipt = { kind: 'delete', phase: 'write', id };
  beginReceipt(context, receipt);
  await runReceipt(context, receipt);
}

export async function retryAlertGroupOperation(context: AlertGroupWriteContext) {
  const receipt = context.gate.beginRecovery();
  if (!receipt) return;
  await runReceipt(context, receipt);
}

function beginReceipt(context: AlertGroupWriteContext, receipt: AlertGroupOperationReceipt) {
  context.gate.retain(receipt);
  context.editor.invalidateDetail();
  context.editor.setEditorFailure(undefined);
}

async function runReceipt(context: AlertGroupWriteContext, receipt: AlertGroupOperationReceipt) {
  try {
    if (!(await advanceReceipt(context, receipt)) || !context.gate.isOwnerAlive()) return;
    completeReceipt(context, receipt);
  } catch (reason) {
    if (!context.gate.isOwnerAlive()) return;
    const retained = recoverOrReject(context, receipt, reason);
    const failure = alertGroupFailureKind(reason) === 'unavailable' ? 'unavailable' : 'error';
    if (retained) context.gate.markRecovery(failure);
    notifyFailure(context, receipt, failure, retained);
  } finally {
    context.gate.end();
  }
}

async function advanceReceipt(context: AlertGroupWriteContext, receipt: AlertGroupOperationReceipt) {
  // A retained receipt only advances. Recovery can therefore reread but can never replay its write.
  if (receipt.kind === 'toggle' && receipt.phase === 'prepare') {
    receipt.current = freezeAlertGroup(await loadExactAlertGroup(receipt.id));
    if (!context.gate.isOwnerAlive()) return false;
    receipt.phase = 'write';
  }
  if (receipt.phase === 'write') {
    await mutate(receipt);
    if (!context.gate.isOwnerAlive()) return false;
    receipt.phase = 'proof';
  }
  if (receipt.phase === 'proof') {
    await prove(receipt);
    if (!context.gate.isOwnerAlive()) return false;
    receipt.phase = 'projection';
  }
  const page = await context.rereadList();
  if (!context.gate.isOwnerAlive()) return false;
  if (receipt.kind === 'delete' && page.content.some(record => record.id === receipt.id)) {
    throw new AlertGroupContractError('deleted id remains');
  }
  return true;
}

function freezeAlertGroup(group: AlertGroupConverge): AlertGroupConverge {
  return { ...group, groupLabels: group.groupLabels ? [...group.groupLabels] : null };
}

async function mutate(receipt: AlertGroupOperationReceipt) {
  if (receipt.kind === 'update') return saveAlertGroup(receipt.draft);
  if (receipt.kind === 'delete') return deleteAlertGroup(receipt.id);
  if (!receipt.current) throw new AlertGroupContractError('toggle source detail is missing');
  return updateAlertGroupEnabled(receipt.current, receipt.enable);
}

async function prove(receipt: AlertGroupOperationReceipt) {
  if (receipt.kind === 'delete') return proveAlertGroupMissing(receipt.id);
  if (receipt.kind === 'update') {
    const canonical = await loadExactAlertGroup(receipt.draft.id);
    return requireAlertGroupConvergence(canonical, { ...buildAlertGroupPayload(receipt.draft), id: receipt.draft.id });
  }
  if (!receipt.current) throw new AlertGroupContractError('toggle proof is missing source fields');
  const canonical = await loadExactAlertGroup(receipt.id);
  return requireAlertGroupConvergence(canonical, buildAlertGroupTogglePayload(receipt.current, receipt.enable));
}

async function loadExactAlertGroup(id: number) {
  const record = await loadAlertGroup(id);
  requireExactAlertGroupId(record.id, id);
  return record;
}

function recoverOrReject(context: AlertGroupWriteContext, receipt: AlertGroupOperationReceipt, reason: unknown) {
  if (receipt.phase === 'prepare' || (receipt.phase === 'write' && alertGroupWriteOutcome(reason) === 'rejected')) {
    context.gate.clear();
    return false;
  }
  if (receipt.phase === 'write') receipt.phase = 'proof';
  return true;
}

function completeReceipt(context: AlertGroupWriteContext, receipt: AlertGroupOperationReceipt) {
  context.gate.clear();
  if (receipt.kind === 'update') {
    context.editor.setDraft(null);
    context.notifications.saveSuccess();
  } else {
    context.notifications.operationSuccess();
  }
}

function notifyFailure(
  context: AlertGroupWriteContext,
  receipt: AlertGroupOperationReceipt,
  failure: 'unavailable' | 'error',
  retained: boolean
) {
  if (retained) {
    if (failure === 'unavailable') context.notifications.proofUnavailable();
    else context.notifications.proofFailed();
    return;
  }
  if (receipt.kind === 'update') {
    context.editor.setEditorFailure('error');
    context.notifications.saveFailed();
  } else {
    context.notifications.operationFailed();
  }
}
