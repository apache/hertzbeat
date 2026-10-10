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

import type {
  HertzBeatLogRow,
  HertzBeatTableData,
  HertzBeatTraceDetail,
  HertzBeatTraceRow
} from '../datasource/hertzbeat-query-schema';
import {
  orderHertzBeatLogRowsForPerses,
  toPersesLogData,
  toPersesTraceDetailData,
  toPersesTraceSearchData
} from './perses-signal-data';

const timeWindow = { from: 1_750_000_000_000, to: 1_750_000_060_000 } as const;

describe('HertzBeat to Perses signal data', () => {
  it('maps bounded log rows without inventing missing evidence', () => {
    const data: HertzBeatTableData<HertzBeatLogRow> = {
      total: 3,
      rows: [
        {
          logRecordUid: 'event-1',
          timeUnixNano: '1750000001000000000',
          observedTimeUnixNano: null,
          severityNumber: 17,
          severityText: 'ERROR',
          body: { message: 'checkout failed', attempt: 2 },
          attributes: { 'http.route': '/orders', nested: { ignored: true } },
          droppedAttributesCount: 0,
          traceId: '0123456789abcdef0123456789abcdef',
          spanId: '0123456789abcdef',
          traceFlags: 1,
          resource: { 'service.name': 'checkout' },
          resourceSchemaUrl: null,
          instrumentationScope: null,
          scopeSchemaUrl: null
        }
      ]
    };

    expect(toPersesLogData(data, timeWindow)).toEqual({
      timeRange: { start: new Date(timeWindow.from), end: new Date(timeWindow.to) },
      entries: [
        {
          timestamp: 1_750_000_001,
          line: '{"message":"checkout failed","attempt":2}',
          hertzbeatAttributes: { 'http.route': '/orders', nested: { ignored: true } },
          labels: {
            'resource.service.name': 'checkout',
            'attribute.http.route': '/orders',
            severity: 'ERROR',
            trace_id: '0123456789abcdef0123456789abcdef',
            span_id: '0123456789abcdef'
          }
        }
      ],
      totalCount: 3,
      hasMore: true,
      direction: 'backward'
    });
    expect(toPersesLogData(data, timeWindow).entries[0]!.timestamp * 1_000).toBe(1_750_000_001_000);
  });

  it('keeps event identity in attributes and the message line faithful to its body', () => {
    const attributes = { 'event.name': 'codex.tool_result', 'tool.name': 'exec', success: false, output: 'secret' };
    const row = logRow({ body: 'null', attributes });
    expect(toPersesLogData({ rows: [row], total: 1 }, timeWindow).entries[0]).toMatchObject({
      line: 'null',
      labels: { 'attribute.event.name': 'codex.tool_result', 'attribute.success': 'false' }
    });
    expect(row.body).toBe('null');
    expect(row.attributes).toBe(attributes);
  });

  it('carries full attributes separately for content display and stack mode reads only the OTEL stack field', () => {
    const attributes = { nested: { safe: true }, 'exception.stacktrace': 'Error: failed\\n at handler' };
    expect(toPersesLogData({ rows: [logRow({ attributes })], total: 1 }, timeWindow).entries[0]).toMatchObject({
      line: 'log body',
      hertzbeatAttributes: attributes,
      hertzbeatStack: 'Error: failed\\n at handler'
    });
  });

  it('keeps absent, empty, and JSON bodies distinct in displayed log lines', () => {
    const attributes = { 'event.name': 'tool.complete' };
    const rows = [
      logRow({ body: null, attributes }),
      logRow({ body: '', attributes }),
      logRow({ body: { result: 'ok' }, attributes }),
      logRow({ body: null })
    ];
    expect(
      toPersesLogData({ rows, total: rows.length }, timeWindow, 'preserve').entries.map(entry => entry.line)
    ).toEqual(['', '', '{"result":"ok"}', '']);
  });

  it('rejects a log row without an observed timestamp instead of fabricating one', () => {
    const row = {
      logRecordUid: null,
      timeUnixNano: null,
      observedTimeUnixNano: null,
      severityNumber: null,
      severityText: null,
      body: 'missing timestamp',
      attributes: null,
      droppedAttributesCount: null,
      traceId: null,
      spanId: null,
      traceFlags: null,
      resource: null,
      resourceSchemaUrl: null,
      instrumentationScope: null,
      scopeSchemaUrl: null
    } satisfies HertzBeatLogRow;

    expect(() => toPersesLogData({ rows: [row], total: 1 }, timeWindow)).toThrow('Perses signal data');
  });

  it('derives display seconds from a lossless decimal timestamp without casting raw nanoseconds', () => {
    const row = {
      logRecordUid: 'event-1',
      timeUnixNano: '1750000001000000123',
      observedTimeUnixNano: null,
      severityNumber: null,
      severityText: 'INFO',
      body: 'selected log',
      attributes: null,
      droppedAttributesCount: null,
      traceId: null,
      spanId: null,
      traceFlags: null,
      resource: null,
      resourceSchemaUrl: null,
      instrumentationScope: null,
      scopeSchemaUrl: null
    } satisfies HertzBeatLogRow;

    expect(toPersesLogData({ rows: [row], total: 1 }, timeWindow).entries[0]?.timestamp).toBeCloseTo(
      1_750_000_001.0000002,
      7
    );
  });

  it('shares the timestamp-descending Perses row order with host-owned row inspection', () => {
    const older = logRow({ logRecordUid: 'older', timeUnixNano: '1750000001000000000', body: 'older' });
    const newest = logRow({ logRecordUid: 'newest', timeUnixNano: '1750000003000000000', body: 'newest' });
    const middle = logRow({
      logRecordUid: 'middle',
      timeUnixNano: null,
      observedTimeUnixNano: '1750000002000000000',
      body: 'middle'
    });
    const rows = [older, newest, middle];

    expect(orderHertzBeatLogRowsForPerses(rows).map(row => row.logRecordUid)).toEqual(['newest', 'middle', 'older']);
    expect(toPersesLogData({ rows, total: rows.length }, timeWindow).entries.map(entry => entry.line)).toEqual([
      'newest',
      'middle',
      'older'
    ]);
  });

  it('honors oldest order and preserves incoming equal-timestamp ties', () => {
    const rows = [
      logRow({ body: 'b', timeUnixNano: '1750000003000000000' }),
      logRow({ body: 'a', timeUnixNano: '1750000001000000000' }),
      logRow({ body: 'c', timeUnixNano: '1750000003000000000' })
    ];
    expect(orderHertzBeatLogRowsForPerses(rows, 'oldest').map(row => row.body)).toEqual(['a', 'b', 'c']);
    const data = toPersesLogData({ rows, total: 3 }, timeWindow, 'oldest');
    expect(data.direction).toBe('forward');
    expect(data.entries.map(entry => entry.line)).toEqual(['a', 'b', 'c']);
  });

  it('maps complete per-service trace statistics without attributing totals to the root service', () => {
    const row = {
      rootState: 'unique',
      rootSpanCount: 1,
      representativeSpan: {
        spanId: '0123456789abcdef',
        spanName: 'POST /orders',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        startTime: 1_750_000_001_000,
        durationNanos: 12_500_000
      },
      observedStartTime: 1_750_000_001_000,
      observedEndTime: 1_750_000_001_000 + Math.ceil(12_500_000 / 1_000_000),
      unattributedServiceStats: null,
      traceId: '0123456789abcdef0123456789abcdef',
      rootSpanId: '0123456789abcdef',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      rootSpanName: 'POST /orders',
      durationNanos: 12_500_000,
      status: 'ERROR',
      startTime: 1_750_000_001_000,
      spanCount: 4,
      errorSpanCount: 1,
      serviceStats: {
        checkout: { spanCount: 2, errorCount: 0 },
        'cart-db': { spanCount: 2, errorCount: 1 }
      },
      resourceAttributes: { 'service.name': 'checkout' }
    } satisfies HertzBeatTraceRow;

    expect(toPersesTraceSearchData({ rows: [row], total: 2 }, true)).toEqual({
      searchResult: [
        {
          traceId: '0123456789abcdef0123456789abcdef',
          rootServiceName: 'checkout',
          rootTraceName: 'POST /orders',
          startTimeUnixMs: 1_750_000_001_000,
          durationMs: 12.5,
          serviceStats: {
            checkout: { spanCount: 2, errorCount: 0 },
            'cart-db': { spanCount: 2, errorCount: 1 }
          }
        }
      ],
      metadata: { hasMoreResults: true }
    });
  });

  it.each([{ serviceName: '   ' }, { rootSpanName: '   ' }])(
    'rejects blank trace metadata instead of displaying fabricated names',
    override => {
      const row = {
        rootState: 'unique',
        rootSpanCount: 1,
        representativeSpan: {
          spanId: '0123456789abcdef',
          spanName: 'POST /orders',
          serviceName: 'checkout',
          serviceNamespace: 'commerce',
          startTime: 1_750_000_001_000,
          durationNanos: 12_500_000
        },
        observedStartTime: 1_750_000_001_000,
        observedEndTime: 1_750_000_001_000 + Math.ceil(12_500_000 / 1_000_000),
        unattributedServiceStats: null,
        traceId: '0123456789abcdef0123456789abcdef',
        rootSpanId: '0123456789abcdef',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        rootSpanName: 'POST /orders',
        durationNanos: 12_500_000,
        status: 'OK',
        startTime: 1_750_000_001_000,
        spanCount: 1,
        errorSpanCount: 0,
        serviceStats: { checkout: { spanCount: 1, errorCount: 0 } },
        resourceAttributes: null,
        ...override
      } satisfies HertzBeatTraceRow;

      expect(() => toPersesTraceSearchData({ rows: [row], total: 1 }, false)).toThrow('Perses signal data');
    }
  );

  it('maps trace details into the official OTLP trace model for TracingGanttChart', () => {
    const detail = traceDetail();
    const result = toPersesTraceDetailData(detail);

    expect(result.trace?.resourceSpans).toHaveLength(2);
    expect(result.trace?.resourceSpans[0]).toMatchObject({
      resource: {
        attributes: [
          { key: 'service.name', value: { stringValue: 'checkout' } },
          { key: 'service.namespace', value: { stringValue: 'commerce' } }
        ]
      },
      scopeSpans: [
        {
          scope: { name: 'checkout-http', version: '1.0.0' },
          spans: [
            {
              traceId: '0123456789abcdef0123456789abcdef',
              spanId: '0123456789abcdef',
              name: 'POST /orders',
              startTimeUnixNano: '1750000001000000000',
              endTimeUnixNano: '1750000001010000000',
              status: { code: 'STATUS_CODE_OK' }
            }
          ]
        }
      ]
    });
    expect(result.trace?.resourceSpans[1]?.scopeSpans[0]?.spans[0]).toMatchObject({
      spanId: 'fedcba9876543210',
      parentSpanId: '0123456789abcdef',
      status: { code: 'STATUS_CODE_ERROR', message: 'database unavailable' },
      links: [{ traceId: 'fedcba9876543210fedcba9876543210', spanId: '1111111111111111' }]
    });
  });

  it('preserves distinct native waterfall offsets inside the same millisecond', () => {
    const detail = traceDetail();
    detail.spans[0]!.startTimeUnixNano = '1750000001000000001';
    detail.spans[1]!.startTime = detail.spans[0]!.startTime;
    detail.spans[1]!.startTimeUnixNano = '1750000001000000999';
    const spans = toPersesTraceDetailData(detail).trace!.resourceSpans.flatMap(resource =>
      resource.scopeSpans.flatMap(scope => scope.spans)
    );
    expect(spans[0]!.startTimeUnixNano).toBe('1750000001000000001');
    expect(spans[1]!.startTimeUnixNano).toBe('1750000001000000999');
    expect(spans[1]!.endTimeUnixNano).toBe('1750000001002000999');
  });

  it('preserves epoch nanoseconds above Number.MAX_SAFE_INTEGER as exact OTLP decimal strings', () => {
    const detail = traceDetail();
    detail.spans[1]!.events = [
      {
        timeUnixNano: '1750000001005000123',
        name: 'exception',
        attributes: {},
        droppedAttributesCount: 0
      }
    ];

    expect(
      toPersesTraceDetailData(detail).trace?.resourceSpans[1]?.scopeSpans[0]?.spans[0]?.events?.[0]?.timeUnixNano
    ).toBe('1750000001005000123');
  });

  it.each(['99', '999999999', '9223372036854775807'])('preserves legal decimal duration %s numerically', value => {
    const detail = traceDetail();
    detail.spans[0]!.durationNanos = value;
    const span = toPersesTraceDetailData(detail).trace?.resourceSpans[0]?.scopeSpans[0]?.spans[0];
    expect(span?.endTimeUnixNano).toBe((1750000001000000000n + BigInt(value)).toString());
  });

  it('rejects decimal duration beyond signed long instead of rounding it', () => {
    const detail = traceDetail();
    detail.spans[0]!.durationNanos = '9223372036854775808';
    expect(() => toPersesTraceDetailData(detail)).toThrow('Perses signal data');
  });

  it('preserves contract-valid string event attributes', () => {
    const detail = traceDetail();
    detail.spans[1]!.events = [
      {
        timeUnixNano: '1000000',
        name: 'test event',
        attributes: { present: 'evidence' },
        droppedAttributesCount: 0
      }
    ];

    expect(detail.spans).not.toBeNull();
    const event = toPersesTraceDetailData(detail).trace?.resourceSpans[1]?.scopeSpans[0]?.spans[0]?.events?.[0];
    expect(event?.attributes).toEqual([{ key: 'present', value: { stringValue: 'evidence' } }]);
  });

  it('displays received finite JSON log attributes without inferring an OTLP integer type', () => {
    const row = {
      logRecordUid: 'event-1',
      timeUnixNano: '1750000001000000000',
      observedTimeUnixNano: null,
      severityNumber: null,
      severityText: null,
      body: 'received numeric evidence',
      attributes: { sequence: 9_007_199_254_740_992 },
      droppedAttributesCount: null,
      traceId: null,
      spanId: null,
      traceFlags: null,
      resource: null,
      resourceSchemaUrl: null,
      instrumentationScope: null,
      scopeSchemaUrl: null
    } satisfies HertzBeatLogRow;

    expect(toPersesLogData({ rows: [row], total: 1 }, timeWindow).entries[0]?.labels['attribute.sequence']).toBe(
      '9007199254740992'
    );
  });

  it('preserves finite received numbers nested in structured log bodies', () => {
    const row = logRow({
      body: { request: { sequence: 9_007_199_254_740_992 } }
    });

    expect(toPersesLogData({ rows: [row], total: 1 }, timeWindow).entries[0]?.line).toBe(JSON.stringify(row.body));
  });

  it('preserves safe nested structured log bodies', () => {
    const row = logRow({
      body: {
        request: { sequence: 9_007_199_254_740_991, ratio: 1.25 },
        accepted: true,
        result: null
      }
    });

    expect(toPersesLogData({ rows: [row], total: 1 }, timeWindow).entries[0]?.line).toBe(
      '{"request":{"sequence":9007199254740991,"ratio":1.25},"accepted":true,"result":null}'
    );
  });

  it.each(['event', 'link'])('rejects unsafe integer %s attributes instead of fabricating OTLP evidence', kind => {
    const detail = traceDetail();
    if (kind === 'event') {
      detail.spans[1]!.events = [
        {
          timeUnixNano: '1750000001005000123',
          name: 'exception',
          attributes: { sequence: 9_007_199_254_740_992 as unknown as string },
          droppedAttributesCount: 0
        }
      ];
    } else {
      detail.spans[1]!.links = [
        {
          traceId: 'fedcba9876543210fedcba9876543210',
          spanId: '1111111111111111',
          traceState: null,
          attributes: { sequence: 9_007_199_254_740_992 as unknown as string },
          droppedAttributesCount: 0
        }
      ];
    }

    expect(() => toPersesTraceDetailData(detail)).toThrow('Perses signal data');
  });
});

