/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ApiMessageError } from '@/core/http/api-message';

import {
  classifyAlertInhibitWriteError,
  deleteAlertInhibit,
  saveAlertInhibit,
  updateAlertInhibitEnabled
} from '../alert-inhibit-api';
import {
  AlertInhibitContractError,
  AlertInhibitUnavailableError,
  buildAlertInhibitPayload,
  validateAlertInhibitDraft,
  type AlertInhibit,
  type AlertInhibitPage
} from '../alert-inhibit-model';
import {
  loadExactAlertInhibit,
  proveAlertInhibitMissing,
  requireAlertInhibitAbsent,
  requireAlertInhibitConvergence
} from '../alert-inhibit-write-proof';
import type { AlertInhibitEditorController } from './use-alert-inhibit-editor-controller';
import type {
  AlertInhibitOperationController,
  AlertInhibitOperationOwner,
  AlertInhibitReceipt
} from './use-alert-inhibit-operation-controller';

type Notifications = {
  validation: () => void;
  saveSuccess: () => void;
  saveFailure: (kind: 'unavailable' | 'error') => void;
  operationSuccess: () => void;
  operationFailure: (kind: 'unavailable' | 'error') => void;
};

export type AlertInhibitWriteContext = {
  editor: AlertInhibitEditorController;
  operation: AlertInhibitOperationController;
  notify: Notifications;
  reread: () => Promise<AlertInhibitPage>;
};

export async function submitAlertInhibit(context: AlertInhibitWriteContext) {
  const draft = context.editor.controls.getDraft();
  if (!draft || validateAlertInhibitDraft(draft).length > 0) {
    context.notify.validation();
    return;
  }
  const owner = context.operation.begin('saving');
  if (!owner) return;
  const receipt: AlertInhibitReceipt = {
    kind: 'save',
    phase: 'write',
    draft,
    ...(draft.id === undefined ? {} : { id: draft.id })
  };
  beginReceipt(context, owner, receipt);
  await runReceipt(context, owner, receipt);
}

export async function toggleAlertInhibit(context: AlertInhibitWriteContext, record: AlertInhibit, enable: boolean) {
  const owner = context.operation.begin('operating');
  if (!owner) return;
  const receipt: AlertInhibitReceipt = { kind: 'toggle', phase: 'prepare', record, enable };
  beginReceipt(context, owner, receipt);
  await runReceipt(context, owner, receipt);
}

export async function removeAlertInhibit(context: AlertInhibitWriteContext, id: number) {
  const owner = context.operation.begin('operating');
  if (!owner) return;
  const receipt: AlertInhibitReceipt = { kind: 'delete', phase: 'write', id };
  beginReceipt(context, owner, receipt);
  await runReceipt(context, owner, receipt);
}

export async function retryAlertInhibit(context: AlertInhibitWriteContext) {
  const resumed = context.operation.resume();
  if (!resumed) return;
  if (resumed.receipt.kind === 'save') context.editor.controls.setEditorFailure(undefined);
  await runReceipt(context, resumed.owner, resumed.receipt);
}

function beginReceipt(
  context: AlertInhibitWriteContext,
  owner: AlertInhibitOperationOwner,
  receipt: AlertInhibitReceipt
) {
  context.operation.retain(owner, receipt);
  context.editor.controls.invalidateDetail();
  context.editor.controls.setEditorFailure(undefined);
}

async function runReceipt(
  context: AlertInhibitWriteContext,
  owner: AlertInhibitOperationOwner,
  receipt: AlertInhibitReceipt
) {
  try {
    if (!(await advanceReceipt(context, owner, receipt)) || !context.operation.isCurrent(owner)) return;
    completeReceipt(context, owner, receipt);
  } catch (reason) {
    if (!context.operation.isCurrent(owner)) return;
    recoverOrReject(context, owner, receipt, reason);
    context.operation.markRecovery(owner);
    notifyFailure(context, receipt, reason);
  } finally {
    context.operation.end(owner);
  }
}

async function advanceReceipt(
  context: AlertInhibitWriteContext,
  owner: AlertInhibitOperationOwner,
  receipt: AlertInhibitReceipt
) {
  // A retained receipt moves forward only; Retry never repeats a write whose outcome may be committed.
  if (receipt.kind === 'toggle' && receipt.phase === 'prepare') {
    receipt.record = await loadExactAlertInhibit(receipt.record.id);
    if (!context.operation.isCurrent(owner)) return false;
    receipt.expected = { ...receipt.record, enable: receipt.enable };
    receipt.phase = 'write';
  }
  if (receipt.phase === 'write') {
    await mutate(receipt);
    if (!context.operation.isCurrent(owner)) return false;
    receipt.phase = 'proof';
  }
  if (receipt.phase === 'proof') {
    await prove(receipt);
    if (!context.operation.isCurrent(owner)) return false;
    receipt.phase = 'projection';
  }
  const page = await context.reread();
  if (!context.operation.isCurrent(owner)) return false;
  if (receipt.kind === 'delete') requireAlertInhibitAbsent(page, receipt.id);
  return true;
}

async function mutate(receipt: AlertInhibitReceipt) {
  if (receipt.kind === 'save') return saveAlertInhibit(receipt.draft);
  if (receipt.kind === 'delete') return deleteAlertInhibit(receipt.id);
  return updateAlertInhibitEnabled(receipt.record, receipt.enable);
}

async function prove(receipt: AlertInhibitReceipt) {
  if (receipt.kind === 'delete') return proveAlertInhibitMissing(receipt.id);
  if (receipt.kind === 'toggle') {
    if (!receipt.expected) throw new AlertInhibitContractError('toggle proof is missing expected fields');
    return requireAlertInhibitConvergence(await loadExactAlertInhibit(receipt.record.id), receipt.expected);
  }
  if (receipt.id === undefined) {
    throw new AlertInhibitUnavailableError('created inhibit has no server-issued identity for exact proof');
  }
  return requireAlertInhibitConvergence(await loadExactAlertInhibit(receipt.id), {
    ...buildAlertInhibitPayload(receipt.draft),
    id: receipt.id
  });
}

function recoverOrReject(
  context: AlertInhibitWriteContext,
  owner: AlertInhibitOperationOwner,
  receipt: AlertInhibitReceipt,
  reason: unknown
) {
  if (receipt.phase === 'prepare' || (receipt.phase === 'write' && isDefiniteWriteRejection(reason))) {
    context.operation.clear(owner);
    return false;
  }
  if (receipt.phase !== 'write') return false;
  receipt.phase = 'proof';
  return true;
}

function completeReceipt(
  context: AlertInhibitWriteContext,
  owner: AlertInhibitOperationOwner,
  receipt: AlertInhibitReceipt
) {
  context.operation.clear(owner);
  if (receipt.kind === 'save') {
    context.editor.controls.setDraft(null);
    context.notify.saveSuccess();
  } else {
    context.notify.operationSuccess();
  }
}

function notifyFailure(context: AlertInhibitWriteContext, receipt: AlertInhibitReceipt, reason: unknown) {
  // Once a receipt is retained, the write outcome can no longer be stated as a definite failure.
  const kind = context.operation.getRecovery() ? 'unavailable' : classifyAlertInhibitWriteError(reason);
  if (receipt.kind === 'save') {
    context.editor.controls.setEditorFailure(kind);
    context.notify.saveFailure(kind);
  } else {
    context.notify.operationFailure(kind);
  }
}

function isDefiniteWriteRejection(reason: unknown) {
  return (
    reason instanceof ApiMessageError && reason.status !== undefined && reason.status >= 400 && reason.status < 500
  );
}
