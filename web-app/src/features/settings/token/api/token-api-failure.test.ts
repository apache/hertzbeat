/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { TokenRequestFailure } from '../model/token-failure';
import { TokenApiContractError } from './token-schema';
import { normalizeTokenApiFailure } from './token-api-failure';

describe('Token API failure boundary', () => {
  it.each([
    [
      'network',
      new ApiMessageError('private', { cause: new Error('private-cause') }),
      'write',
      'unavailable',
      'uncertain'
    ],
    ['status zero', new ApiMessageError('private', { status: 0 }), 'write', 'unavailable', 'uncertain'],
    ['server failure', new ApiMessageError('private', { status: 503 }), 'write', 'unavailable', 'uncertain'],
    ['timeout', new ApiMessageError('private', { status: 408 }), 'write', 'error', 'uncertain'],
    [
      'cause-bearing HTTP rejection',
      new ApiMessageError('private', { cause: new Error('private-cause'), code: 20, status: 400 }),
      'write',
      'unavailable',
      'uncertain'
    ],
    ['HTTP rejection', new ApiMessageError('private', { status: 400 }), 'write', 'error', 'rejected'],
    [
      'HTTP rejection with business code',
      new ApiMessageError('private', { code: 20, status: 422 }),
      'write',
      'error',
      'rejected'
    ],
    ['collection HTTP rejection', new ApiMessageError('private', { status: 400 }), 'collection', 'error', 'uncertain'],
    ['business envelope', new ApiMessageError('private', { code: 20, status: 200 }), 'write', 'error', 'uncertain'],
    ['contract', new TokenApiContractError(), 'write', 'invalid', 'uncertain'],
    ['unknown', { statusCode: 503, token: 'private-token' }, 'write', 'error', 'uncertain']
  ] as const)('normalizes %s', (_label, reason, phase, kind, writeOutcome) => {
    const failure = normalizeTokenApiFailure(reason, phase);
    expect(failure).toMatchObject({ kind, writeOutcome, message: 'Token request failed' });
    expect(JSON.stringify(failure)).not.toContain('private');
  });

  it('preserves domain failure identity', () => {
    const failure = new TokenRequestFailure('unavailable', 'uncertain');
    expect(normalizeTokenApiFailure(failure, 'collection')).toBe(failure);
  });

  it('downgrades impossible rejected evidence when it crosses a collection boundary', () => {
    const failure = new TokenRequestFailure('error', 'rejected', { code: 'TOKEN_UPSTREAM_REJECTED' });

    expect(normalizeTokenApiFailure(failure, 'collection')).toMatchObject({
      code: 'TOKEN_UPSTREAM_REJECTED',
      kind: 'error',
      writeOutcome: 'uncertain'
    });
  });
});
