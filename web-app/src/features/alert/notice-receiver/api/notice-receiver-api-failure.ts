/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ApiMessageError } from '@/core/http/api-message';

import {
  NoticeReceiverRequestFailure,
  type NoticeReceiverFailureKind,
  type NoticeReceiverWriteOutcome
} from '../model/notice-receiver-failure';
import { NoticeReceiverContractError } from './notice-receiver-schema';

/** Converts transport and wire-schema evidence before it can escape the Receiver API. */
export function normalizeNoticeReceiverApiFailure(reason: unknown) {
  if (reason instanceof NoticeReceiverRequestFailure) return reason;
  if (reason instanceof NoticeReceiverContractError) {
    return new NoticeReceiverRequestFailure('invalid', 'uncertain', {
      code: 'NOTICE_RECEIVER_RESPONSE_INVALID'
    });
  }
  if (!(reason instanceof ApiMessageError)) {
    return new NoticeReceiverRequestFailure('error', 'uncertain');
  }
  return new NoticeReceiverRequestFailure(readFailureKind(reason), writeOutcome(reason));
}

export async function noticeReceiverApiRequest<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (reason) {
    throw normalizeNoticeReceiverApiFailure(reason);
  }
}

function readFailureKind(reason: ApiMessageError): NoticeReceiverFailureKind {
  if (reason.status === 404) return 'missing';
  if (reason.cause !== undefined || reason.status === undefined || reason.status === 0 || reason.status >= 500) {
    return 'unavailable';
  }
  return 'error';
}

function writeOutcome(reason: ApiMessageError): NoticeReceiverWriteOutcome {
  return reason.status !== undefined && reason.status >= 400 && reason.status < 500 ? 'rejected' : 'uncertain';
}
