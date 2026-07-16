/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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

import { ApiMessageError } from '@/core/http/api-message';

import { isStatusOrgNotFound, publicStatusState } from './public-status-model';

describe('public status state', () => {
  it('distinguishes missing configuration from backend failure', () => {
    const notFound = new ApiMessageError('Status Page Organization Not Found', { code: 15, status: 200 });
    expect(isStatusOrgNotFound(notFound)).toBe(true);
    expect(publicStatusState(notFound, null, null)).toBe('unconfigured');
    expect(publicStatusState(null, null, null)).toBe('ready');
  });

  it('keeps transport and partial-query failures unavailable', () => {
    const serviceUnavailable = new ApiMessageError('Request failed with status 503', { status: 503 });
    const networkFailure = new ApiMessageError('Failed to fetch');
    const genericEnvelopeFailure = new ApiMessageError('Status Page Organization Not Found', { code: 15, status: 503 });

    expect(publicStatusState(serviceUnavailable, null, null)).toBe('unavailable');
    expect(publicStatusState(networkFailure, null, null)).toBe('unavailable');
    expect(publicStatusState(genericEnvelopeFailure, null, null)).toBe('unavailable');
    expect(publicStatusState(null, new Error('components unavailable'), null)).toBe('unavailable');
    expect(publicStatusState(null, null, new Error('incidents unavailable'))).toBe('unavailable');
    expect(publicStatusState(
      new ApiMessageError('Status Page Organization Not Found', { code: 15, status: 200 }),
      new Error('components unavailable'),
      null
    )).toBe('unavailable');
  });
});
