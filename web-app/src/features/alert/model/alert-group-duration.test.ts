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

import { durationFromSeconds, durationToSeconds, preferredDurationUnit } from './alert-group-duration';

describe('Alert Group duration display contract', () => {
  it.each([
    [30, 'seconds'],
    [300, 'minutes'],
    [14_400, 'hours'],
    [61, 'seconds'],
    [0, 'seconds']
  ] as const)('chooses a lossless default unit for %s seconds', (seconds, unit) => {
    expect(preferredDurationUnit(seconds)).toBe(unit);
  });

  it('round-trips the default values without changing the seconds API contract', () => {
    expect(durationFromSeconds(30, 'seconds')).toBe(30);
    expect(durationFromSeconds(300, 'minutes')).toBe(5);
    expect(durationFromSeconds(14_400, 'hours')).toBe(4);
    expect(durationToSeconds(7, 'minutes')).toBe(420);
  });
});
