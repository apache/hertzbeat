/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ApiMessageError } from '@/core/http/api-message';

import { NoticeTemplateRequestFailure, type NoticeTemplateFailureKind } from '../model/notice-template-failure';
import { NoticeTemplateContractError } from '../notice-template-model';

export type NoticeTemplateRequestPhase = 'detail' | 'collection' | 'write';

/** Backend `CommonConstants.FAIL_CODE`, used by the exact template detail endpoint for not-found. */
export const NOTICE_TEMPLATE_MISSING_API_CODE = 15;

/** Normalizes transport and wire-schema failures before they leave the API. */
export function normalizeNoticeTemplateApiFailure(reason: unknown, phase: NoticeTemplateRequestPhase) {
  if (reason instanceof NoticeTemplateRequestFailure) return preserveRequestEvidence(reason, phase);
  if (reason instanceof NoticeTemplateContractError) {
    return new NoticeTemplateRequestFailure('invalid', 'uncertain', {
      code: 'NOTICE_TEMPLATE_RESPONSE_INVALID'
    });
  }
  if (!(reason instanceof ApiMessageError)) {
    return new NoticeTemplateRequestFailure('error', 'uncertain');
  }
  return new NoticeTemplateRequestFailure(failureKind(reason, phase), writeOutcome(reason, phase));
}

export async function noticeTemplateApiRequest<T>(
  phase: NoticeTemplateRequestPhase,
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (reason) {
    throw normalizeNoticeTemplateApiFailure(reason, phase);
  }
}

function failureKind(reason: ApiMessageError, phase: NoticeTemplateRequestPhase): NoticeTemplateFailureKind {
  if (reason.cause !== undefined || reason.status === undefined || reason.status === 0 || reason.status >= 500) {
    return 'unavailable';
  }
  if (
    phase === 'detail' &&
    (reason.status === 404 || (reason.status === 200 && reason.code === NOTICE_TEMPLATE_MISSING_API_CODE))
  ) {
    return 'missing';
  }
  return 'error';
}

function writeOutcome(reason: ApiMessageError, phase: NoticeTemplateRequestPhase) {
  // A read response cannot establish whether an earlier write committed. A
  // business envelope is not transport-level rejection evidence.
  if (phase !== 'write' || reason.cause !== undefined) return 'uncertain';
  return reason.status !== undefined && reason.status >= 400 && reason.status < 500 && reason.status !== 408
    ? 'rejected'
    : 'uncertain';
}

function preserveRequestEvidence(reason: NoticeTemplateRequestFailure, phase: NoticeTemplateRequestPhase) {
  if (phase === 'write' || reason.writeOutcome === 'uncertain') return reason;
  const options = reason.code === undefined ? {} : { code: reason.code };
  return new NoticeTemplateRequestFailure(reason.kind, 'uncertain', options);
}
