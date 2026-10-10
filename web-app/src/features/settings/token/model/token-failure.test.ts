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

import { TokenRequestFailure, classifyTokenCollectionFailure, isTokenWriteRejection } from './token-failure';

describe('Token domain failure evidence', () => {
  it('does not infer list state or write safety from arbitrary transport-shaped objects', () => {
    const arbitrary = { statusCode: 503, httpStatus: 400, kind: 'http', token: 'private-token' };

    expect(classifyTokenCollectionFailure(arbitrary)).toBe('error');
    expect(isTokenWriteRejection(arbitrary)).toBe(false);
  });

  it('trusts only typed domain evidence', () => {
    const unavailable = new TokenRequestFailure('unavailable', 'uncertain');
    const rejected = new TokenRequestFailure('invalid', 'rejected');

    expect(classifyTokenCollectionFailure(unavailable)).toBe('unavailable');
    expect(isTokenWriteRejection(rejected)).toBe(true);
    expect(isTokenWriteRejection(unavailable)).toBe(false);
  });
});
