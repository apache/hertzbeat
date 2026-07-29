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

import { AlertIntegrationContractError, AlertIntegrationRequestFailure } from '../model/alert-integration-model';
import { normalizeAlertIntegrationFailure } from './alert-integration-api-failure';

describe('alert integration failure boundary', () => {
  it.each([
    [new ApiMessageError('unauthorized', { status: 401 }), 'permission'],
    [new ApiMessageError('forbidden', { status: 403 }), 'permission'],
    [new ApiMessageError('missing evidence'), 'unavailable'],
    [new ApiMessageError('network', { cause: new Error('private') }), 'unavailable'],
    [new ApiMessageError('server', { status: 500 }), 'unavailable'],
    [new ApiMessageError('bad request', { status: 400 }), 'error']
  ] as const)('maps transport evidence to %s', (reason, kind) => {
    expect(normalizeAlertIntegrationFailure(reason)).toMatchObject({ kind });
  });

  it('redacts transport details and preserves contract evidence', () => {
    const result = normalizeAlertIntegrationFailure(new ApiMessageError('private', { status: 503 }));
    expect(result).toBeInstanceOf(AlertIntegrationRequestFailure);
    expect((result as AlertIntegrationRequestFailure).message).toBe('Alert integration request failed');

    const contract = new Error('contract');
    expect(normalizeAlertIntegrationFailure(contract)).toBe(contract);
  });

  it('classifies a malformed successful envelope as contract evidence without reading its message', () => {
    const result = normalizeAlertIntegrationFailure(new ApiMessageError('arbitrary private text', { status: 200 }));

    expect(result).toBeInstanceOf(AlertIntegrationContractError);
  });
});
