/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it } from 'vitest';

import { ExploreSignalContractError, type LogRow, type MetricConsole, type TraceRow } from './explore-signal-contract';
import {
  createExploreLogPersesResult,
  createExploreMetricPersesResult,
  createExploreTracePersesResult,
  createLogTrendPersesResult
} from './explore-perses-result-model';

const window = { from: 1_750_000_000_000, to: 1_750_000_060_000 } as const;

describe('Explore Perses result adapters', () => {
  it('keeps the complete metric evidence scope in the runtime identity', () => {
    const first = createExploreMetricPersesResult(
      { signal: 'metrics', timeRange: 'last-30m', query: 'latency', metricFilter: 'method=GET' },
      metricConsole,
      window,
      3
    );
    const second = createExploreMetricPersesResult(
      { signal: 'metrics', timeRange: 'last-30m', query: 'latency', metricFilter: 'method=POST' },
      metricConsole,
      window,
      3
    );

    expect(first.runtimeIdentity).not.toBe(second.runtimeIdentity);
    expect(first.runtimeIdentity).toContain('metricFilter=method%3DGET');
    expect(first.runtimeIdentity).toContain('"revision":3');
    expect(first.outcome.data.series[0]?.points).toEqual([{ timestamp: window.from, value: 5 }]);
  });

  it('names chart series by differing labels while keeping every original identity and sample', () => {
    const points = [[window.from, 5]];
    const series = ['0.005', '0.01', '+Inf'].map((le, index) => ({
      key: `bucket-${index}`,
      name: 'duration_seconds_bucket',
      labels: {
        __name__: 'duration_seconds_bucket',
        service_name: 'checkout',
        deployment_environment_name: 'prod',
        le
      },
      points
    }));
    const result = createExploreMetricPersesResult(
      { signal: 'metrics', timeRange: 'last-30m' },
      metricConsole,
      window,
      1,
      series
    );
    expect(result.outcome.data.series.map(item => item.displayName)).toEqual(['le="0.005"', 'le="0.01"', 'le="+Inf"']);
    result.outcome.data.series.forEach((item, index) => {
      expect(item.labels).toEqual(series[index]!.labels);
      expect(item.key).toBe(series[index]!.key);
      expect(item.name).toBe(series[index]!.name);
      expect(item.points).toEqual([{ timestamp: window.from, value: 5 }]);
    });
    expect(series[0]).not.toHaveProperty('displayName');
  });

  it('retains metric identity when names differ and distinguishes absent labels from empty labels', () => {
    const make = (names: string[], labels: Record<string, string>[]) =>
      createExploreMetricPersesResult(
        { signal: 'metrics', timeRange: 'last-30m' },
        metricConsole,
        window,
        1,
        names.map((name, index) => ({
          key: `${name}-${index}`,
          name,
          labels: labels[index]!,
          points: [[window.from, index]]
        }))
      ).outcome.data.series.map(item => item.displayName);
    expect(make(['cpu', 'memory'], [{ service: 'api' }, { service: 'api' }])).toEqual(['cpu', 'memory']);
    expect(make(['cpu', 'cpu'], [{}, { region: '' }])).toEqual(['cpu', 'region=""']);
    expect(make(['cpu', 'cpu'], [{ service: 'api' }, { service: 'api' }])).toEqual(['cpu-0', 'cpu-1']);
  });

  it('rejects a malformed ready metric sample instead of dropping it into empty evidence', () => {
    const malformed = structuredClone(metricConsole);
    malformed.results!.frames![0]!.data = [[window.from, 'not-a-number']];

    expect(() =>
      createExploreMetricPersesResult(
        { signal: 'metrics', timeRange: 'last-30m', query: 'latency' },
        malformed,
        window,
        0
      )
    ).toThrow(ExploreSignalContractError);
  });

  it('maps the authoritative log page and trace page without fabricating pagination totals', () => {
    const logs = createExploreLogPersesResult(
      { signal: 'logs', timeRange: 'last-30m', query: 'timeout', pageIndex: 2 },
      { content: [logRow], totalElements: 57, totalPages: 3, number: 2, size: 20 },
      window,
      4
    );
    const traces = createExploreTracePersesResult(
      { signal: 'traces', timeRange: 'last-30m', errorOnly: true, pageIndex: 1 },
      { content: [traceRow], totalElements: 22, totalPages: 2, number: 1, size: 20 },
      window,
      4
    );

    expect(logs.outcome.data).toEqual({ rows: [logRow], total: 57 });
    expect(logs.query.limit).toBe(20);
    expect(logs.runtimeIdentity).toContain('page=2');
    expect(traces.outcome.data.total).toBe(22);
    expect(traces.runtimeIdentity).toContain('errorOnly=true');
  });

  it('keeps server query truncation distinct from ordinary pagination and legacy unknown coverage', () => {
    const page = { content: [traceRow], totalElements: 22, totalPages: 2, number: 0, size: 20 };
    const query = { signal: 'traces', timeRange: 'last-30m' } as const;
    expect(createExploreTracePersesResult(query, page, window, 0).outcome.truncated).toBe('unknown');
    expect(
      createExploreTracePersesResult(
        query,
        { ...page, query: { sort: 'newest', coverage: 'window', rowLimit: null, truncated: false } },
        window,
        0
      ).outcome.truncated
    ).toBe(false);
    expect(
      createExploreTracePersesResult(
        query,
        { ...page, query: { sort: 'newest', coverage: 'bounded', rowLimit: 1500, truncated: true } },
        window,
        0
      ).outcome.truncated
    ).toBe(true);
  });

  it('rejects incomplete trace rows and maps log trend independently', () => {
    expect(() =>
      createExploreTracePersesResult(
        { signal: 'traces', timeRange: 'last-30m' },
        {
          content: [{ ...traceRow, serviceStats: null } as unknown as TraceRow],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 20
        },
        window,
        0
      )
    ).toThrow(ExploreSignalContractError);

    expect(() =>
      createExploreTracePersesResult(
        { signal: 'traces', timeRange: 'last-30m' },
        {
          content: [{ ...traceRow, spanCount: 3 }],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 20
        },
        window,
        0
      )
    ).toThrow(ExploreSignalContractError);

    const trend = createLogTrendPersesResult(
      { start: window.from, end: window.to, intervalMs: 60_000, buckets: [{ start: window.from, count: 7 }] },
      window,
      'scope'
    );
    expect(trend.outcome.data.series[0]?.points[0]).toEqual({
      timestamp: window.from,
      value: 7
    });
  });
});

