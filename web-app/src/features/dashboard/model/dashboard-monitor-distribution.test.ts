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
import { monitorDistributionSegments } from './dashboard-monitor-distribution';

describe('Start monitor status distribution geometry', () => {
  it('uses the backend total as denominator and retains actual status identity', () => {
    const result = monitorDistributionSegments({ total: 6, counts: [2, 2, 2] });
    expect(result.segments.map(s => s.status)).toEqual(['available', 'unavailable', 'paused']);
    expect(result.segments[0]!.share).toBeCloseTo(100 / 3);
    expect(result.segments[1]!.offset).toBeCloseTo(100 / 3);
    expect(result.segments[2]!.offset).toBeCloseTo(200 / 3);
    expect(result.remainder).toBe(0);
  });
  it('does not reallocate omitted status counts into the three visible categories', () => {
    const result = monitorDistributionSegments({ total: 10, counts: [1, 5, 2] });
    expect(result.segments.map(s => s.share)).toEqual([50, 20, 10]);
    expect(result.remainder).toBe(2);
  });
  it('shows a neutral empty ring for zero and distinguishes unreadable data', () => {
    expect(monitorDistributionSegments({ total: 0, counts: [0, 0, 0] })).toEqual({ segments: [], remainder: 0 });
    expect(monitorDistributionSegments(null)).toEqual({ segments: [], remainder: undefined });
    expect(monitorDistributionSegments({ total: 4, counts: [0, 0, 0] })).toEqual({ segments: [], remainder: 4 });
  });
});
