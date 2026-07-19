/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import {
  classifyNoticeRuleCollectionFailure,
  classifyNoticeRuleFailure,
  classifyNoticeRuleWriteFailure
} from './notice-rule-failure';

describe('notice rule failure classification', () => {
  it.each([
    ['direct HTTP missing', new ApiMessageError('missing', { status: 404 }), 'missing'],
    ['direct backend missing', new ApiMessageError('missing', { code: 15, status: 200 }), 'missing'],
    ['direct network failure', new ApiMessageError('offline', { cause: new TypeError('fetch') }), 'unavailable'],
    ['direct gateway failure', new ApiMessageError('gateway', { status: 503 }), 'unavailable'],
    ['Refine gateway failure', { statusCode: 502 }, 'unavailable'],
    ['contract failure', { code: 'NOTICE_RULE_PAGE_INVALID' }, 'invalid'],
    ['server failure', new ApiMessageError('server', { status: 500 }), 'error']
  ])('keeps %s distinct', (_label, reason, expected) => {
    expect(classifyNoticeRuleFailure(reason)).toBe(expected);
  });

  it('never exposes missing after write admission', () => {
    expect(classifyNoticeRuleWriteFailure(new ApiMessageError('missing', { status: 404 }))).toBe('error');
    expect(classifyNoticeRuleWriteFailure({ code: 'NOTICE_RULE_MISSING', statusCode: 404 })).toBe('error');
  });

  it('never exposes record-missing semantics for collection reads', () => {
    expect(classifyNoticeRuleCollectionFailure(new ApiMessageError('missing', { status: 404 }))).toBe('error');
    expect(classifyNoticeRuleCollectionFailure({ code: 'NOTICE_RULE_MISSING', statusCode: 404 })).toBe('error');
  });
});
