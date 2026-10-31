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
import { parseRepeatedErrors } from './dashboard-repeated-errors-api';
const scope = { workspaceId: 'a', start: 1000, end: 901000, serviceName: '', environment: '' };
describe('repeated error response evidence', () => {
  it('requires actual exact-window coverage for a zero result', () => {
    expect(
      parseRepeatedErrors({ state: 'ready', scope, coverage: 'window', matchingEvents: 0, groups: [] }, scope)
        .matchingEvents
    ).toBe(0);
    expect(() =>
      parseRepeatedErrors({ state: 'ready', scope, coverage: null, matchingEvents: 0, groups: [] }, scope)
    ).toThrow();
  });
  it('rejects other workspace/window and partial counts in unavailable states', () => {
    const raw = { state: 'over_budget', scope, coverage: null, matchingEvents: null, groups: [] };
    expect(parseRepeatedErrors(raw, scope).state).toBe('over_budget');
    expect(() => parseRepeatedErrors({ ...raw, matchingEvents: 12 }, scope)).toThrow();
    expect(() => parseRepeatedErrors({ ...raw, scope: { ...scope, workspaceId: 'b' } }, scope)).toThrow();
    expect(() => parseRepeatedErrors({ ...raw, scope: { ...scope, end: 900000 } }, scope)).toThrow();
  });
});
