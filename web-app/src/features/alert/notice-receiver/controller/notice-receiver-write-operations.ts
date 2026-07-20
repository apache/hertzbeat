/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import {
  validateNoticeReceiverDraft,
  type NoticeReceiver,
  type NoticeReceiverDraft
} from '../model/notice-receiver-model';
import {
  classifyNoticeReceiverDetailFailure,
  classifyNoticeReceiverWriteFailure,
  isNoticeReceiverWriteRejection,
  noticeReceiverRereadError,
  readNoticeReceiverMutation,
  type NoticeReceiverFailureKind,
  type NoticeReceiverNonMissingFailureKind
} from '../model/notice-receiver-failure';
import {
  requireExactNoticeReceiver,
  requireNoticeReceiverAbsent,
  requireNoticeReceiverConverged
} from '../model/notice-receiver-evidence';
import type { NoticeReceiverWriteReceipt } from '../model/notice-receiver-operation-state';
import type { NoticeReceiverEditorController } from './use-notice-receiver-editor-controller';
import type {
  NoticeReceiverOperationController,
  NoticeReceiverOperationOwner
} from './use-notice-receiver-operation-controller';

type NoticeReceiverNotifications = {
  validation: () => void;
  saveSuccess: () => void;
  saveFailure: (kind: NoticeReceiverNonMissingFailureKind) => void;
  deleteSuccess: () => void;
  deleteFailure: (kind: NoticeReceiverNonMissingFailureKind) => void;
  readFailure: (kind: NoticeReceiverFailureKind) => void;
  testSuccess: () => void;
  testFailure: (kind: NoticeReceiverNonMissingFailureKind) => void;
};
export type NoticeReceiverUpdateDraft = NoticeReceiverDraft & { id: number };

export type NoticeReceiverWriteContext = {
  create: (draft: NoticeReceiverDraft) => Promise<NoticeReceiver>;
  update: (draft: NoticeReceiverUpdateDraft) => Promise<NoticeReceiver>;
  remove: (record: NoticeReceiver) => Promise<NoticeReceiver>;
  editor: NoticeReceiverEditorController;
  operation: NoticeReceiverOperationController;
  notify: NoticeReceiverNotifications;
  loadExact: (id: number) => Promise<NoticeReceiver>;
  reread: () => Promise<{ records: NoticeReceiver[]; total: number }>;
};

export async function submitNoticeReceiver(context: NoticeReceiverWriteContext) {
  const draft = context.editor.controls.getDraft();
  if (!draft) return false;
  if (validateNoticeReceiverDraft(draft).length) {
    context.notify.validation();
    return false;
  }
  const owner = context.operation.begin('saving');
  if (!owner) return false;
  const receipt: NoticeReceiverWriteReceipt = {
    kind: 'save',
    phase: 'write',
    draft,
    ...(draft.id ? { id: draft.id } : {})
  };
  context.operation.retain(owner, receipt);
  context.editor.controls.invalidateDetail();
  return runWrite(context, owner, receipt);
}

export async function removeNoticeReceiver(context: NoticeReceiverWriteContext, record: NoticeReceiver) {
  const owner = context.operation.begin('removing');
  if (!owner) return false;
  const receipt: NoticeReceiverWriteReceipt = { kind: 'delete', phase: 'write', record };
  context.operation.retain(owner, receipt);
  context.editor.controls.invalidateDetail();
  return runWrite(context, owner, receipt);
}

export async function retryNoticeReceiver(context: NoticeReceiverWriteContext) {
  const resumed = context.operation.resume();
  if (!resumed) return false;
  return runWrite(context, resumed.owner, resumed.receipt);
}

async function runWrite(
  context: NoticeReceiverWriteContext,
  owner: NoticeReceiverOperationOwner,
  receipt: NoticeReceiverWriteReceipt
) {
  try {
    const completed = await advance(context, owner, receipt);
    if (!completed || !context.operation.isCurrent(owner)) return false;
    complete(context, owner, receipt);
    return true;
  } catch (error) {
    if (!context.operation.isCurrent(owner)) return false;
    recoverOrReject(context, owner, receipt, error);
    context.operation.markRecovery(owner);
    notifyFailure(context, receipt, error);
    return false;
  } finally {
    context.operation.end(owner);
  }
}

