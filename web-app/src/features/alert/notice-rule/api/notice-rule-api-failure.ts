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

/** Converts raw transport and receiver-option evidence before it leaves the API layer. */
export function normalizeNoticeRuleApiFailure(reason: unknown): NoticeRuleDomainFailure {
  if (reason instanceof NoticeRuleDomainFailure) return reason;
  if (reason instanceof NoticeReceiverRequestFailure) return noticeReceiverFailure(reason);
  if (!(reason instanceof ApiMessageError)) return new NoticeRuleRequestFailure('error');
  return new NoticeRuleRequestFailure(requestFailureKind(reason));
}

export async function noticeRuleApiRequest<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (reason) {
    throw normalizeNoticeRuleApiFailure(reason);
  }
}

function requestFailureKind(reason: ApiMessageError): Exclude<NoticeRuleFailureKind, 'invalid'> {
  if (reason.status === 404 || reason.code === 15) return 'missing';
  if (reason.cause !== undefined || reason.status === undefined || unavailableStatuses.has(reason.status)) {
    return 'unavailable';
  }
  return 'error';
}

function noticeReceiverFailure(reason: NoticeReceiverRequestFailure): NoticeRuleDomainFailure {
  if (reason.kind === 'invalid') {
    return new NoticeRuleContractError(reason.code ?? 'NOTICE_RECEIVER_RESPONSE_INVALID');
  }
  return new NoticeRuleRequestFailure(reason.kind === 'unavailable' ? 'unavailable' : 'error');
}
