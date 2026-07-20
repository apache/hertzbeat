/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ApiMessageError } from '@/core/http/api-message';

import { NoticeTemplateRequestFailure, type NoticeTemplateFailureKind } from '../model/notice-template-failure';
import { NoticeTemplateContractError } from '../notice-template-model';

export type NoticeTemplateRequestPhase = 'detail' | 'collection' | 'write';

/** Normalizes transport and wire-schema failures before they leave the API. */
export function normalizeNoticeTemplateApiFailure(reason: unknown, phase: NoticeTemplateRequestPhase) {
  if (reason instanceof NoticeTemplateRequestFailure) return reason;
  if (reason instanceof NoticeTemplateContractError) {
    return new NoticeTemplateRequestFailure('invalid', 'uncertain', {
      code: 'NOTICE_TEMPLATE_RESPONSE_INVALID'
    });
  }
  if (!(reason instanceof ApiMessageError)) {
    return new NoticeTemplateRequestFailure('error', 'uncertain');
  }
  return new NoticeTemplateRequestFailure(failureKind(reason, phase), writeOutcome(reason));
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
  if (phase === 'detail' && (reason.status === 404 || reason.code !== undefined)) return 'missing';
  if (reason.cause !== undefined || reason.status === undefined || reason.status === 0 || reason.status >= 500) {
    return 'unavailable';
  }
  return 'error';
}

function writeOutcome(reason: ApiMessageError) {
  // A non-zero API envelope proves the server handled and rejected the request,
  // so retrying does not risk duplicating a committed write.
  if (reason.code !== undefined) return 'rejected';
  return reason.status !== undefined && reason.status >= 400 && reason.status < 500 ? 'rejected' : 'uncertain';
}
