/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { StatusOrgNotFoundError, StatusRequestFailure } from '../shared/status-error-model';
import { normalizeStatusApiFailure } from './status-api-failure';

describe('Status API failure boundary', () => {
  it('maps only the exact organization envelope to the domain not-found error', () => {
    const exact = normalizeStatusApiFailure(
      new ApiMessageError('Status Page Organization Not Found', { code: 15, status: 200 }),
      { resource: 'organization' }
    );
    expect(exact).toBeInstanceOf(StatusOrgNotFoundError);

    const nearMatches = [
      new ApiMessageError('Different response', { code: 15, status: 200 }),
      new ApiMessageError('Status Page Organization Not Found', { code: 15, status: 503 }),
      new ApiMessageError('Status Page Organization Not Found', { code: 16, status: 200 })
    ];
    for (const error of nearMatches) {
      expect(normalizeStatusApiFailure(error, { resource: 'organization' })).not.toBeInstanceOf(StatusOrgNotFoundError);
    }

    const causeBearingExact = normalizeStatusApiFailure(
      new ApiMessageError('Status Page Organization Not Found', {
        code: 15,
        status: 200,
        cause: new Error('private-cause')
      }),
      { resource: 'organization' }
    );
    expect(causeBearingExact).not.toBeInstanceOf(StatusOrgNotFoundError);
    expect(causeBearingExact).toMatchObject({ kind: 'unavailable', writeOutcome: 'uncertain' });
    expect(JSON.stringify(causeBearingExact)).not.toContain('private-cause');
  });

  it.each([
    ['missing', new ApiMessageError('Missing', { status: 404 }), 'missing', 'rejected'],
    ['unavailable', new ApiMessageError('Unavailable', { status: 503 }), 'unavailable', 'uncertain'],
    ['business envelope', new ApiMessageError('Rejected', { code: 12, status: 200 }), 'error', 'uncertain'],
    [
      'server business envelope',
      new ApiMessageError('Rejected', { code: 12, status: 503 }),
      'unavailable',
      'uncertain'
    ],
    ['request timeout', new ApiMessageError('Timed out', { code: 12, status: 408 }), 'error', 'uncertain'],
    ['unknown transport', new ApiMessageError('Unknown', { code: 12 }), 'unavailable', 'uncertain'],
    ['transport status zero', new ApiMessageError('Network', { status: 0 }), 'unavailable', 'uncertain'],
    [
      'transport cause with missing-looking status',
      new ApiMessageError('Network', { status: 404, cause: new Error('offline') }),
      'unavailable',
      'uncertain'
    ],
    [
      'transport cause with missing-looking envelope',
      new ApiMessageError('Network', { status: 200, code: 15, cause: new Error('offline') }),
      'unavailable',
      'uncertain'
    ],
    [
      'transport cause with client-looking status',
      new ApiMessageError('Network', { status: 422, cause: new Error('offline') }),
      'unavailable',
      'uncertain'
    ],
    ['HTTP rejection with code', new ApiMessageError('Rejected', { code: 12, status: 422 }), 'error', 'rejected'],
    ['HTTP rejection', new ApiMessageError('Rejected', { status: 400 }), 'error', 'rejected'],
    ['malformed success', new ApiMessageError('Invalid', { status: 200 }), 'error', 'uncertain']
  ] as const)('maps %s evidence to stable domain semantics', (_label, error, kind, writeOutcome) => {
    expect(normalizeStatusApiFailure(error)).toMatchObject({ kind, writeOutcome });
  });

  it('keeps the organization not-found envelope as read-only missing evidence', () => {
    const normalized = normalizeStatusApiFailure(
      new ApiMessageError('Status Page Organization Not Found', { code: 15, status: 200 }),
      { resource: 'organization' }
    );

    expect(normalized).toBeInstanceOf(StatusOrgNotFoundError);
    expect(normalized).toMatchObject({ kind: 'missing', writeOutcome: 'uncertain' });
  });

  it('does not retain transport messages and preserves existing domain errors', () => {
    const privateMessage = 'private backend response';
    const normalized = normalizeStatusApiFailure(new ApiMessageError(privateMessage, { status: 503 }));
    expect(normalized).toBeInstanceOf(StatusRequestFailure);
    expect((normalized as StatusRequestFailure).message).toBe('Status request failed');
    expect((normalized as StatusRequestFailure).cause).toBeUndefined();

    const domainError = new Error('domain validation failed');
    expect(normalizeStatusApiFailure(domainError)).toBe(domainError);
  });
});
