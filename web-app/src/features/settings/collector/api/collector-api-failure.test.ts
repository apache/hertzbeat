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

import { classifyCollectorApiFailure } from './collector-api-failure';

describe('Collector API failure classification', () => {
  it.each([401, 403])('maps HTTP %s to permission evidence', status => {
    expect(classifyCollectorApiFailure(new ApiMessageError('redacted', { status }))).toBe('permission');
  });

  it('keeps unavailable and validation evidence distinct', () => {
    expect(classifyCollectorApiFailure(new ApiMessageError('redacted', { status: 503 }))).toBe('unavailable');
    expect(classifyCollectorApiFailure(new ApiMessageError('redacted', { status: 422 }))).toBe('validation');
  });
});
