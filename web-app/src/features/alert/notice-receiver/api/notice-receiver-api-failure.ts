/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ApiMessageError } from '@/core/http/api-message';

import {
  NoticeReceiverRequestFailure,
  type NoticeReceiverFailureKind,
  type NoticeReceiverWriteOutcome
} from '../model/notice-receiver-failure';
import { NoticeReceiverContractError } from './notice-receiver-schema';

export type NoticeReceiverRequestPhase = 'detail' | 'collection' | 'write' | 'command';

/** Backend `CommonConstants.FAIL_CODE`, used by the exact receiver detail endpoint for not-found. */
const NOTICE_RECEIVER_MISSING_API_CODE = 15;

/** Converts transport and wire-schema evidence before it can escape the Receiver API. */
export function normalizeNoticeReceiverApiFailure(reason: unknown, phase: NoticeReceiverRequestPhase) {
  if (reason instanceof NoticeReceiverRequestFailure) return preserveRequestEvidence(reason, phase);
  if (reason instanceof NoticeReceiverContractError) {
    return new NoticeReceiverRequestFailure('invalid', 'uncertain', {
      code: 'NOTICE_RECEIVER_RESPONSE_INVALID'
    });
  }
  if (!(reason instanceof ApiMessageError)) {
    return new NoticeReceiverRequestFailure('error', 'uncertain');
  }
  return new NoticeReceiverRequestFailure(readFailureKind(reason, phase), writeOutcome(reason, phase));
}

export async function noticeReceiverApiRequest<T>(
  phase: NoticeReceiverRequestPhase,
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (reason) {
    throw normalizeNoticeReceiverApiFailure(reason, phase);
  }
}

function readFailureKind(reason: ApiMessageError, phase: NoticeReceiverRequestPhase): NoticeReceiverFailureKind {
  if (reason.cause !== undefined || reason.status === undefined || reason.status === 0 || reason.status >= 500) {
    return 'unavailable';
  }
  if (
    phase === 'detail' &&
    (reason.status === 404 || (reason.status === 200 && reason.code === NOTICE_RECEIVER_MISSING_API_CODE))
  ) {
    return 'missing';
  }
  return 'error';
}

function writeOutcome(reason: ApiMessageError, phase: NoticeReceiverRequestPhase): NoticeReceiverWriteOutcome {
  // A read or command response cannot prove that a persisted write was rejected.
  // Only a source, non-timeout 4xx from the write request is conclusive.
  if (phase !== 'write' || reason.cause !== undefined) return 'uncertain';
  return reason.status !== undefined && reason.status >= 400 && reason.status < 500 && reason.status !== 408
    ? 'rejected'
    : 'uncertain';
}

function preserveRequestEvidence(reason: NoticeReceiverRequestFailure, phase: NoticeReceiverRequestPhase) {
  if (phase === 'write' || reason.writeOutcome === 'uncertain') return reason;
  const options = {
    ...(reason.code === undefined ? {} : { code: reason.code }),
    ...(reason.mutation === undefined ? {} : { mutation: reason.mutation })
  };
  return new NoticeReceiverRequestFailure(reason.kind, 'uncertain', options);
}
