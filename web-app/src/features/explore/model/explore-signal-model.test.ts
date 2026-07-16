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

import type { MetricConsole } from '../api/explore-signal-contract';
import { logBody, logServiceName, logTimestampMs, metricPath, metricPoints, metricResultState, metricSeries, traceDurationMs, traceHealthState, traceSpanLayout } from './explore-signal-model';

describe('explore API contracts', () => {
  it('normalizes datasource frames returned by the metrics console', () => {
    expect(metricSeries({
      results: {
        status: 200,
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

  it('classifies metric results from explicit backend evidence', () => {
    expect(metricResultState({ errorMessage: 'transport failed', results: { status: 200, frames: [] } })).toEqual({
      kind: 'error',
      message: 'transport failed'
    });
    expect(metricResultState({ results: { status: 503, msg: 'storage offline', frames: [] } })).toEqual({
      kind: 'error',
      message: 'storage offline'
    });
    expect(metricResultState({ results: { status: 500, frames: [] } })).toEqual({ kind: 'error' });
    expect(metricResultState({})).toEqual({ kind: 'unavailable' });
    expect(metricResultState({ results: { frames: [] } })).toEqual({ kind: 'unavailable' });
    expect(metricResultState({ results: { status: 200 } })).toEqual({ kind: 'unavailable' });
    expect(metricResultState({ results: { status: 200, frames: [] } })).toEqual({ kind: 'empty' });
    expect(metricResultState({ results: { status: 200, frames: [{ data: [] }, {}] } })).toEqual({ kind: 'unavailable' });
    expect(metricResultState({ results: { status: 200, frames: [null, 42] } } as unknown as MetricConsole)).toEqual({ kind: 'unavailable' });
    expect(metricResultState({ results: { status: 200, frames: [{ data: [] }] } })).toEqual({ kind: 'empty' });
    expect(metricResultState({ results: {
      status: 200,
      frames: [
        { data: [[1000, 'not-a-number'], [1001, null], [1002, false], [1003, '  ']] },
        { data: [['not-a-time', 1], [null, 2], [false, 3], ['', 4]] }
      ]
    } })).toEqual({ kind: 'empty' });

    const ready = metricResultState({ results: {
      status: 200,
      frames: [{ schema: { fields: [{ name: 'value', type: 'number' }] }, data: [[1000, 0]] }]
    } });
    expect(ready).toMatchObject({ kind: 'ready' });
    if (ready.kind === 'ready') expect(metricPoints(ready.series[0]!)).toEqual([{ timestamp: 1000, value: 0 }]);
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

  it('classifies trace health only from explicit evidence', () => {
    expect(traceHealthState({})).toBe('unknown');
    expect(traceHealthState({ status: 'OK' })).toBe('ok');
    expect(traceHealthState({ status: 'ERROR' })).toBe('error');
    expect(traceHealthState({ errorSpanCount: 1 })).toBe('error');
    expect(traceHealthState({ status: 'OK', errorSpanCount: 1 })).toBe('error');
    expect(traceHealthState({ status: 'UNSET', errorSpanCount: 0 })).toBe('unknown');
  });

  it('creates a bounded plot from numeric and numeric-string samples', () => {
    const points = metricPoints({
      key: 'one',
      name: 'latency',
      labels: {},
      points: [
        [1000, null], [1001, false], [1002, ''], [1003, '   '],
        [null, 1], [false, 2], ['', 3], ['   ', 4],
        [2000, 0], ['2001', '0'], [' 2002 ', '12.5'], [3000, 'invalid']
      ]
    });
    expect(points).toEqual([
      { timestamp: 2000, value: 0 },
      { timestamp: 2001, value: 0 },
      { timestamp: 2002, value: 12.5 }
    ]);
    expect(metricPath(points, 100, 40)).toBe('M0.00,40.00 L50.00,40.00 L100.00,0.00');
  });

  it('reads service context and structured bodies from OTLP logs', () => {
    const row = { resource: { 'service.name': 'checkout' }, body: { event: 'paid' } };
    expect(logServiceName(row)).toBe('checkout');
    expect(logBody(row)).toBe('{"event":"paid"}');
    expect(logTimestampMs({ timeUnixNano: 1_750_000_000_000_000_000 })).toBe(1_750_000_000_000);
  });
});
