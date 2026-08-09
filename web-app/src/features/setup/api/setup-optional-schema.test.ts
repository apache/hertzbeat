/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { loginPath } from '@/core/auth/navigation';

import { parseSetupCompleteResponse, parseSetupOptionsResponse } from './setup-optional-schema';

describe('optional setup wire contract', () => {
  it('parses the exact options acknowledgement', () => {
    expect(
      parseSetupOptionsResponse({
        publicBaseUrlConfigured: true,
        serverOtlpHttpConfigured: false,
        serverOtlpGrpcConfigured: true,
        retentionConfigured: true,
        mailConfigured: false,
        phase: 'optional_configuration'
      })
    ).toMatchObject({ phase: 'optional_configuration', publicBaseUrlConfigured: true });
  });

  it('parses only a complete response with a safe local login path', () => {
    expect(
      parseSetupCompleteResponse({
        phase: 'complete',
        completedAt: '2026-08-09T08:00:00Z',
        loginPath,
        username: 'operator'
      })
    ).toEqual({
      phase: 'complete',
      completedAt: '2026-08-09T08:00:00Z',
      loginPath,
      username: 'operator'
    });
  });

  it.each([
    [
      'extra options field',
      {
        publicBaseUrlConfigured: true,
        serverOtlpHttpConfigured: false,
        serverOtlpGrpcConfigured: false,
        retentionConfigured: true,
        mailConfigured: false,
        phase: 'optional_configuration',
        extra: true
      }
    ],
    [
      'noncanonical login path',
      {
        phase: 'complete',
        completedAt: '2026-08-09T08:00:00Z',
        loginPath: '/login',
        username: 'operator'
      }
    ],
    [
      'external login path',
      {
        phase: 'complete',
        completedAt: '2026-08-09T08:00:00Z',
        loginPath: 'https://outside.example/login',
        username: 'operator'
      }
    ],
    [
      'password field',
      {
        phase: 'complete',
        completedAt: '2026-08-09T08:00:00Z',
        loginPath: '/passport/login',
        username: 'operator',
        password: 'must-not-parse'
      }
    ]
  ])('rejects %s', (label, value) => {
    const parse = label === 'extra options field' ? parseSetupOptionsResponse : parseSetupCompleteResponse;
    expect(() => parse(value)).toThrowError('Setup response was invalid');
  });
});
