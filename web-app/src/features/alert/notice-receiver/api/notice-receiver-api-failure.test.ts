/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { NoticeReceiverRequestFailure } from '../model/notice-receiver-failure';
import { normalizeNoticeReceiverApiFailure } from './notice-receiver-api-failure';
import { NoticeReceiverContractError } from './notice-receiver-schema';

describe('Notice Receiver API failure boundary', () => {
  it.each([
    ['HTTP missing', new ApiMessageError('missing', { status: 404 }), 'missing', 'rejected'],
    ['missing HTTP evidence', new ApiMessageError('offline'), 'unavailable', 'uncertain'],
    [
      'network cause',
      new ApiMessageError('offline', { cause: new Error('private cause') }),
      'unavailable',
      'uncertain'
    ],
    ['status zero', new ApiMessageError('offline', { status: 0 }), 'unavailable', 'uncertain'],
    ['server status 500', new ApiMessageError('failed', { status: 500 }), 'unavailable', 'uncertain'],
    ['server status 501', new ApiMessageError('failed', { status: 501 }), 'unavailable', 'uncertain'],
    ['server status 599', new ApiMessageError('failed', { status: 599 }), 'unavailable', 'uncertain'],
    ['explicit client rejection', new ApiMessageError('failed', { status: 400 }), 'error', 'rejected'],
    ['unknown failure', new Error('private implementation failure'), 'error', 'uncertain'],
    ['contract failure', new NoticeReceiverContractError('private schema detail'), 'invalid', 'uncertain']
  ] as const)('maps %s to stable %s/%s domain evidence', (_label, error, kind, writeOutcome) => {
    expect(normalizeNoticeReceiverApiFailure(error)).toMatchObject({ kind, writeOutcome });
  });

  it('redacts transport and schema details without rewrapping domain failures', () => {
    const normalized = normalizeNoticeReceiverApiFailure(
      new ApiMessageError('private backend response', { status: 503, cause: new Error('private cause') })
    );
    expect(normalized).toBeInstanceOf(NoticeReceiverRequestFailure);
    expect(normalized).toMatchObject({ message: 'Notice receiver request failed' });
    expect(normalized.cause).toBeUndefined();
    expect(JSON.stringify(normalized)).not.toContain('private');

    const domain = new NoticeReceiverRequestFailure('invalid', 'uncertain', {
      code: 'NOTICE_RECEIVER_REREAD_INVALID'
    });
    expect(normalizeNoticeReceiverApiFailure(domain)).toBe(domain);
  });
});
