/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
