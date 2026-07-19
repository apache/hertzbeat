/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { HttpError } from '@refinedev/core';

import { ApiMessageError } from '@/core/http/api-message';

import type { NoticeRuleCollectionFailureKind, NoticeRuleFailureKind } from '../model/notice-rule-model';

export function classifyNoticeRuleFailure(error: unknown): NoticeRuleFailureKind {
  const directFailure = classifyApiMessageFailure(error);
  if (directFailure) return directFailure;
  const candidate = error as Partial<HttpError> & { code?: string | number };
  if (candidate.statusCode === 404 || candidate.code === 'NOTICE_RULE_MISSING') return 'missing';
  if (
    typeof candidate.code === 'string' &&
    (candidate.code.startsWith('NOTICE_RULE_') || candidate.code.startsWith('NOTICE_RECEIVER_'))
  )
    return 'invalid';
  if (candidate.statusCode === 0 || [502, 503, 504].includes(candidate.statusCode ?? -1)) return 'unavailable';
  return 'error';
}

function classifyApiMessageFailure(error: unknown): NoticeRuleFailureKind | null {
  if (!(error instanceof ApiMessageError)) return null;
  if (error.status === 404 || error.code === 15) return 'missing';
  if (error.cause !== undefined || error.status === undefined) return 'unavailable';
  if ([0, 502, 503, 504].includes(error.status)) return 'unavailable';
  return 'error';
}

export function classifyNoticeRuleWriteFailure(error: unknown): Exclude<NoticeRuleFailureKind, 'missing'> {
  const failure = classifyNoticeRuleFailure(error);
  return failure === 'missing' ? 'error' : failure;
}

export function classifyNoticeRuleCollectionFailure(error: unknown): NoticeRuleCollectionFailureKind {
  const failure = classifyNoticeRuleFailure(error);
  return failure === 'missing' ? 'error' : failure;
}

export function preserveNoticeRuleFailure(error: unknown, kind: NoticeRuleFailureKind) {
  if (error instanceof Error) return error;
  const candidate = error && typeof error === 'object' ? error : {};
  return Object.assign(new Error(`Notice rule ${kind} failure`), candidate);
}
