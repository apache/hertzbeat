/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { validateNoticeReceiverDraft, type NoticeReceiverDraft } from '../model/notice-receiver-model';
import { classifyNoticeReceiverWriteFailure, isNoticeReceiverWriteRejection } from '../model/notice-receiver-failure';
import { canRetryNoticeReceiver } from './notice-receiver-action-admission';
import type { NoticeReceiverWriteContext } from './notice-receiver-write-operations';

type TestDelivery = (draft: NoticeReceiverDraft) => Promise<void>;

export async function sendNoticeReceiverTest(context: NoticeReceiverWriteContext, send: TestDelivery) {
  if (!context.capabilities.canTest) return false;
  const draft = context.editor.controls.getDraft();
  if (!draft) return false;
  if (validateNoticeReceiverDraft(draft).length) {
    context.notify.validation();
    return false;
  }
  const owner = context.operation.begin('testing');
  if (!owner) return false;
  return deliverNoticeReceiverTest(context, owner, draft, send);
}

export async function retryNoticeReceiverTest(context: NoticeReceiverWriteContext, send: TestDelivery) {
  if (!canRetryNoticeReceiver(context.capabilities, context.operation.getReceipt())) return false;
  const resumed = context.operation.resumeTest();
  if (!resumed) return false;
  return deliverNoticeReceiverTest(context, resumed.owner, resumed.receipt.draft, send);
}

export function dismissNoticeReceiverTest(context: NoticeReceiverWriteContext) {
  if (!context.operation.dismissTest()) return false;
  return context.editor.actions.close();
}

async function deliverNoticeReceiverTest(
  context: NoticeReceiverWriteContext,
  owner: NonNullable<ReturnType<NoticeReceiverWriteContext['operation']['begin']>>,
  draft: NoticeReceiverDraft,
  send: TestDelivery
) {
  try {
    await send(draft);
    if (!context.operation.isCurrent(owner)) return false;
    context.operation.clear(owner);
    context.notify.testSuccess();
    return true;
  } catch (error) {
    if (!context.operation.isCurrent(owner)) return false;
    const failure = classifyNoticeReceiverWriteFailure(error);
    if (isNoticeReceiverWriteRejection(error)) {
      context.operation.clear(owner);
      context.notify.testFailure(failure);
    } else {
      // Delivery may already have happened. Retain ownership until the operator explicitly retries or cancels.
      context.operation.retain(owner, { kind: 'test', phase: 'delivery-uncertain', draft, failure });
    }
    return false;
  } finally {
    context.operation.end(owner);
  }
}
