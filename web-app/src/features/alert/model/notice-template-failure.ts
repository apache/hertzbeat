/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export type NoticeTemplateFailureKind = 'missing' | 'invalid' | 'unavailable' | 'error';
export type NoticeTemplateNonMissingFailureKind = Exclude<NoticeTemplateFailureKind, 'missing'>;
export type NoticeTemplateWriteOutcome = 'rejected' | 'uncertain';

type NoticeTemplateFailureOptions = { code?: string };

/** Redacted request evidence shared by the API, provider, and controllers. */
export class NoticeTemplateRequestFailure extends Error {
  readonly kind: NoticeTemplateFailureKind;
  readonly writeOutcome: NoticeTemplateWriteOutcome;
  readonly code: string | undefined;

  constructor(
    kind: NoticeTemplateFailureKind,
    writeOutcome: NoticeTemplateWriteOutcome,
    options: NoticeTemplateFailureOptions = {}
  ) {
    super('Notice Template request failed');
    this.name = 'NoticeTemplateRequestFailure';
    this.kind = kind;
    this.writeOutcome = writeOutcome;
    this.code = options.code;
  }
}

export function classifyNoticeTemplateDetailFailure(reason: unknown): NoticeTemplateFailureKind {
  return reason instanceof NoticeTemplateRequestFailure ? reason.kind : 'error';
}

export function classifyNoticeTemplateCollectionFailure(reason: unknown): NoticeTemplateNonMissingFailureKind {
  const kind = classifyNoticeTemplateDetailFailure(reason);
  return kind === 'missing' ? 'error' : kind;
}

export function isNoticeTemplateWriteRejection(reason: unknown) {
  return reason instanceof NoticeTemplateRequestFailure && reason.writeOutcome === 'rejected';
}

/** Returns collection-safe evidence, where exact-detail `missing` cannot escape. */
export function normalizeNoticeTemplateCollectionFailure(reason: unknown) {
  if (reason instanceof NoticeTemplateRequestFailure && reason.kind !== 'missing') return reason;
  const outcome = reason instanceof NoticeTemplateRequestFailure ? reason.writeOutcome : 'uncertain';
  return new NoticeTemplateRequestFailure('error', outcome);
}