const metricConsole: MetricConsole = {
  context: {
    entityId: null,
    entityType: null,
    entityName: null,
    serviceName: null,
    serviceNamespace: null,
    environment: null,
    operationName: null,
    start: window.from,
    end: window.to
  },
  query: 'latency',
  datasource: 'greptime',
  queryMode: 'range',
  results: {
    refId: 'A',
    status: 200,
    msg: null,
    frames: [
      {
        schema: {
          fields: [{ name: 'value', type: 'number', unit: 'ms' }],
          labels: { __name__: 'latency' },
          meta: null
        },
        data: [[window.from, 5]]
      }
    ]
  },
  stats: { totalSeries: 1, nonEmptySeries: 1, latestObservedAt: window.from },
  emptyStateReason: null,
  errorMessage: null
};

const logRow: LogRow = {
  logRecordUid: 'log-1',
  timeUnixNano: '1750000000000000000',
  observedTimeUnixNano: null,
  severityNumber: 17,
  severityText: 'ERROR',
  body: 'timeout',
  attributes: {},
  droppedAttributesCount: 0,
  traceId: '0123456789abcdef0123456789abcdef',
  spanId: '0123456789abcdef',
  traceFlags: 1,
  resource: {},
  resourceSchemaUrl: null,
  instrumentationScope: null,
  scopeSchemaUrl: null
};

const traceRow: TraceRow = {
  rootState: 'unique',
  rootSpanCount: 1,
  representativeSpan: {
    spanId: '0123456789abcdef',
    spanName: 'POST /checkout',
    serviceName: 'checkout',
    serviceNamespace: 'commerce',
    startTime: window.from,
    durationNanos: 5_000_000
  },
  observedStartTime: window.from,
  observedEndTime: window.from + Math.ceil(5_000_000 / 1_000_000),
  unattributedServiceStats: null,
  traceId: '0123456789abcdef0123456789abcdef',
  rootSpanId: '0123456789abcdef',
  serviceName: 'checkout',
  serviceNamespace: 'commerce',
  rootSpanName: 'POST /checkout',
  durationNanos: 5_000_000,
  status: 'ERROR',
  startTime: window.from,
  errorSpanCount: 1,
  resourceAttributes: {},
  spanCount: 2,
  serviceStats: { checkout: { spanCount: 2, errorCount: 1 } }
};
it('preserves computed gaps into Perses while rejecting null source samples', () => {
  const series = {
    key: 'f1',
    name: 'f1',
    labels: {},
    points: [
      [window.from, 5],
      [window.to, null]
    ]
  };
  const query = { signal: 'metrics' as const, timeRange: 'last-30m' as const };
  expect(() => createExploreMetricPersesResult(query, metricConsole, window, 1, [series])).toThrow(
    ExploreSignalContractError
  );
  expect(
    createExploreMetricPersesResult(query, metricConsole, window, 1, [{ ...series, allowsGaps: true }]).outcome.data
      .series[0]?.points
  ).toEqual([
    { timestamp: window.from, value: 5 },
    { timestamp: window.to, value: null }
  ]);
});
