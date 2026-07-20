/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import {
  NoticeRuleContractError,
  NoticeRuleDomainFailure,
  NoticeRuleRequestFailure,
  noticeRuleCollectionFailureKind,
  noticeRuleDetailMismatchFailure,
  noticeRuleFailureKind,
  noticeRuleListRereadInvalidFailure,
  noticeRuleProviderMissingFailure,
  noticeRuleVariablesInvalidFailure,
  noticeRuleWriteFailureKind,
  preserveNoticeRuleFailure
} from './notice-rule-failure';

describe('Notice Rule domain failure model', () => {
  it.each([
    [new NoticeRuleRequestFailure('missing'), 'missing'],
    [new NoticeRuleRequestFailure('unavailable'), 'unavailable'],
    [new NoticeRuleRequestFailure('error'), 'error'],
    [new NoticeRuleContractError('NOTICE_RULE_RESPONSE_INVALID'), 'invalid'],
    [new NoticeRuleContractError('NOTICE_RECEIVER_RESPONSE_INVALID'), 'invalid'],
    [new Error('unknown'), 'error']
  ] as const)('classifies explicit domain evidence without transport fields', (reason, expected) => {
    expect(noticeRuleFailureKind(reason)).toBe(expected);
  });

  it('keeps missing detail-only and collapses it for collection and write contexts', () => {
    const missing = new NoticeRuleRequestFailure('missing');

    expect(noticeRuleFailureKind(missing)).toBe('missing');
    expect(noticeRuleCollectionFailureKind(missing)).toBe('error');
    expect(noticeRuleWriteFailureKind(missing)).toBe('error');
  });

  it('uses named domain failures for local contract boundaries', () => {
    expect(noticeRuleDetailMismatchFailure()).toMatchObject({
      kind: 'invalid',
      code: 'NOTICE_RULE_DETAIL_INVALID'
    });
    expect(noticeRuleVariablesInvalidFailure()).toMatchObject({
      kind: 'invalid',
      code: 'NOTICE_RULE_VARIABLES_INVALID'
    });
    expect(noticeRuleListRereadInvalidFailure()).toMatchObject({
      kind: 'invalid',
      code: 'NOTICE_RULE_LIST_REREAD_INVALID'
    });
    expect(noticeRuleProviderMissingFailure()).toMatchObject({
      kind: 'missing',
      code: 'NOTICE_RULE_MISSING'
    });
  });

  it('preserves or explicitly adapts domain evidence without copying arbitrary fields', () => {
    const unavailable = new NoticeRuleRequestFailure('unavailable');
    expect(preserveNoticeRuleFailure(unavailable, 'unavailable')).toBe(unavailable);

    const collapsed = preserveNoticeRuleFailure(new NoticeRuleRequestFailure('missing'), 'error');
    expect(collapsed).toBeInstanceOf(NoticeRuleDomainFailure);
    expect(collapsed).toMatchObject({ kind: 'error' });

    const privateEvidence = { statusCode: 503, code: 'PRIVATE_CODE', token: 'private-token' };
    const normalized = preserveNoticeRuleFailure(privateEvidence, 'unavailable');
    expect(normalized).toBeInstanceOf(NoticeRuleDomainFailure);
    expect(normalized).toMatchObject({ kind: 'unavailable' });
    expect(Object.hasOwn(normalized, 'statusCode')).toBe(false);
    expect(Object.hasOwn(normalized, 'token')).toBe(false);
    expect(`${normalized.message} ${JSON.stringify(normalized)}`).not.toContain('private');
  });
});
