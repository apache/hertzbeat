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

import { publicStatusQueryKeys } from './public-status-query-keys';

describe('Public Status Query Keys', () => {
  const range = { year: 2026, startTime: 100, endTime: null };

  it('preserves the established cache identity for each fixed public resource', () => {
    expect(publicStatusQueryKeys.org()).toEqual(['public-status-org']);
    expect(publicStatusQueryKeys.components()).toEqual(['public-status-components']);
    expect(publicStatusQueryKeys.incidents(range)).toEqual(['public-status-incidents', 2026, 100, null]);
  });

  it('keeps distinct resources isolated', () => {
    expect(publicStatusQueryKeys.org()).not.toEqual(publicStatusQueryKeys.components());
    expect(publicStatusQueryKeys.components()).not.toEqual(publicStatusQueryKeys.incidents(range));
  });

  it('isolates incident years and their canonical range evidence', () => {
    expect(publicStatusQueryKeys.incidents(range)).not.toEqual(
      publicStatusQueryKeys.incidents({ year: 2025, startTime: 50, endTime: 99 })
    );
  });
});
