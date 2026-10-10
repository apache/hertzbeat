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
