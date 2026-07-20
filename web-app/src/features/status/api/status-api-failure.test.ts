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
  });

  it.each([
    ['missing', new ApiMessageError('Missing', { status: 404 }), 'missing', 'rejected'],
    ['unavailable', new ApiMessageError('Unavailable', { status: 503 }), 'unavailable', 'uncertain'],
    ['business rejection', new ApiMessageError('Rejected', { code: 12, status: 200 }), 'error', 'rejected'],
    ['HTTP rejection', new ApiMessageError('Rejected', { status: 400 }), 'error', 'rejected'],
    ['malformed success', new ApiMessageError('Invalid', { status: 200 }), 'error', 'uncertain']
  ] as const)('maps %s evidence to stable domain semantics', (_label, error, kind, writeOutcome) => {
    expect(normalizeStatusApiFailure(error)).toMatchObject({ kind, writeOutcome });
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
