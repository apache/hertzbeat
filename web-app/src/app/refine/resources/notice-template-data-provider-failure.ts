/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import {
  NOTICE_TEMPLATE_MISSING_API_CODE,
  normalizeNoticeTemplateApiFailure,
  type NoticeTemplateRequestPhase
} from '@/features/alert/api/notice-template-api-failure';
import {
  NoticeTemplateRequestFailure,
  type NoticeTemplateFailureKind,
  type NoticeTemplateWriteOutcome
} from '@/features/alert/model/notice-template-failure';
import { NoticeTemplateContractError } from '@/features/alert/notice-template-model';

import { isRefineHttpError, type RefineHttpError } from '../refine-http-error';

export function normalizeNoticeTemplateProviderFailure(reason: unknown, phase: NoticeTemplateRequestPhase) {
  if (reason instanceof NoticeTemplateRequestFailure) return normalizeNoticeTemplateApiFailure(reason, phase);
  if (reason instanceof NoticeTemplateContractError) return contractFailure('NOTICE_TEMPLATE_RESPONSE_INVALID');
  if (isRefineHttpError(reason)) return adaptRefineFailure(reason, phase);
  return normalizeNoticeTemplateApiFailure(reason, phase);
}

/** Converts only locally parsed write input failures into safe rejection evidence. */
export function readNoticeTemplateWriteInput<T>(read: () => T): T {
  try {
    return read();
  } catch (reason) {
    if (isRefineHttpError(reason)) {
      const code = stableTemplateCode(reason.code);
      if (reason.kind === 'contract' && code !== undefined) {
        throw new NoticeTemplateRequestFailure('invalid', 'rejected', { code });
      }
    }
    throw reason;
  }
}

function adaptRefineFailure(reason: RefineHttpError, phase: NoticeTemplateRequestPhase) {
  const kind = refineFailureKind(reason, phase);
  const outcome = refineWriteOutcome(reason, phase);
  const code = stableTemplateCode(reason.code);
  return code === undefined
    ? new NoticeTemplateRequestFailure(kind, outcome)
    : new NoticeTemplateRequestFailure(kind, outcome, { code });
}

function refineFailureKind(reason: RefineHttpError, phase: NoticeTemplateRequestPhase): NoticeTemplateFailureKind {
  if (isExactMissingDetail(reason, phase)) return 'missing';
  if (typeof reason.code === 'string' && reason.code.startsWith('NOTICE_TEMPLATE_')) return 'invalid';
  if (isRefineUnavailable(reason)) return 'unavailable';
  return 'error';
}

function isExactMissingDetail(reason: RefineHttpError, phase: NoticeTemplateRequestPhase) {
  if (phase !== 'detail') return false;
  if (reason.kind === 'http') return reason.httpStatus === 404;
  return reason.kind === 'envelope' && reason.httpStatus === 200 && reason.code === NOTICE_TEMPLATE_MISSING_API_CODE;
}

function isRefineUnavailable(reason: RefineHttpError) {
  if (reason.kind === 'network') return true;
  return reason.kind === 'http' && (reason.httpStatus === 0 || (reason.httpStatus ?? 0) >= 500);
}

function refineWriteOutcome(reason: RefineHttpError, phase: NoticeTemplateRequestPhase): NoticeTemplateWriteOutcome {
  // `statusCode` is presentation metadata. Only a source HTTP status from the
  // write request can prove rejection, and a timeout remains commit-uncertain.
  if (phase !== 'write' || reason.kind !== 'http') return 'uncertain';
  return reason.httpStatus !== undefined &&
    reason.httpStatus >= 400 &&
    reason.httpStatus < 500 &&
    reason.httpStatus !== 408
    ? 'rejected'
    : 'uncertain';
}

function stableTemplateCode(code: string | number | undefined) {
  return typeof code === 'string' && code.startsWith('NOTICE_TEMPLATE_') ? code : undefined;
}

function contractFailure(code: string) {
  return new NoticeTemplateRequestFailure('invalid', 'uncertain', { code });
}
