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

import { createRefineHttpError } from '@/shared/refine/refine-http-error';

import { isDefiniteSystemConfigWriteRejection } from './system-config-write-rejection';

describe('System Config write rejection', () => {
  it.each([
    ['direct client rejection', createRefineHttpError('private', 422, undefined, 'http', 422), true],
    ['request timeout', createRefineHttpError('private', 408, undefined, 'http', 408), false],
    [
      'cause-bearing client response',
      Object.assign(createRefineHttpError('private', 422, undefined, 'http', 422), {
        cause: new Error('private-cause')
      }),
      false
    ],
    ['network response', createRefineHttpError('private', 400, undefined, 'network', 422), false],
    ['business envelope', createRefineHttpError('private', 400, 20, 'envelope', 200), false],
    ['contract response', createRefineHttpError('private', 400, 'INVALID', 'contract', 422), false],
    ['display-only client status', createRefineHttpError('private', 422, undefined, 'http'), false],
    ['missing source status', createRefineHttpError('private', 500, undefined, 'http'), false],
    ['source status zero', createRefineHttpError('private', 422, undefined, 'http', 0), false],
    ['server response', createRefineHttpError('private', 503, undefined, 'http', 503), false],
    ['untyped display status', { kind: 'http', statusCode: 422 }, false]
  ] as const)('classifies %s from source evidence', (_label, reason, expected) => {
    expect(isDefiniteSystemConfigWriteRejection(reason)).toBe(expected);
  });
});
