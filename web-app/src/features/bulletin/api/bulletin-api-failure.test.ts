/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { BulletinRequestFailure } from '../model/bulletin-failure';
import { BulletinContractError } from './bulletin-schema';
import { bulletinApiRequest, normalizeBulletinApiFailure } from './bulletin-api-failure';

describe('Bulletin API failure boundary', () => {
  it.each([
    [
      'network write',
      new ApiMessageError('private', { cause: new Error('private-cause') }),
      'create',
      'unavailable',
      'uncertain'
    ],
    ['server write', new ApiMessageError('private', { status: 503 }), 'update', 'unavailable', 'uncertain'],
    ['timeout write', new ApiMessageError('private', { status: 408 }), 'create', 'error', 'uncertain'],
    [
      'cause-bearing client write',
      new ApiMessageError('private', { status: 400, cause: new Error('private-cause') }),
      'update',
      'unavailable',
      'uncertain'
    ],
    ['HTTP rejection', new ApiMessageError('private', { status: 422 }), 'delete', 'error', 'rejected'],
    [
      'HTTP rejection carrying a business code',
      new ApiMessageError('private', { code: 15, status: 422 }),
      'delete',
      'error',
      'rejected'
    ],
    ['business envelope', new ApiMessageError('private', { code: 15, status: 200 }), 'create', 'error', 'uncertain'],
    ['detail absence', new ApiMessageError('private', { status: 404 }), 'read-detail', 'missing', 'uncertain'],
    [
      'detail absence carrying a transport cause',
      new ApiMessageError('private', { status: 404, cause: new Error('private-cause') }),
      'read-detail',
      'unavailable',
      'uncertain'
    ],
    ['list client response', new ApiMessageError('private', { status: 422 }), 'list', 'error', 'uncertain'],
    [
      'metrics unavailable',
      new ApiMessageError('private', { code: 15, status: 200 }),
      'metrics',
      'unavailable',
      'uncertain'
    ],
    ['contract', new BulletinContractError('private-contract'), 'list', 'invalid', 'uncertain'],
    ['unknown', { status: 422, message: 'private' }, 'update', 'error', 'uncertain']
  ] as const)('normalizes %s without retaining raw evidence', (_label, reason, operation, kind, writeOutcome) => {
    const failure = normalizeBulletinApiFailure(reason, operation);

    expect(failure).toMatchObject({ kind, writeOutcome, message: 'Bulletin request failed' });
    expect(JSON.stringify(failure)).not.toContain('private');
  });

  it('preserves typed failure identity', () => {
    const failure = new BulletinRequestFailure('unavailable', 'uncertain');

    expect(normalizeBulletinApiFailure(failure, 'list')).toBe(failure);
  });

  it('keeps caller cancellation out of the user-visible failure contract', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      bulletinApiRequest(
        'list',
        () => Promise.reject(new ApiMessageError('private abort', { cause: new DOMException('abort', 'AbortError') })),
        controller.signal
      )
    ).rejects.toMatchObject({ name: 'AbortError', message: 'Request aborted' });
  });
});
