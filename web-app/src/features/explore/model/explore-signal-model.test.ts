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

import { logBody, logServiceName, logTimestampMs, metricPath, metricPoints, metricSeries, traceDurationMs, traceSpanLayout } from './explore-signal-model';

describe('explore API contracts', () => {
  it('normalizes datasource frames returned by the metrics console', () => {
    expect(metricSeries({
      results: {
        frames: [{
          schema: {
            fields: [{ name: '__ts__', type: 'time' }, { name: '__value__', type: 'number', unit: 'ms' }],
            labels: { __name__: 'http_server_duration', service_name: 'checkout' }
          },
          data: [[1000, '12']]
        }]
      }
    })).toEqual([{
      key: 'http_server_duration-0',
      name: 'http_server_duration',
      unit: 'ms',
      labels: { __name__: 'http_server_duration', service_name: 'checkout' },
      points: [[1000, '12']]
    }]);
  });

  it('uses the established trace nanosecond duration contract', () => {
    expect(traceDurationMs({ durationNanos: 3_000_000_000 })).toBe(3000);
    expect(traceSpanLayout({ startTime: 1000, durationNanos: 1_000_000_000, spans: [
      { spanId: 'root', startTime: 1000, durationNanos: 1_000_000_000 },
      { spanId: 'child', parentSpanId: 'root', startTime: 1250, durationNanos: 500_000_000 }
    ] })).toMatchObject([
      { spanId: 'root', depth: 0, offsetPercent: 0, widthPercent: 100 },
      { spanId: 'child', depth: 1, offsetPercent: 25, widthPercent: 50 }
    ]);
  });

  it('creates a bounded plot from numeric and numeric-string samples', () => {
    const points = metricPoints({ key: 'one', name: 'latency', labels: {}, points: [[1000, '12'], [2000, 22], [3000, 'invalid']] });
    expect(points).toEqual([{ timestamp: 1000, value: 12 }, { timestamp: 2000, value: 22 }]);
    expect(metricPath(points, 100, 40)).toBe('M0.00,40.00 L100.00,0.00');
  });

  it('reads service context and structured bodies from OTLP logs', () => {
    const row = { resource: { 'service.name': 'checkout' }, body: { event: 'paid' } };
    expect(logServiceName(row)).toBe('checkout');
    expect(logBody(row)).toBe('{"event":"paid"}');
    expect(logTimestampMs({ timeUnixNano: 1_750_000_000_000_000_000 })).toBe(1_750_000_000_000);
  });
});
