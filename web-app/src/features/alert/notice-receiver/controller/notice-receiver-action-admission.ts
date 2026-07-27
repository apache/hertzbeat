/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import {
  canPerformNoticeAction,
  type NoticeActionCapabilities,
  type NoticeActionKind
} from '../../model/notice-action-capability-model';
import type { NoticeReceiverDraft } from '../model/notice-receiver-model';
import type { NoticeReceiverReceipt } from '../model/notice-receiver-operation-state';

export function canSubmitNoticeReceiver(capabilities: NoticeActionCapabilities, draft: NoticeReceiverDraft) {
  return draft.id === undefined ? capabilities.canCreate : capabilities.canEdit;
}

export function canRetryNoticeReceiver(
  capabilities: NoticeActionCapabilities,
  receipt: NoticeReceiverReceipt | undefined
) {
  return canPerformNoticeAction(capabilities, noticeReceiverReceiptAction(receipt));
}

export function noticeReceiverReceiptAction(receipt: NoticeReceiverReceipt | undefined): NoticeActionKind | undefined {
  if (receipt?.kind === 'save') return receipt.draft.id === undefined ? 'create' : 'edit';
  return receipt?.kind;
}
