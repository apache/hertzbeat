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

import type { MetricConsole } from './explore-signal-contract';
import {
  logBody,
  logServiceName,
  logTimestampMs,
  metricPath,
  metricPoints,
  metricResultState,
  metricSeries,
  traceDurationMs,
  traceHealthState,
  traceSpanLayout
} from './explore-signal-model';

describe('explore API contracts', () => {
  it('normalizes datasource frames returned by the metrics console', () => {
    expect(
      metricSeries(
        metricConsole({
          status: 200,
          frames: [
            {
              schema: {
                fields: [
                  { name: '__ts__', type: 'time', unit: null },
                  { name: '__value__', type: 'number', unit: 'ms' }
                ],
                labels: { __name__: 'http_server_duration', service_name: 'checkout' },
                meta: null
              },
              data: [[1000, '12']]
            }
          ]
        })
      )
    ).toEqual([
      {
        key: 'http_server_duration-0',
        name: 'http_server_duration',
        unit: 'ms',
        labels: { __name__: 'http_server_duration', service_name: 'checkout' },
        points: [[1000, '12']]
      }
    ]);
  });

  it('classifies metric results from explicit backend evidence', () => {
    expect(metricResultState(metricConsole(null, 'Choose a metric or service context.', 'no_context'))).toEqual({
      kind: 'missing_context'
    });
    expect(metricResultState(metricConsole(null, null, 'unsupported_query'))).toEqual({
      kind: 'unsupported_query'
    });
    expect(metricResultState(metricConsole(null, null, 'load_failed'))).toEqual({
      kind: 'storage_unavailable'
    });
    expect(metricResultState(metricConsole({ status: 200, frames: [] }, 'transport failed'))).toEqual({
      kind: 'error',
      message: 'transport failed'
    });
    expect(metricResultState(metricConsole({ status: 503, msg: 'storage offline', frames: [] }))).toEqual({
      kind: 'error',
      message: 'storage offline'
    });
    expect(metricResultState(metricConsole({ status: 500, frames: [] }))).toEqual({ kind: 'error' });
    expect(metricResultState(metricConsole(null))).toEqual({ kind: 'storage_unavailable' });
    expect(metricResultState(metricConsole({ status: null, frames: [] }))).toEqual({ kind: 'storage_unavailable' });
    expect(metricResultState(metricConsole({ status: 200, frames: null }))).toEqual({ kind: 'storage_unavailable' });
    expect(metricResultState(metricConsole({ status: 200, frames: [] }))).toEqual({ kind: 'empty' });
    expect(metricResultState(metricConsole({ status: 200, frames: [{ schema: null, data: null }] }))).toEqual({
      kind: 'storage_unavailable'
    });
    expect(metricResultState(metricConsole({ status: 200, frames: [{ schema: null, data: [] }] }))).toEqual({
      kind: 'empty'
    });
    expect(
      metricResultState(
        metricConsole({
          status: 200,
          frames: [
            {
              schema: null,
              data: [
                [1000, 'not-a-number'],
                [1001, null],
                [1002, false],
                [1003, '  ']
              ]
            },
            {
              schema: null,
              data: [
                ['not-a-time', 1],
                [null, 2],
                [false, 3],
                ['', 4]
              ]
            }
          ]
        })
      )
    ).toEqual({ kind: 'empty' });

    const ready = metricResultState(
      metricConsole({
        status: 200,
        frames: [
          {
            schema: { fields: [{ name: 'value', type: 'number', unit: null }], labels: null, meta: null },
            data: [[1000, 0]]
          }
        ]
      })
    );
    expect(ready).toMatchObject({ kind: 'ready' });
    if (ready.kind === 'ready') expect(metricPoints(ready.series[0]!)).toEqual([{ timestamp: 1000, value: 0 }]);
  });

  it('uses the established trace nanosecond duration contract', () => {
    expect(traceDurationMs({ durationNanos: 3_000_000_000 })).toBe(3000);
    expect(
      traceSpanLayout(
        traceDetail({
          startTime: 1000,
          durationNanos: 1_000_000_000,
          spans: [
            traceSpan({ spanId: 'root', startTime: 1000, durationNanos: 1_000_000_000 }),
            traceSpan({ spanId: 'child', parentSpanId: 'root', startTime: 1250, durationNanos: 500_000_000 })
          ]
        })
      )
    ).toMatchObject([
      { spanId: 'root', depth: 0, offsetPercent: 0, widthPercent: 100 },
      { spanId: 'child', depth: 1, offsetPercent: 25, widthPercent: 50 }
    ]);
  });

  it('classifies trace health only from explicit evidence', () => {
    expect(traceHealthState({ status: null, errorSpanCount: 0 })).toBe('unknown');
    expect(traceHealthState({ status: 'OK', errorSpanCount: 0 })).toBe('ok');
    expect(traceHealthState({ status: 'ERROR', errorSpanCount: 0 })).toBe('error');
    expect(traceHealthState({ status: null, errorSpanCount: 1 })).toBe('error');
    expect(traceHealthState({ status: 'OK', errorSpanCount: 1 })).toBe('error');
    expect(traceHealthState({ status: 'UNSET', errorSpanCount: 0 })).toBe('unknown');
  });

  it('creates a bounded plot from numeric and numeric-string samples', () => {
    const points = metricPoints({
      key: 'one',
      name: 'latency',
      labels: {},
      points: [
        [1000, null],
        [1001, false],
        [1002, ''],
        [1003, '   '],
        [null, 1],
        [false, 2],
        ['', 3],
        ['   ', 4],
        [2000, 0],
        ['2001', '0'],
        [' 2002 ', '12.5'],
        [3000, 'invalid']
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
    const row = logRow({ resource: { 'service.name': 'checkout' }, body: { event: 'paid' } });
    expect(logServiceName(row)).toBe('checkout');
    expect(logBody(row)).toBe('{"event":"paid"}');
    expect(logTimestampMs(logRow({ timeUnixNano: 1_750_000_000_000_000_000 }))).toBe(1_750_000_000_000);
  });
});

function metricConsole(
  results: {
    status: number | null;
    frames: NonNullable<MetricConsole['results']>['frames'];
    msg?: string | null;
  } | null,
  errorMessage: string | null = null,
  emptyStateReason: string | null = null
): MetricConsole {
  return {
    context: null,
    query: null,
    datasource: null,
    queryMode: null,
    results: results && { refId: null, msg: null, ...results },
    stats: null,
    emptyStateReason,
    errorMessage
  };
}

function traceDetail(
  override: Partial<import('./explore-signal-contract').TraceDetail> = {}
): import('./explore-signal-contract').TraceDetail {
  return {
    traceId: 'trace-1',
    rootSpanId: null,
    serviceName: null,
    serviceNamespace: null,
    rootSpanName: null,
    durationNanos: null,
    status: null,
    startTime: null,
    errorSpanCount: 0,
    resourceAttributes: null,
    spans: null,
    ...override
  };
}

function traceSpan(
  override: Partial<import('./explore-signal-contract').TraceSpan> = {}
): import('./explore-signal-contract').TraceSpan {
  return {
    traceId: 'trace-1',
    spanId: 'span-1',
    parentSpanId: null,
    spanName: null,
    serviceName: null,
    status: null,
    spanKind: null,
    statusMessage: null,
    traceState: null,
    scopeName: null,
    scopeVersion: null,
    durationNanos: null,
    startTime: null,
    highlighted: false,
    resourceAttributes: null,
    spanAttributes: null,
    events: null,
    links: null,
    codeNavigationHint: null,
    ...override
  };
}

function logRow(
  override: Partial<import('./explore-signal-contract').LogRow> = {}
): import('./explore-signal-contract').LogRow {
  return {
    timeUnixNano: null,
    observedTimeUnixNano: null,
    severityNumber: null,
    severityText: null,
    body: null,
    attributes: null,
    droppedAttributesCount: null,
    traceId: null,
    spanId: null,
    traceFlags: null,
    resource: null,
    resourceSchemaUrl: null,
    instrumentationScope: null,
    scopeSchemaUrl: null,
    ...override
  };
}
