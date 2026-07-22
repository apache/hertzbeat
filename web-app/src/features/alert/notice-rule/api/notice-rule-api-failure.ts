/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ApiMessageError } from '@/core/http/api-message';

import { NoticeReceiverRequestFailure } from '../../notice-receiver/model/notice-receiver-failure';
import {
  NoticeRuleContractError,
  NoticeRuleDomainFailure,
  NoticeRuleRequestFailure,
  type NoticeRuleFailureKind
} from '../model/notice-rule-failure';

const unavailableStatuses = new Set([0, 502, 503, 504]);
export type NoticeRuleApiContext = 'detail' | 'collection' | 'write';

/** Converts raw transport and receiver-option evidence before it leaves the API layer. */
export function normalizeNoticeRuleApiFailure(reason: unknown, context: NoticeRuleApiContext): NoticeRuleDomainFailure {
  if (reason instanceof NoticeRuleDomainFailure) return reason;
  if (reason instanceof NoticeReceiverRequestFailure) return noticeReceiverFailure(reason);
  if (!(reason instanceof ApiMessageError)) return new NoticeRuleRequestFailure('error');
  return new NoticeRuleRequestFailure(requestFailureKind(reason, context), writeOutcome(reason));
}

export async function noticeRuleApiRequest<T>(
  operation: () => Promise<T>,
  context: NoticeRuleApiContext,
  signal?: AbortSignal
): Promise<T> {
  try {
    return await operation();
  } catch (reason) {
    // Caller cancellation retires query ownership; it is not availability evidence.
    if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
    throw normalizeNoticeRuleApiFailure(reason, context);
  }
}

function requestFailureKind(
  reason: ApiMessageError,
  context: NoticeRuleApiContext
): Exclude<NoticeRuleFailureKind, 'invalid'> {
  if (reason.cause !== undefined || reason.status === undefined || unavailableStatuses.has(reason.status)) {
    return 'unavailable';
  }
  if (context === 'detail' && (reason.status === 404 || (reason.status === 200 && reason.code === 15))) {
    return 'missing';
  }
  return 'error';
}

function writeOutcome(reason: ApiMessageError) {
  // Only a direct, non-timeout HTTP client rejection proves that persistence did not happen.
  if (reason.cause !== undefined) return 'uncertain' as const;
  return reason.status !== undefined && reason.status >= 400 && reason.status < 500 && reason.status !== 408
    ? ('rejected' as const)
    : ('uncertain' as const);
}

function noticeReceiverFailure(reason: NoticeReceiverRequestFailure): NoticeRuleDomainFailure {
  if (reason.kind === 'invalid') {
    return new NoticeRuleContractError(reason.code ?? 'NOTICE_RECEIVER_RESPONSE_INVALID');
  }
  return new NoticeRuleRequestFailure(reason.kind === 'unavailable' ? 'unavailable' : 'error');
}
