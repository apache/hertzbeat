/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { NoticeTemplateContractError } from '../notice-template-model';
import { NoticeTemplateRequestFailure } from '../model/notice-template-failure';
import { normalizeNoticeTemplateApiFailure } from './notice-template-api-failure';

describe('Notice Template API failure boundary', () => {
  it.each([
    [
      'detail envelope missing',
      new ApiMessageError('private', { code: 1, status: 200 }),
      'detail',
      'missing',
      'rejected'
    ],
    ['detail HTTP missing', new ApiMessageError('private', { status: 404 }), 'detail', 'missing', 'rejected'],
    ['collection HTTP missing', new ApiMessageError('private', { status: 404 }), 'collection', 'error', 'rejected'],
    ['write envelope', new ApiMessageError('private', { code: 1, status: 200 }), 'write', 'error', 'rejected'],
    ['network', new ApiMessageError('private'), 'write', 'unavailable', 'uncertain'],
    ['status zero', new ApiMessageError('private', { status: 0 }), 'write', 'unavailable', 'uncertain'],
    ['server failure', new ApiMessageError('private', { status: 503 }), 'write', 'unavailable', 'uncertain'],
    ['explicit rejection', new ApiMessageError('private', { status: 400 }), 'write', 'error', 'rejected'],
    ['contract', new NoticeTemplateContractError(), 'write', 'invalid', 'uncertain'],
    ['unknown', { statusCode: 503, token: 'private-token' }, 'write', 'error', 'uncertain']
  ] as const)('normalizes %s', (_label, reason, phase, kind, writeOutcome) => {
    const failure = normalizeNoticeTemplateApiFailure(reason, phase);
    expect(failure).toMatchObject({ kind, writeOutcome, message: 'Notice Template request failed' });
    expect(JSON.stringify(failure)).not.toContain('private');
  });

  it('preserves domain failure identity', () => {
    const failure = new NoticeTemplateRequestFailure('unavailable', 'uncertain');
    expect(normalizeNoticeTemplateApiFailure(failure, 'write')).toBe(failure);
  });
});
