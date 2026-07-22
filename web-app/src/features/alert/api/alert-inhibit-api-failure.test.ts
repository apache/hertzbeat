/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { AlertInhibitRequestFailure } from '../model/alert-inhibit-model';
import { alertInhibitApiRequest, normalizeAlertInhibitApiFailure } from './alert-inhibit-api-failure';

describe('Alert Inhibit API failure boundary', () => {
  it.each([
    ['HTTP missing', new ApiMessageError('missing', { status: 404 }), 'missing', 'rejected'],
    ['backend missing', new ApiMessageError('missing', { code: 3, status: 200 }), 'missing', 'uncertain'],
    ['missing HTTP evidence', new ApiMessageError('offline'), 'unavailable', 'uncertain'],
    [
      'network cause',
      new ApiMessageError('offline', { cause: new Error('private cause') }),
      'unavailable',
      'uncertain'
    ],
    ['status zero', new ApiMessageError('offline', { status: 0 }), 'unavailable', 'uncertain'],
    ['bad gateway', new ApiMessageError('offline', { status: 502 }), 'unavailable', 'uncertain'],
    ['service unavailable', new ApiMessageError('offline', { status: 503 }), 'unavailable', 'uncertain'],
    ['gateway timeout', new ApiMessageError('offline', { status: 504 }), 'unavailable', 'uncertain'],
    ['malformed success', new ApiMessageError('invalid response', { status: 200 }), 'error', 'uncertain'],
    ['server response', new ApiMessageError('failed', { status: 500 }), 'error', 'uncertain'],
    ['server application response', new ApiMessageError('failed', { code: 12, status: 500 }), 'error', 'uncertain'],
    ['request timeout response', new ApiMessageError('failed', { status: 408 }), 'error', 'uncertain'],
    ['other client rejection', new ApiMessageError('failed', { status: 400 }), 'error', 'rejected'],
    [
      'client rejection with business code',
      new ApiMessageError('failed', { code: 12, status: 422 }),
      'error',
      'rejected'
    ],
    [
      'client response with a transport cause',
      new ApiMessageError('offline', { status: 422, cause: new Error('private cause') }),
      'unavailable',
      'uncertain'
    ],
    [
      'HTTP missing with a transport cause',
      new ApiMessageError('offline', { status: 404, cause: new Error('private cause') }),
      'unavailable',
      'uncertain'
    ],
    [
      'backend missing with a transport cause',
      new ApiMessageError('offline', { code: 3, status: 200, cause: new Error('private cause') }),
      'unavailable',
      'uncertain'
    ],
    ['business response', new ApiMessageError('failed', { code: 12, status: 200 }), 'error', 'uncertain']
  ] as const)('maps %s to stable %s/%s domain evidence', (_label, error, kind, writeOutcome) => {
    expect(normalizeAlertInhibitApiFailure(error)).toMatchObject({ kind, writeOutcome });
  });

  it('redacts transport details and preserves non-transport domain errors', () => {
    const normalized = normalizeAlertInhibitApiFailure(
      new ApiMessageError('private backend response', { status: 503, cause: new Error('private cause') })
    );
    expect(normalized).toBeInstanceOf(AlertInhibitRequestFailure);
    expect((normalized as AlertInhibitRequestFailure).message).toBe('Alert Inhibit request failed');
    expect((normalized as AlertInhibitRequestFailure).cause).toBeUndefined();

    const domainError = new Error('domain validation failed');
    expect(normalizeAlertInhibitApiFailure(domainError)).toBe(domainError);
  });

  it('keeps caller cancellation out of the user-visible failure contract', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      alertInhibitApiRequest(
        () => Promise.reject(new ApiMessageError('private abort', { cause: new DOMException('abort', 'AbortError') })),
        controller.signal
      )
    ).rejects.toMatchObject({ name: 'AbortError', message: 'Request aborted' });
  });
});
