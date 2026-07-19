/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { NoticeReceiverContractError } from './api/notice-receiver-schema';
import type { NoticeReceiver } from './model/notice-receiver-model';
import type { NoticeReceiverNonMissingFailureKind } from './notice-receiver-failure';

export function requireExactNoticeReceiver(receiver: NoticeReceiver, id: number) {
  if (receiver.id !== id) throw new NoticeReceiverContractError('Notice receiver detail id mismatch');
  return receiver;
}

export function requireNoticeReceiverAbsent(records: NoticeReceiver[], id: number) {
  if (records.some(record => record.id === id)) {
    throw noticeReceiverRereadError('invalid', 'NOTICE_RECEIVER_DELETE_NOT_CONVERGED');
  }
}

export function noticeReceiverRereadError(
  kind: NoticeReceiverNonMissingFailureKind,
  code = `NOTICE_RECEIVER_LIST_REREAD_${kind.toUpperCase()}`
) {
  return Object.assign(new Error('Notice receiver list reread failed'), {
    statusCode: kind === 'unavailable' ? 503 : kind === 'invalid' ? 422 : 500,
    code
  });
}

export function throwableNoticeReceiverError(error: unknown) {
  if (error instanceof Error) return error;
  return Object.assign(new Error('Notice receiver operation failed'), error && typeof error === 'object' ? error : {});
}
