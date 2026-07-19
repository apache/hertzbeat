/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { ApiMessageError } from '@/core/http/api-message';

import { NoticeReceiverContractError } from './api/notice-receiver-schema';

export type NoticeReceiverFailureKind = 'missing' | 'invalid' | 'unavailable' | 'error';
export type NoticeReceiverNonMissingFailureKind = Exclude<NoticeReceiverFailureKind, 'missing'>;

type FailurePhase = 'detail' | 'collection' | 'write';
type FailureEvidence = { code?: string | number; status?: number; statusCode?: number };

export function classifyNoticeReceiverDetailFailure(error: unknown): NoticeReceiverFailureKind {
  return classifyNoticeReceiverFailure(error, 'detail');
}

export function classifyNoticeReceiverCollectionFailure(error: unknown): NoticeReceiverNonMissingFailureKind {
  const failure = classifyNoticeReceiverFailure(error, 'collection');
  return failure === 'missing' ? 'error' : failure;
}

export function classifyNoticeReceiverWriteFailure(error: unknown): NoticeReceiverNonMissingFailureKind {
  const failure = classifyNoticeReceiverFailure(error, 'write');
  return failure === 'missing' ? 'error' : failure;
}

function classifyNoticeReceiverFailure(error: unknown, phase: FailurePhase): NoticeReceiverFailureKind {
  if (error instanceof NoticeReceiverContractError) return 'invalid';
  const candidate = failureEvidence(error);
  if (isMissing(candidate)) return phase === 'detail' ? 'missing' : 'error';
  if (typeof candidate.code === 'string' && candidate.code.startsWith('NOTICE_RECEIVER_')) return 'invalid';
  if (isUnavailable(candidate, error)) return 'unavailable';
  return 'error';
}

function failureEvidence(error: unknown): FailureEvidence {
  return error != null && typeof error === 'object' ? error : {};
}

function isMissing(candidate: FailureEvidence) {
  const status = candidate.status ?? candidate.statusCode;
  return status === 404 || candidate.code === 'NOTICE_RECEIVER_MISSING';
}

function isUnavailable(candidate: FailureEvidence, error: unknown) {
  const status = candidate.status ?? candidate.statusCode;
  return status === 0 || (status == null && error instanceof ApiMessageError) || (status != null && status >= 500);
}
