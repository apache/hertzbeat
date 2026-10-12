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

import { buildMetricSampleSnapshot, formatMetricSampleValue, summarizeMetricSeries } from './metric-sample-model';

describe('metric sample snapshot', () => {
  it('summarizes all returned values per series and chooses latest by time, without averaging percentiles', () => {
    const series = {
      key: 'latency',
      name: 'p95',
      labels: {},
      unit: 'ms',
      points: [
        [3000, 20],
        [1000, 80],
        [2000, 0]
      ]
    };
    expect(summarizeMetricSeries(series)).toEqual({ count: 3, min: 0, max: 80, latest: 20, timestamp: 3000 });
    expect(series.points[0]).toEqual([3000, 20]);
    expect(summarizeMetricSeries({ ...series, points: [] })).toEqual({ count: 0 });
  });

  it('formats long decimals to six significant digits and uses scientific notation for extreme values', () => {
    expect(formatMetricSampleValue(0.003974855285274746)).toBe('0.00397486');
    expect(formatMetricSampleValue(-0.003974855285274746)).toBe('-0.00397486');
    expect(formatMetricSampleValue(0)).toBe('0');
    expect(formatMetricSampleValue(1.23456789e-12)).toBe('1.23457E-12');
    expect(formatMetricSampleValue(1.23456789e18)).toBe('1.23457E18');
  });
  it('bounds globally newest samples across series without mutating their evidence', () => {
    const series = [
      {
        key: 'new',
        name: 'cpu',
        labels: { host: 'a' },
        points: [
          [300, 0],
          [100, 1]
        ]
      },
      {
        key: 'old',
        name: 'cpu',
        labels: { host: 'b' },
        points: [
          [200, 2],
          [50, 3]
        ]
      }
    ];
    const snapshot = buildMetricSampleSnapshot(series, 3);
    expect(snapshot.received).toBe(4);
    expect(snapshot.truncated).toBe(true);
    expect(snapshot.rows.map(row => [row.timestamp, row.seriesNumber, row.value])).toEqual([
      [300, 1, 0],
      [200, 2, 2],
      [100, 1, 1]
    ]);
    expect(series[0]?.points).toEqual([
      [300, 0],
      [100, 1]
    ]);
  });

  it('keeps all exactly bounded evidence with deterministic timestamp ties', () => {
    const series = ['a', 'b'].map(key => ({ key, name: key, labels: {}, points: [[100, 1]] }));
    const snapshot = buildMetricSampleSnapshot(series, 2);
    expect(snapshot.truncated).toBe(false);
    expect(snapshot.rows.map(row => row.seriesKey)).toEqual(['a', 'b']);
  });

  it('counts every received point while rendering at most one hundred samples', () => {
    const points = Array.from({ length: 101 }, (_, index) => [index + 1, index]);
    const snapshot = buildMetricSampleSnapshot([{ key: 'all', name: 'cpu', labels: {}, points }]);
    expect(snapshot.received).toBe(101);
    expect(snapshot.rows).toHaveLength(100);
    expect(snapshot.truncated).toBe(true);
    expect(snapshot.rows[0]?.timestamp).toBe(101);
    expect(snapshot.rows.at(-1)?.timestamp).toBe(2);
  });
});
