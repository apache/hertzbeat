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

import { ApiMessageError } from './api-message';
import { apiMessageWriteOutcome } from './api-message-write-evidence';

describe('API message write evidence', () => {
  it.each([
    ['network cause', new ApiMessageError('offline', { cause: new Error('private cause') }), 'uncertain'],
    [
      'cause with client status',
      new ApiMessageError('offline', { status: 422, cause: new Error('private cause') }),
      'uncertain'
    ],
    ['request timeout', new ApiMessageError('timeout', { status: 408 }), 'uncertain'],
    ['client rejection', new ApiMessageError('invalid', { status: 422 }), 'rejected'],
    ['client rejection with business code', new ApiMessageError('invalid', { status: 422, code: 12 }), 'rejected'],
    ['success envelope failure', new ApiMessageError('failed', { status: 200, code: 12 }), 'uncertain'],
    ['server failure', new ApiMessageError('failed', { status: 500 }), 'uncertain'],
    ['status zero', new ApiMessageError('offline', { status: 0 }), 'uncertain'],
    ['missing source status', new ApiMessageError('offline'), 'uncertain']
  ] as const)('classifies %s as %s', (_label, error, expected) => {
    expect(apiMessageWriteOutcome(error)).toBe(expected);
  });
});
