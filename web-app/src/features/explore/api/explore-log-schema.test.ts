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

import { ExploreSignalContractError } from '../model/explore-signal-contract';
import { parseLogTrend } from './explore-log-schema';

describe('Log trend wire contract', () => {
  it.each([60_000, 300_000, 900_000, 1_800_000, 3_600_000, 21_600_000, 86_400_000])(
    'accepts the supported %i ms interval',
    intervalMs => {
      expect(parseLogTrend({ start: 0, end: intervalMs - 1, intervalMs, buckets: [] }).intervalMs).toBe(intervalMs);
    }
  );

  it('accepts ordered epoch-aligned buckets without filling missing intervals', () => {
    expect(
      parseLogTrend({
        start: 1_754_467_200_000,
        end: 1_754_468_100_000,
        intervalMs: 60_000,
        buckets: [
          { start: 1_754_467_200_000, count: 4 },
          { start: 1_754_467_320_000, count: 2 }
        ]
      }).buckets
    ).toHaveLength(2);
  });

  it('accepts an honest empty bucket array', () => {
    expect(
      parseLogTrend({
        start: 1_754_467_200_000,
        end: 1_754_468_100_000,
        intervalMs: 60_000,
        buckets: []
      }).buckets
    ).toEqual([]);
  });

  it.each([
    ['legacy shape', { hourlyStats: {} }],
    ['unsupported interval', { start: 0, end: 119_999, intervalMs: 120_000, buckets: [] }],
    [
      'bucket before the first window bucket',
      { start: 120_001, end: 179_999, intervalMs: 60_000, buckets: [{ start: 60_000, count: 1 }] }
    ],
    [
      'bucket after the last window bucket',
      { start: 120_001, end: 179_999, intervalMs: 60_000, buckets: [{ start: 180_000, count: 1 }] }
    ],
    [
      'negative bucket count',
      { start: 120_000, end: 179_999, intervalMs: 60_000, buckets: [{ start: 120_000, count: -1 }] }
    ],
    [
      'duplicate bucket',
      {
        start: 120_000,
        end: 239_999,
        intervalMs: 60_000,
        buckets: [
          { start: 120_000, count: 1 },
          { start: 120_000, count: 2 }
        ]
      }
    ],
    [
      'unaligned bucket',
      {
        start: 1_754_467_200_000,
        end: 1_754_468_100_000,
        intervalMs: 60_000,
        buckets: [{ start: 1_754_467_200_001, count: 1 }]
      }
    ],
    [
      'more than sixty buckets',
      {
        start: 1_754_467_200_000,
        end: 1_754_470_800_000,
        intervalMs: 60_000,
        buckets: Array.from({ length: 61 }, (_, index) => ({
          start: 1_754_467_200_000 + index * 60_000,
          count: 1
        }))
      }
    ]
  ])('rejects %s', (_name, payload) => {
    expect(() => parseLogTrend(payload)).toThrow(ExploreSignalContractError);
  });
});
