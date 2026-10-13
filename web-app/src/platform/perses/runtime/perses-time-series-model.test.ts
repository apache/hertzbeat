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

import { describe, expect, it, vi } from 'vitest';

import { resolvePersesTimeWindow, toPersesTimeSeriesData, type HertzBeatTimeSeries } from './perses-time-series-model';

const metricSeries: HertzBeatTimeSeries[] = [
  {
    key: 'http.server.duration-0',
    name: 'http.server.duration',
    labels: { __name__: 'http.server.duration', service_name: 'checkout', method: 'POST' },
    points: [
      { timestamp: 1_750_000_000_000, value: 100 },
      { timestamp: 1_750_000_060_000, value: 125 }
    ]
  }
];

describe('Perses time-series adapter', () => {
  it('converts authorized HertzBeat frames without losing labels or point values', () => {
    const data = toPersesTimeSeriesData(metricSeries, { from: 1_749_999_900_000, to: 1_750_000_100_000 });

    expect(data.timeRange).toEqual({
      start: new Date(1_749_999_900_000),
      end: new Date(1_750_000_100_000)
    });
    expect(data.stepMs).toBe(60_000);
    expect(data.series).toEqual([
      {
        name: 'http.server.duration-0',
        formattedName: 'http.server.duration{service_name="checkout", method="POST"}',
        labels: metricSeries[0]?.labels,
        values: [
          [1_750_000_000_000, 100],
          [1_750_000_060_000, 125]
        ]
      }
    ]);
  });

  it('uses an explicit presentation alias without changing native labels or series identity', () => {
    const source = { ...metricSeries[0]!, displayName: 'method="POST"' };
    const result = toPersesTimeSeriesData([source]);
    expect(result.series[0]?.formattedName).toBe('method="POST"');
    expect(result.series[0]?.labels).toEqual(source.labels);
    expect(result.series[0]?.name).toBe(source.key);
  });

  it('uses the canonical exact window and derives an honest bounded fallback only when absent', () => {
    expect(resolvePersesTimeWindow(metricSeries, { from: 10, to: 20 })).toEqual({ from: 10, to: 20 });
    expect(resolvePersesTimeWindow(metricSeries)).toEqual({ from: 1_750_000_000_000, to: 1_750_000_060_000 });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-28T00:00:00Z'));
    expect(resolvePersesTimeWindow([])).toEqual({
      from: new Date('2026-08-27T23:30:00Z').valueOf(),
      to: new Date('2026-08-28T00:00:00Z').valueOf()
    });
    vi.useRealTimers();
  });

  it('scans bounded large series without spread argument limits', () => {
    const points = Array.from({ length: 200_000 }, (_, index) => ({
      timestamp: 1_750_000_000_000 + index * 1_000,
      value: index
    }));
    const largeSeries: HertzBeatTimeSeries[] = [{ key: 'large', name: 'large', labels: {}, points }];

    expect(resolvePersesTimeWindow(largeSeries)).toEqual({
      from: 1_750_000_000_000,
      to: 1_750_199_999_000
    });

    const requestedWindow = { from: 1_749_999_000_000, to: 1_750_201_000_000 };
    const data = toPersesTimeSeriesData(largeSeries, requestedWindow);
    expect(data.timeRange).toEqual({
      start: new Date(requestedWindow.from),
      end: new Date(requestedWindow.to)
    });
    expect(data.stepMs).toBe(1_000);
    expect(data.series[0]?.values).toHaveLength(200_000);
  });
});
