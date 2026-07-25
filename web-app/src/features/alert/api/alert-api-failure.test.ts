/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { AlertRequestFailure } from '../model/alert-model';
import { alertApiRequest, normalizeAlertApiFailure } from './alert-api-failure';

describe('Alert Center API failure boundary', () => {
  it.each([
    ['missing HTTP evidence', new ApiMessageError('offline'), 'unavailable'],
    [
      'network cause',
      new ApiMessageError('private network error', { cause: new Error('private cause') }),
      'unavailable'
    ],
    ['status zero', new ApiMessageError('offline', { status: 0 }), 'unavailable'],
    ['bad gateway', new ApiMessageError('offline', { status: 502 }), 'unavailable'],
    ['service unavailable', new ApiMessageError('offline', { status: 503 }), 'unavailable'],
    ['gateway timeout', new ApiMessageError('offline', { status: 504 }), 'unavailable'],
    ['other server failure', new ApiMessageError('failed', { status: 500 }), 'error'],
    ['client rejection', new ApiMessageError('failed', { status: 400 }), 'error']
  ] as const)('maps %s to the stable %s domain kind', (_label, error, kind) => {
    expect(normalizeAlertApiFailure(error)).toMatchObject({ kind });
  });

  it('distinguishes definite request rejection from an uncertain write outcome', () => {
    expect(normalizeAlertApiFailure(new ApiMessageError('rejected', { status: 400 }))).toMatchObject({
      writeOutcome: 'rejected'
    });
    expect(normalizeAlertApiFailure(new ApiMessageError('offline', { status: 503 }))).toMatchObject({
      writeOutcome: 'uncertain'
    });
    expect(
      normalizeAlertApiFailure(new ApiMessageError('application rejection', { code: 1, status: 200 }))
    ).toMatchObject({
      writeOutcome: 'rejected'
    });
  });

  it('redacts transport details and preserves non-transport domain errors', () => {
    const normalized = normalizeAlertApiFailure(
      new ApiMessageError('private backend response', { status: 503, cause: new Error('private cause') })
    );
    expect(normalized).toBeInstanceOf(AlertRequestFailure);
    expect((normalized as AlertRequestFailure).message).toBe('Alert request failed');
    expect((normalized as AlertRequestFailure).cause).toBeUndefined();

    const domainError = new Error('domain validation failed');
    expect(normalizeAlertApiFailure(domainError)).toBe(domainError);
  });

  it('keeps caller cancellation out of the user-visible failure contract', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      alertApiRequest(
        () => Promise.reject(new ApiMessageError('private abort', { cause: new DOMException('abort', 'AbortError') })),
        controller.signal
      )
    ).rejects.toMatchObject({ name: 'AbortError', message: 'Request aborted' });
  });
});
