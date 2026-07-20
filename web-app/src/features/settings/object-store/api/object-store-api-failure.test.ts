/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { ObjectStoreRequestFailure } from '../model/object-store-failure';
import { ObjectStoreDraftContractError, ObjectStoreResourceContractError } from '../model/object-store-model';
import { normalizeObjectStoreApiFailure } from './object-store-api-failure';

describe('Object Store API failure boundary', () => {
  it.each([
    [
      'network',
      new ApiMessageError('private', { cause: new Error('private-cause') }),
      'write',
      'unavailable',
      'uncertain'
    ],
    ['server failure', new ApiMessageError('private', { status: 503 }), 'write', 'unavailable', 'uncertain'],
    ['timeout response', new ApiMessageError('private', { status: 408 }), 'write', 'error', 'uncertain'],
    [
      'cause-bearing client response',
      new ApiMessageError('private', { status: 422, cause: new Error('private-cause') }),
      'write',
      'unavailable',
      'uncertain'
    ],
    ['status zero', new ApiMessageError('private', { status: 0 }), 'write', 'unavailable', 'uncertain'],
    ['HTTP rejection', new ApiMessageError('private', { status: 422 }), 'write', 'error', 'rejected'],
    ['read HTTP failure', new ApiMessageError('private', { status: 422 }), 'read', 'error', 'uncertain'],
    ['business envelope', new ApiMessageError('private', { code: 20, status: 200 }), 'write', 'error', 'uncertain'],
    ['read contract', new ObjectStoreResourceContractError(), 'read', 'invalid', 'uncertain'],
    ['write response contract', new ObjectStoreResourceContractError(), 'write', 'invalid', 'uncertain'],
    ['draft contract', new ObjectStoreDraftContractError(), 'write', 'invalid', 'rejected'],
    ['read draft contract', new ObjectStoreDraftContractError(), 'read', 'invalid', 'uncertain'],
    ['unknown', { statusCode: 503, secretKey: 'private-secret' }, 'write', 'error', 'uncertain']
  ] as const)('normalizes %s', (_label, reason, phase, kind, writeOutcome) => {
    const failure = normalizeObjectStoreApiFailure(reason, phase);
    expect(failure).toMatchObject({ kind, writeOutcome, message: 'Object Store request failed' });
    expect(JSON.stringify(failure)).not.toContain('private');
  });

  it('preserves domain failure identity', () => {
    const failure = new ObjectStoreRequestFailure('unavailable', 'uncertain');
    expect(normalizeObjectStoreApiFailure(failure, 'read')).toBe(failure);
  });
});