function logRow(overrides: Partial<HertzBeatLogRow> = {}): HertzBeatLogRow {
  return {
    logRecordUid: 'event-1',
    timeUnixNano: '1750000001000000000',
    observedTimeUnixNano: null,
    severityNumber: null,
    severityText: null,
    body: 'log body',
    attributes: null,
    droppedAttributesCount: null,
    traceId: null,
    spanId: null,
    traceFlags: null,
    resource: null,
    resourceSchemaUrl: null,
    instrumentationScope: null,
    scopeSchemaUrl: null,
    ...overrides
  };
}

function traceDetail(): HertzBeatTraceDetail {
  return {
    rootState: 'unique',
    rootSpanCount: 1,
    missingParentCount: 0,
    representativeSpan: {
      spanId: '0123456789abcdef',
      spanName: 'POST /orders',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      startTime: 1_750_000_001_000,
      durationNanos: Number('10000000')
    },
    observedStartTime: 1_750_000_001_000,
    observedEndTime: 1_750_000_001_000 + Math.ceil(Number('10000000') / 1_000_000),
    traceId: '0123456789abcdef0123456789abcdef',
    rootSpanId: '0123456789abcdef',
    serviceName: 'checkout',
    serviceNamespace: 'commerce',
    rootSpanName: 'POST /orders',
    durationNanos: '10000000',
    status: 'OK',
    startTime: 1_750_000_001_000,
    errorSpanCount: 1,
    resourceAttributes: { 'service.name': 'checkout', 'service.namespace': 'commerce' },
    spans: [
      {
        startTimeUnixNano: (BigInt(1_750_000_001_000) * 1_000_000n).toString(),
        traceId: '0123456789abcdef0123456789abcdef',
        spanId: '0123456789abcdef',
        parentSpanId: null,
        spanName: 'POST /orders',
        serviceName: 'checkout',
        status: 'OK',
        spanKind: 'SERVER',
        statusMessage: null,
        traceState: null,
        scopeName: 'checkout-http',
        scopeVersion: '1.0.0',
        durationNanos: '10000000',
        startTime: 1_750_000_001_000,
        highlighted: false,
        resourceAttributes: { 'service.name': 'checkout', 'service.namespace': 'commerce' },
        spanAttributes: { 'http.route': '/orders' },
        events: [],
        links: [],
        codeNavigationHint: null
      },
      {
        startTimeUnixNano: (BigInt(1_750_000_001_004) * 1_000_000n).toString(),
        traceId: '0123456789abcdef0123456789abcdef',
        spanId: 'fedcba9876543210',
        parentSpanId: '0123456789abcdef',
        spanName: 'SELECT cart',
        serviceName: 'cart-db',
        status: 'ERROR',
        spanKind: 'CLIENT',
        statusMessage: 'database unavailable',
        traceState: null,
        scopeName: 'jdbc',
        scopeVersion: null,
        durationNanos: '2000000',
        startTime: 1_750_000_001_004,
        highlighted: true,
        resourceAttributes: { 'service.name': 'cart-db' },
        spanAttributes: { 'db.system': 'postgresql' },
        events: [],
        links: [
          {
            traceId: 'fedcba9876543210fedcba9876543210',
            spanId: '1111111111111111',
            traceState: null,
            attributes: {},
            droppedAttributesCount: 0
          }
        ],
        codeNavigationHint: null
      }
    ]
  };
}
it('preserves finite double extrema in log labels and structured bodies', () => {
  const row = logRow({ attributes: { value: Number.MAX_VALUE }, body: { value: -Number.MAX_VALUE } });
  const entry = toPersesLogData({ rows: [row], total: 1 }, timeWindow).entries[0]!;
  expect(Object.values(entry.labels)).toContain(String(Number.MAX_VALUE));
  expect(entry.line).toBe(JSON.stringify(row.body));
});
it.each([NaN, Infinity, -Infinity])('rejects non-finite log numbers %s', value => {
  for (const row of [logRow({ attributes: { value } }), logRow({ body: { nested: [value] } })]) {
    expect(() => toPersesLogData({ rows: [row], total: 1 }, timeWindow)).toThrow('Perses signal data');
  }
});
it('shows INFO for number-only OTLP logs without changing the raw record', () => {
  const row = logRow({ severityText: '', severityNumber: 9 });
  expect(toPersesLogData({ rows: [row], total: 1 }, timeWindow).entries[0]?.labels.severity).toBe('INFO');
  expect(row.severityText).toBe('');
  expect(row.severityNumber).toBe(9);
});
