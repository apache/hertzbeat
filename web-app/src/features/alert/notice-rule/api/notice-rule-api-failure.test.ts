/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { NoticeRuleContractError, NoticeRuleRequestFailure } from '../model/notice-rule-failure';
import { normalizeNoticeRuleApiFailure, noticeRuleApiRequest } from './notice-rule-api-failure';

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
    expect(normalizeNoticeRuleApiFailure(reason, 'detail')).toMatchObject({ kind });
  });

  it('preserves domain contracts and redacts raw transport details', () => {
    const contract = new NoticeRuleContractError('NOTICE_RULE_DETAIL_INVALID');
    expect(normalizeNoticeRuleApiFailure(contract, 'detail')).toBe(contract);

    const normalized = normalizeNoticeRuleApiFailure(
      new ApiMessageError('private backend response', { status: 503, cause: new Error('private cause') }),
      'detail'
    );
    expect(normalized).toBeInstanceOf(NoticeRuleRequestFailure);
    expect(normalized.message).toBe('Notice rule request failed');
    expect(normalized.cause).toBeUndefined();
    expect(`${normalized.message} ${JSON.stringify(normalized)}`).not.toContain('private');
  });

  it('turns unknown API failures into explicit error evidence', () => {
    const normalized = normalizeNoticeRuleApiFailure({ token: 'private-token', statusCode: 503 }, 'collection');
    expect(normalized).toBeInstanceOf(NoticeRuleRequestFailure);
    expect(normalized).toMatchObject({ kind: 'error' });
    expect(Object.hasOwn(normalized, 'statusCode')).toBe(false);
    expect(Object.hasOwn(normalized, 'token')).toBe(false);
  });

  it.each([
    ['network cause', new ApiMessageError('private', { status: 404, cause: new TypeError('offline') }), 'unavailable'],
    ['exact backend detail missing', new ApiMessageError('private', { status: 200, code: 15 }), 'missing'],
    ['non-detail backend failure', new ApiMessageError('private', { status: 500, code: 15 }), 'error']
  ] as const)('keeps source evidence authoritative for %s', (_label, reason, kind) => {
    expect(normalizeNoticeRuleApiFailure(reason, 'detail')).toMatchObject({ kind });
  });

  it.each([
    ['source rejection', new ApiMessageError('private', { status: 422, code: 12 }), 'rejected'],
    ['timeout', new ApiMessageError('private', { status: 408 }), 'uncertain'],
    ['transport cause', new ApiMessageError('private', { status: 422, cause: new TypeError('offline') }), 'uncertain'],
    ['success envelope', new ApiMessageError('private', { status: 200, code: 12 }), 'uncertain'],
    ['server response', new ApiMessageError('private', { status: 500, code: 12 }), 'uncertain']
  ] as const)('records %s as %s write evidence', (_label, reason, writeOutcome) => {
    expect(normalizeNoticeRuleApiFailure(reason, 'write')).toMatchObject({ writeOutcome });
  });

  it('accepts backend missing evidence only for an exact detail read', () => {
    const reason = new ApiMessageError('private', { status: 200, code: 15 });
    const sourceMissing = new ApiMessageError('private', { status: 404 });
    expect(normalizeNoticeRuleApiFailure(reason, 'detail')).toMatchObject({ kind: 'missing' });
    expect(normalizeNoticeRuleApiFailure(reason, 'collection')).toMatchObject({ kind: 'error' });
    expect(normalizeNoticeRuleApiFailure(reason, 'write')).toMatchObject({ kind: 'error' });
    expect(normalizeNoticeRuleApiFailure(sourceMissing, 'collection')).toMatchObject({ kind: 'error' });
  });

  it('keeps caller cancellation out of visible failure evidence and redacts transport details', async () => {
    const controller = new AbortController();
    controller.abort();

    const failure = noticeRuleApiRequest(
      () =>
        Promise.reject(
          new ApiMessageError('private option transport', {
            cause: new DOMException('private abort detail', 'AbortError')
          })
        ),
      'collection',
      controller.signal
    );

    await expect(failure).rejects.toMatchObject({ name: 'AbortError', message: 'Request aborted' });
    await expect(failure).rejects.not.toBeInstanceOf(NoticeRuleRequestFailure);
  });
});
