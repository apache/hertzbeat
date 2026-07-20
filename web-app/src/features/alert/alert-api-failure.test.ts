/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { AlertRequestFailure } from './alert-model';
import { normalizeAlertApiFailure } from './alert-api-failure';

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
});
