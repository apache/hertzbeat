/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ParamMap } from '@angular/router';

import {
  createSignalTimePreset,
  detectSignalTimePreset,
  moveSignalTimeRangeToNow,
  readSignalTimeRange,
  shiftSignalTimeRange,
  toSignalTimeContext
} from './signal-query-context';

describe('signal query context', () => {
  it('reads and writes the shared start and end contract', () => {
    const values = new Map([
      ['start', '1000'],
      ['end', '2000']
    ]);
    const params = { get: (key: string) => values.get(key) || null } as ParamMap;

    const range = readSignalTimeRange(params);

    expect(range.map(value => value.getTime())).toEqual([1_000, 2_000]);
    expect(toSignalTimeContext(range)).toEqual({ start: 1_000, end: 2_000 });
  });

  it('moves a fixed range to now without changing its duration', () => {
    const range = moveSignalTimeRangeToNow([new Date(1_000), new Date(61_000)], 121_000);

    expect(range.map(value => value.getTime())).toEqual([61_000, 121_000]);
  });

  it('creates and detects a relative time preset', () => {
    const range = createSignalTimePreset('1h', 7_200_000);

    expect(range.map(value => value.getTime())).toEqual([3_600_000, 7_200_000]);
    expect(detectSignalTimePreset(range, 7_200_000)).toBe('1h');
    expect(detectSignalTimePreset(range, 7_300_000)).toBe('custom');
  });

  it('moves a time window backward and clamps forward movement to now', () => {
    const range = [new Date(60_000), new Date(120_000)];

    expect(shiftSignalTimeRange(range, -1, 300_000).map(value => value.getTime())).toEqual([0, 60_000]);
    expect(shiftSignalTimeRange(range, 1, 150_000).map(value => value.getTime())).toEqual([90_000, 150_000]);
  });
});
