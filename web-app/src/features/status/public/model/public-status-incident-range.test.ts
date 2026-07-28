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

import { createPublicStatusIncidentRange } from './public-status-incident-range';

describe('PublicStatusIncidentRange', () => {
  const now = new Date(2026, 6, 29, 12);

  it('uses a local-year start and an open upper bound for the current year', () => {
    expect(createPublicStatusIncidentRange(2026, now)).toEqual({
      year: 2026,
      startTime: new Date(2026, 0, 1).getTime(),
      endTime: null
    });
  });

  it('uses exact inclusive local-year bounds for a historical year', () => {
    expect(createPublicStatusIncidentRange(2025, now)).toEqual({
      year: 2025,
      startTime: new Date(2025, 0, 1).getTime(),
      endTime: new Date(2026, 0, 1).getTime() - 1
    });
  });

  it('rejects pre-epoch, future, fractional and unsafe years', () => {
    expect(() => createPublicStatusIncidentRange(1969, now)).toThrow(RangeError);
    expect(() => createPublicStatusIncidentRange(2027, now)).toThrow(RangeError);
    expect(() => createPublicStatusIncidentRange(2025.5, now)).toThrow(RangeError);
    expect(() => createPublicStatusIncidentRange(Number.MAX_SAFE_INTEGER + 1, now)).toThrow(RangeError);
  });
});
