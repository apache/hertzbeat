/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import {
  AlertSilenceContractError,
  AlertSilenceMissingError,
  AlertSilenceRequestFailure
} from '../alert-silence-model';
import { normalizeAlertSilenceApiFailure } from './alert-silence-api-failure';

describe('Alert Silence API failure boundary', () => {
  it.each([
    {
      label: 'HTTP missing',
      error: new ApiMessageError('missing', { status: 404 }),
      kind: 'missing',
      writeOutcome: 'rejected'
    },
    {
      label: 'backend missing',
      error: new ApiMessageError('missing', { code: 3, status: 200 }),
      kind: 'missing',
      writeOutcome: 'uncertain'
    },
    {
      label: 'missing HTTP evidence',
      error: new ApiMessageError('offline'),
      kind: 'unavailable',
      writeOutcome: 'uncertain'
    },
    {
      label: 'network cause',
      error: new ApiMessageError('offline', { cause: new Error('private cause') }),
      kind: 'unavailable',
      writeOutcome: 'uncertain'
    },
    {
      label: 'status zero',
      error: new ApiMessageError('offline', { status: 0 }),
      kind: 'unavailable',
      writeOutcome: 'uncertain'
    },
    {
      label: 'bad gateway',
      error: new ApiMessageError('offline', { status: 502 }),
      kind: 'unavailable',
      writeOutcome: 'uncertain'
    },
    {
      label: 'service unavailable',
      error: new ApiMessageError('offline', { status: 503 }),
      kind: 'unavailable',
      writeOutcome: 'uncertain'
    },
    {
      label: 'gateway timeout',
      error: new ApiMessageError('offline', { status: 504 }),
      kind: 'unavailable',
      writeOutcome: 'uncertain'
    },
    {
      label: 'malformed success',
      error: new ApiMessageError('invalid response', { status: 200 }),
      kind: 'error',
      writeOutcome: 'uncertain'
    },
    {
      label: 'server response',
      error: new ApiMessageError('failed', { status: 500 }),
      kind: 'error',
      writeOutcome: 'uncertain'
    },
    {
      label: 'business response',
      error: new ApiMessageError('failed', { code: 15, status: 200 }),
      kind: 'error',
      writeOutcome: 'uncertain'
    },
    {
      label: 'explicit client rejection',
      error: new ApiMessageError('rejected', { status: 400 }),
      kind: 'error',
      writeOutcome: 'rejected'
    }
  ] as const)('maps $label to stable $kind/$writeOutcome domain evidence', ({ error, kind, writeOutcome }) => {
    expect(normalizeAlertSilenceApiFailure(error)).toMatchObject({ kind, writeOutcome });
  });

  it('redacts transport, response-contract, and unknown failures while preserving public domain evidence', () => {
    const normalized = normalizeAlertSilenceApiFailure(
      new ApiMessageError('private backend response', { status: 503, cause: new Error('private cause') })
    );
    expect(normalized).toBeInstanceOf(AlertSilenceRequestFailure);
    expect((normalized as AlertSilenceRequestFailure).message).toBe('Alert Silence request failed');
    expect((normalized as AlertSilenceRequestFailure).cause).toBeUndefined();

    const privateUnknown = new Error('private provider failure');
    expect(normalizeAlertSilenceApiFailure(privateUnknown)).toMatchObject({
      kind: 'error',
      writeOutcome: 'uncertain',
      message: 'Alert Silence request failed'
    });
    expect(JSON.stringify(normalizeAlertSilenceApiFailure(privateUnknown))).not.toContain('private provider failure');

    const privateContract = new AlertSilenceContractError('private response contract', {
      cause: new Error('private response value')
    });
    const normalizedContract = normalizeAlertSilenceApiFailure(privateContract);
    expect(normalizedContract).toMatchObject({
      kind: 'error',
      writeOutcome: 'uncertain',
      message: 'Alert Silence request failed'
    });
    expect(normalizedContract.cause).toBeUndefined();

    const domainError = new AlertSilenceRequestFailure('unavailable', 'uncertain');
    expect(normalizeAlertSilenceApiFailure(domainError)).toBe(domainError);

    const missing = new AlertSilenceMissingError();
    expect(normalizeAlertSilenceApiFailure(missing)).toBe(missing);
  });
});
