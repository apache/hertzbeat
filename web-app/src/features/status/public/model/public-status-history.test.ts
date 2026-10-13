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

import type { PublicStatusHistory } from './public-status-contract';
import {
  publicStatusAvailability,
  publicStatusHistoryBounds,
  publicStatusHistoryStateCounts,
  publicStatusHistoryTimeline,
  publicStatusHistoryTimelineBounds,
  recentPublicStatusHistory
} from './public-status-history';

const millisecondsPerDay = 24 * 60 * 60 * 1000;

describe('public status history presentation', () => {
  it('uses duration evidence for a weighted availability rate', () => {
    expect(
      publicStatusAvailability([
        history(2, { normal: 90, abnormal: 10, unknowing: 0, uptime: 0.9 }),
        history(1, { normal: 10, abnormal: 0, unknowing: 0, uptime: 1 })
      ])
    ).toBeCloseTo(100 / 110);
  });

  it('withholds availability when any period is unknown or incomplete', () => {
    expect(publicStatusAvailability([history(1, { state: 'unknown', uptime: 1 })])).toBeUndefined();
    expect(publicStatusAvailability([history(1, { uptime: 1 }), history(2)])).toBeUndefined();
    expect(publicStatusAvailability([history(1, { normal: 10, abnormal: 0, unknowing: 1 })])).toBeUndefined();
  });

  it('keeps the newest evidence while presenting the status strip chronologically', () => {
    const selection = recentPublicStatusHistory([history(1), history(3), history(2)], 2);

    expect(selection.newestFirst?.map(entry => entry.timestamp)).toEqual([3, 2]);
    expect(selection.chronological?.map(entry => entry.timestamp)).toEqual([2, 3]);
  });

  it('fills a 90-day publication timeline with explicit unknown days before the real evidence', () => {
    const timeline = publicStatusHistoryTimeline([history(3 * millisecondsPerDay), history(2 * millisecondsPerDay)], 4);

    expect(timeline?.map(entry => entry.timestamp)).toEqual([
      0,
      millisecondsPerDay,
      2 * millisecondsPerDay,
      3 * millisecondsPerDay
    ]);
    expect(timeline?.map(entry => entry.state)).toEqual(['unknown', 'unknown', 'healthy', 'healthy']);
  });

  it('uses the padded publication timeline when calculating the visible date range', () => {
    expect(
      publicStatusHistoryTimelineBounds(
        [{ id: 1, name: 'A', state: 'healthy', history: [history(3 * millisecondsPerDay)] }],
        4
      )
    ).toEqual({ earliest: 0, latest: 3 * millisecondsPerDay });
  });

  it('aligns a stale component to the shared publication window with unknown trailing days', () => {
    const timeline = publicStatusHistoryTimeline([history(3 * millisecondsPerDay)], 4, 5 * millisecondsPerDay);

    expect(timeline?.map(entry => entry.timestamp)).toEqual([
      2 * millisecondsPerDay,
      3 * millisecondsPerDay,
      4 * millisecondsPerDay,
      5 * millisecondsPerDay
    ]);
    expect(timeline?.map(entry => entry.state)).toEqual(['unknown', 'healthy', 'unknown', 'unknown']);
  });

  it('keeps an internal missing day unknown instead of compressing the real evidence together', () => {
    const timeline = publicStatusHistoryTimeline([history(3 * millisecondsPerDay), history(millisecondsPerDay)], 4);

    expect(timeline?.map(entry => entry.state)).toEqual(['unknown', 'healthy', 'unknown', 'healthy']);
  });

  it('finds the published history range without depending on component order', () => {
    expect(
      publicStatusHistoryBounds([
        { id: 1, name: 'A', state: 'healthy', history: [history(30), history(10)] },
        { id: 2, name: 'B', state: 'healthy', history: [history(20)] }
      ])
    ).toEqual({ earliest: 10, latest: 30 });
  });

  it('summarizes every visible history state for assistive output', () => {
    expect(
      publicStatusHistoryStateCounts([
        history(1),
        history(2, { state: 'incident' }),
        history(3, { state: 'unknown' }),
        history(4)
      ])
    ).toEqual({ healthy: 2, incident: 1, unknown: 1 });
  });
});

function history(timestamp: number, overrides: Partial<PublicStatusHistory> = {}): PublicStatusHistory {
  return { componentId: 1, state: 'healthy', timestamp, ...overrides };
}
