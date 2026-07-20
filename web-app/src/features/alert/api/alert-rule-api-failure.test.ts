/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { AlertRuleRequestFailure } from '../alert-rule-model';
import { normalizeAlertRuleApiFailure } from './alert-rule-api-failure';

describe('Alert Rule API failure boundary', () => {
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
    ['other server failure', new ApiMessageError('failed', { status: 500 }), 'error', 'uncertain'],
    ['client rejection', new ApiMessageError('failed', { status: 400 }), 'error', 'rejected'],
    ['request timeout', new ApiMessageError('failed', { status: 408 }), 'error', 'uncertain'],
    [
      'client-looking network failure',
      new ApiMessageError('failed', { status: 422, cause: new Error('request did not complete') }),
      'unavailable',
      'uncertain'
    ],
    [
      'missing-looking network failure',
      new ApiMessageError('failed', { status: 404, cause: new Error('request did not complete') }),
      'unavailable',
      'uncertain'
    ],
    [
      'business-missing-looking network failure',
      new ApiMessageError('failed', { status: 200, code: 3, cause: new Error('request did not complete') }),
      'unavailable',
      'uncertain'
    ],
    [
      'source rejection with business code',
      new ApiMessageError('failed', { status: 422, code: 12 }),
      'error',
      'rejected'
    ],
    ['business response', new ApiMessageError('failed', { code: 12, status: 200 }), 'error', 'uncertain']
  ] as const)('maps %s to stable %s/%s domain evidence', (_label, error, kind, writeOutcome) => {
    expect(normalizeAlertRuleApiFailure(error)).toMatchObject({ kind, writeOutcome });
  });

  it('redacts transport details and preserves non-transport domain errors', () => {
    const normalized = normalizeAlertRuleApiFailure(
      new ApiMessageError('private backend response', { status: 503, cause: new Error('private cause') })
    );
    expect(normalized).toBeInstanceOf(AlertRuleRequestFailure);
    expect((normalized as AlertRuleRequestFailure).message).toBe('Alert Rule request failed');
    expect((normalized as AlertRuleRequestFailure).cause).toBeUndefined();

    const domainError = new Error('domain validation failed');
    expect(normalizeAlertRuleApiFailure(domainError)).toBe(domainError);
  });
});
