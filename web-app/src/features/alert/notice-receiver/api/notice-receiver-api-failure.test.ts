/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { NoticeReceiverRequestFailure } from '../model/notice-receiver-failure';
import { normalizeNoticeReceiverApiFailure } from './notice-receiver-api-failure';
import { NoticeReceiverContractError } from './notice-receiver-schema';

describe('Notice Receiver API failure boundary', () => {
  it.each([
    ['detail HTTP missing', new ApiMessageError('missing', { status: 404 }), 'detail', 'missing', 'uncertain'],
    [
      'detail business missing',
      new ApiMessageError('missing', { status: 200, code: 15 }),
      'detail',
      'missing',
      'uncertain'
    ],
    ['collection HTTP 404', new ApiMessageError('missing', { status: 404 }), 'collection', 'error', 'uncertain'],
    ['write HTTP 404', new ApiMessageError('missing', { status: 404 }), 'write', 'error', 'rejected'],
    ['write timeout', new ApiMessageError('timeout', { status: 408 }), 'write', 'error', 'uncertain'],
    [
      'write source rejection with business code',
      new ApiMessageError('invalid', { status: 422, code: 15 }),
      'write',
      'error',
      'rejected'
    ],
    ['missing HTTP evidence', new ApiMessageError('offline'), 'write', 'unavailable', 'uncertain'],
    [
      'network cause',
      new ApiMessageError('offline', { cause: new Error('private cause') }),
      'write',
      'unavailable',
      'uncertain'
    ],
    [
      '404 with network cause',
      new ApiMessageError('offline', { status: 404, cause: new Error('private cause') }),
      'detail',
      'unavailable',
      'uncertain'
    ],
    [
      'business missing with network cause',
      new ApiMessageError('offline', { status: 200, code: 15, cause: new Error('private cause') }),
      'detail',
      'unavailable',
      'uncertain'
    ],
    [
      '422 with network cause',
      new ApiMessageError('offline', { status: 422, cause: new Error('private cause') }),
      'write',
      'unavailable',
      'uncertain'
    ],
    ['status zero', new ApiMessageError('offline', { status: 0 }), 'write', 'unavailable', 'uncertain'],
    ['server status 500', new ApiMessageError('failed', { status: 500 }), 'write', 'unavailable', 'uncertain'],
    ['server status 501', new ApiMessageError('failed', { status: 501 }), 'write', 'unavailable', 'uncertain'],
    ['server status 599', new ApiMessageError('failed', { status: 599 }), 'write', 'unavailable', 'uncertain'],
    ['explicit client rejection', new ApiMessageError('failed', { status: 400 }), 'write', 'error', 'rejected'],
    ['read client rejection', new ApiMessageError('failed', { status: 400 }), 'collection', 'error', 'uncertain'],
    ['unknown failure', new Error('private implementation failure'), 'write', 'error', 'uncertain'],
    ['contract failure', new NoticeReceiverContractError('private schema detail'), 'write', 'invalid', 'uncertain']
  ] as const)('maps %s at %s to stable %s/%s domain evidence', (_label, error, phase, kind, writeOutcome) => {
    expect(normalizeNoticeReceiverApiFailure(error, phase)).toMatchObject({ kind, writeOutcome });
  });

  it('redacts transport and schema details without rewrapping domain failures', () => {
    const normalized = normalizeNoticeReceiverApiFailure(
      new ApiMessageError('private backend response', { status: 503, cause: new Error('private cause') }),
      'write'
    );
    expect(normalized).toBeInstanceOf(NoticeReceiverRequestFailure);
    expect(normalized).toMatchObject({ message: 'Notice receiver request failed' });
    expect(normalized.cause).toBeUndefined();
    expect(JSON.stringify(normalized)).not.toContain('private');

    const domain = new NoticeReceiverRequestFailure('invalid', 'rejected', {
      code: 'NOTICE_RECEIVER_REREAD_INVALID'
    });
    expect(normalizeNoticeReceiverApiFailure(domain, 'write')).toBe(domain);
    expect(normalizeNoticeReceiverApiFailure(domain, 'detail')).toMatchObject({
      kind: 'invalid',
      writeOutcome: 'uncertain'
    });
  });
});