async function advance(
  context: NoticeReceiverWriteContext,
  owner: NoticeReceiverOperationOwner,
  receipt: NoticeReceiverWriteReceipt
) {
  // The receipt advances monotonically so Retry resumes proof or projection without repeating an acknowledged write.
  if (receipt.phase === 'write') {
    await mutate(context, receipt);
    if (!context.operation.isCurrent(owner)) return false;
  }
  if (receipt.phase === 'proof') {
    await prove(context, receipt);
    if (!context.operation.isCurrent(owner)) return false;
    receipt.phase = 'projection';
  }
  const projection = await context.reread();
  if (!context.operation.isCurrent(owner)) return false;
  if (receipt.kind === 'delete') requireNoticeReceiverAbsent(projection.records, receipt.record.id);
  return true;
}

async function mutate(context: NoticeReceiverWriteContext, receipt: NoticeReceiverWriteReceipt) {
  if (receipt.kind === 'delete') {
    requireExactNoticeReceiver(await context.remove(receipt.record), receipt.record.id);
    receipt.phase = 'proof';
    return;
  }
  const canonical = hasIdentity(receipt.draft)
    ? await context.update(receipt.draft)
    : await context.create(receipt.draft);
  const expectedId = receipt.draft.id ?? canonical.id;
  receipt.id = expectedId;
  requireNoticeReceiverConverged(canonical, expectedId, receipt.draft);
  receipt.phase = 'projection';
}

async function prove(context: NoticeReceiverWriteContext, receipt: NoticeReceiverWriteReceipt) {
  if (receipt.kind === 'save') {
    // An ambiguous create without a server-issued identity cannot be proved safely by name or list position.
    if (receipt.id === undefined)
      throw noticeReceiverRereadError('unavailable', 'NOTICE_RECEIVER_CREATE_ID_UNAVAILABLE');
    requireNoticeReceiverConverged(await context.loadExact(receipt.id), receipt.id, receipt.draft);
    return;
  }
  try {
    await context.loadExact(receipt.record.id);
  } catch (error) {
    if (classifyNoticeReceiverDetailFailure(error) === 'missing') return;
    throw error;
  }
  throw noticeReceiverRereadError('invalid', 'NOTICE_RECEIVER_DELETE_NOT_CONVERGED');
}

function recoverOrReject(
  context: NoticeReceiverWriteContext,
  owner: NoticeReceiverOperationOwner,
  receipt: NoticeReceiverWriteReceipt,
  error: unknown
) {
  if (receipt.phase !== 'write') return;
  if (receipt.kind === 'save') {
    const mutation = readNoticeReceiverMutation(error);
    const identityMatchesDraft = receipt.draft.id === undefined || mutation?.id === receipt.draft.id;
    if (mutation && identityMatchesDraft) {
      receipt.id = mutation.id;
      receipt.phase = 'proof';
      return;
    }
  }
  if (isNoticeReceiverWriteRejection(error)) {
    context.operation.clear(owner);
    return;
  }
  // Network, 5xx, and malformed-success failures may have committed; retain proof-only recovery.
  receipt.phase = 'proof';
}

function complete(
  context: NoticeReceiverWriteContext,
  owner: NoticeReceiverOperationOwner,
  receipt: NoticeReceiverWriteReceipt
) {
  context.operation.clear(owner);
  if (receipt.kind === 'save') {
    context.editor.controls.setDraft(null);
    context.notify.saveSuccess();
    return;
  }
  if (context.editor.controls.getDraft()?.id === receipt.record.id) context.editor.controls.setDraft(null);
  context.notify.deleteSuccess();
}

function notifyFailure(context: NoticeReceiverWriteContext, receipt: NoticeReceiverWriteReceipt, error: unknown) {
  const kind = classifyNoticeReceiverWriteFailure(error);
  if (receipt.kind === 'save') context.notify.saveFailure(kind);
  else context.notify.deleteFailure(kind);
}

function hasIdentity(draft: NoticeReceiverDraft): draft is NoticeReceiverUpdateDraft {
  return draft.id !== undefined;
}
