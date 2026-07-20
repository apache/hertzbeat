/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { NoticeRuleContractError, NoticeRuleRequestFailure } from '../model/notice-rule-failure';
import { normalizeNoticeRuleApiFailure } from './notice-rule-api-failure';

describe('Notice Rule API failure boundary', () => {
  it.each([
    ['HTTP missing', new ApiMessageError('missing', { status: 404 }), 'missing'],
    ['backend missing', new ApiMessageError('missing', { code: 15, status: 200 }), 'missing'],
    ['network cause', new ApiMessageError('offline', { cause: new TypeError('private cause') }), 'unavailable'],
    ['missing HTTP evidence', new ApiMessageError('offline'), 'unavailable'],
    ['status zero', new ApiMessageError('offline', { status: 0 }), 'unavailable'],
    ['bad gateway', new ApiMessageError('gateway', { status: 502 }), 'unavailable'],
    ['service unavailable', new ApiMessageError('gateway', { status: 503 }), 'unavailable'],
    ['gateway timeout', new ApiMessageError('gateway', { status: 504 }), 'unavailable'],
    ['server response', new ApiMessageError('server', { status: 500 }), 'error'],
    ['other response', new ApiMessageError('bad request', { status: 400 }), 'error']
  ] as const)('maps %s to stable %s domain evidence', (_label, reason, kind) => {
    expect(normalizeNoticeRuleApiFailure(reason)).toMatchObject({ kind });
  });

  it('preserves domain contracts and redacts raw transport details', () => {
    const contract = new NoticeRuleContractError('NOTICE_RULE_DETAIL_INVALID');
    expect(normalizeNoticeRuleApiFailure(contract)).toBe(contract);

    const normalized = normalizeNoticeRuleApiFailure(
      new ApiMessageError('private backend response', { status: 503, cause: new Error('private cause') })
    );
    expect(normalized).toBeInstanceOf(NoticeRuleRequestFailure);
    expect(normalized.message).toBe('Notice rule request failed');
    expect(normalized.cause).toBeUndefined();
    expect(`${normalized.message} ${JSON.stringify(normalized)}`).not.toContain('private');
  });

  it('turns unknown API failures into explicit error evidence', () => {
    const normalized = normalizeNoticeRuleApiFailure({ token: 'private-token', statusCode: 503 });
    expect(normalized).toBeInstanceOf(NoticeRuleRequestFailure);
    expect(normalized).toMatchObject({ kind: 'error' });
    expect(Object.hasOwn(normalized, 'statusCode')).toBe(false);
    expect(Object.hasOwn(normalized, 'token')).toBe(false);
  });
});
