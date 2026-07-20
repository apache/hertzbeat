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

import { isDefiniteObjectStoreWriteRejection } from './object-store-write-rejection';

describe('Object Store write rejection', () => {
  it('accepts only explicit backend business and HTTP 4xx evidence', () => {
    expect(isDefiniteObjectStoreWriteRejection(createRefineHttpError('rejected', 400, 20, 'envelope', 200))).toBe(true);
    expect(isDefiniteObjectStoreWriteRejection(createRefineHttpError('rejected', 422, undefined, 'http', 422))).toBe(
      true
    );
    expect(
      isDefiniteObjectStoreWriteRejection(createRefineHttpError('malformed', 400, 'INVALID', 'contract', 400))
    ).toBe(false);
    expect(isDefiniteObjectStoreWriteRejection(createRefineHttpError('unavailable', 503, undefined, 'http', 503))).toBe(
      false
    );
    expect(isDefiniteObjectStoreWriteRejection({ kind: 'envelope', statusCode: 400 })).toBe(false);
  });
});
