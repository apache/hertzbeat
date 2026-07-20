/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export type NoticeRuleFailureKind = 'missing' | 'invalid' | 'unavailable' | 'error';
export type NoticeRuleCollectionFailureKind = Exclude<NoticeRuleFailureKind, 'missing'>;

/** Redacted evidence shared by the Notice Rule API, provider, and controllers. */
export class NoticeRuleDomainFailure extends Error {
  constructor(
    readonly kind: NoticeRuleFailureKind,
    readonly code: string,
    message = 'Notice rule operation failed'
  ) {
    super(message);
    this.name = 'NoticeRuleDomainFailure';
  }
}

/** Stable request evidence produced at the Notice Rule API boundary. */
export class NoticeRuleRequestFailure extends NoticeRuleDomainFailure {
  constructor(kind: Exclude<NoticeRuleFailureKind, 'invalid'>) {
    super(kind, 'NOTICE_RULE_REQUEST_FAILED', 'Notice rule request failed');
    this.name = 'NoticeRuleRequestFailure';
  }
}

/** A named local or wire-contract failure that is safe to expose across layers. */
export class NoticeRuleContractError extends NoticeRuleDomainFailure {
  constructor(code: string) {
    super('invalid', code, 'Notice rule contract failed');
    this.name = 'NoticeRuleContractError';
  }
}

export function noticeRuleFailureKind(reason: unknown): NoticeRuleFailureKind {
  return reason instanceof NoticeRuleDomainFailure ? reason.kind : 'error';
}

export function noticeRuleCollectionFailureKind(reason: unknown): NoticeRuleCollectionFailureKind {
  const kind = noticeRuleFailureKind(reason);
  return kind === 'missing' ? 'error' : kind;
}

export function noticeRuleWriteFailureKind(reason: unknown): NoticeRuleCollectionFailureKind {
  return noticeRuleCollectionFailureKind(reason);
}

/**
 * Retains already-normalized evidence or creates a redacted domain failure for
 * a context-specific fallback. Arbitrary source fields never cross the model.
 */
export function preserveNoticeRuleFailure(reason: unknown, kind: NoticeRuleFailureKind): NoticeRuleDomainFailure {
  if (reason instanceof NoticeRuleDomainFailure && reason.kind === kind) return reason;
  const code = reason instanceof NoticeRuleDomainFailure ? reason.code : 'NOTICE_RULE_OPERATION_FAILED';
  return new NoticeRuleDomainFailure(kind, code);
}

export function noticeRuleDetailMismatchFailure() {
  return new NoticeRuleContractError('NOTICE_RULE_DETAIL_INVALID');
}

export function noticeRuleVariablesInvalidFailure() {
  return new NoticeRuleContractError('NOTICE_RULE_VARIABLES_INVALID');
}

export function noticeRuleListRereadInvalidFailure() {
  return new NoticeRuleContractError('NOTICE_RULE_LIST_REREAD_INVALID');
}

export function noticeRuleProviderMissingFailure() {
  return new NoticeRuleDomainFailure('missing', 'NOTICE_RULE_MISSING');
}
