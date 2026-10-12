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

import { ApiMessageError } from '@/core/http/api-message';
import { RuntimeStatusContractError } from './runtime-status-schema';
import { classifyRuntimeStatusRequestFailure } from './runtime-status-api-failure';

describe('runtime status request failure boundary', () => {
  it.each([
    ['expired session', new ApiMessageError('private', { status: 401 }), 'permission'],
    ['forbidden session', new ApiMessageError('private', { status: 403 }), 'permission'],
    ['transport unavailable', new ApiMessageError('private'), 'unavailable'],
    ['server unavailable', new ApiMessageError('private', { status: 503 }), 'unavailable'],
    ['invalid contract', new RuntimeStatusContractError(), 'contract'],
    ['unclassified failure', new Error('private'), 'error']
  ] as const)('classifies %s without exposing error content', (_label, error, expected) => {
    expect(classifyRuntimeStatusRequestFailure(error)).toBe(expected);
  });
});
