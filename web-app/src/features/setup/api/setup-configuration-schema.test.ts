/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { parseConfigurationResponse, parseValidationResponse } from './setup-configuration-schema';

describe('setup configuration response contract', () => {
  it('parses safe section validation evidence', () => {
    expect(
      parseValidationResponse({
        valid: false,
        observedAt: '2026-08-08T06:00:00Z',
        errorCode: 'metadata_connection_failed',
        warnings: ['h2_non_production']
      })
    ).toEqual({
      valid: false,
      observedAt: '2026-08-08T06:00:00Z',
      errorCode: 'metadata_connection_failed',
      warnings: ['h2_non_production']
    });
  });

  it('parses the operation acknowledgement without connection details', () => {
    expect(
      parseConfigurationResponse({
        operationId: 'setup-1',
        state: 'pending',
        phase: 'application_starting',
        nextPollAfterMillis: 500,
        exportAvailable: false
      })
    ).toMatchObject({ operationId: 'setup-1', phase: 'application_starting' });
  });

  it.each([
    ['unknown warning', { valid: true, observedAt: '2026-08-08T06:00:00Z', errorCode: null, warnings: ['other'] }],
    ['secret detail', { valid: true, observedAt: '2026-08-08T06:00:00Z', errorCode: null, warnings: [], password: 'x' }]
  ])('rejects validation response with %s', (_label, value) => {
    expect(() => parseValidationResponse(value)).toThrowError('Setup response was invalid');
  });
});
