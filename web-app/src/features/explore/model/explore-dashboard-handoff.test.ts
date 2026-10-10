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

import { parseHertzBeatDashboardDocument } from '@/platform/perses';
import { safeDashboardExploreReturnPath } from '@/shared/navigation/signal-dashboard-paths';
import { buildExploreDashboardHandoff } from './explore-dashboard-handoff';
import type { ExploreQuery } from './explore-query';
import { DEFAULT_TRACE_VIEW, encodeTraceView } from './explore-trace-view';
import { parseExploreQuery } from './explore-url-model';

const traceId = '62abd8e24a6bb4266467522b865ba687';
const spanId = 'f3c3895e8ead45c9';
const options = {
  timeWindow: { from: 1788632760000, to: 1788632820000 },
  timeZone: 'Asia/Shanghai',
  title: 'Service investigation',
  dashboardKey: 'explore-investigation'
};
const context = {
  entityId: '17',
  serviceName: 'alpha-java-m2',
  serviceNamespace: 'alpha-proof',
  environment: 'local-proof',
  collectorId: 'collector-1',
  instance: 'java-01',
  endpoint: '/failure'
};

function ready(query: ExploreQuery) {
  const result = buildExploreDashboardHandoff(query, options);
  expect(result.state).toBe('ready');
  if (result.state !== 'ready') throw new Error('Expected a supported panel');
  const document = parseHertzBeatDashboardDocument(result.handoff.document);
  const panels = Object.values(document.spec.panels);
  expect(panels).toHaveLength(1);
  const panel = panels[0];
  if (!panel) throw new Error('Expected the single validated panel');
  expect(document.spec.variables).toEqual([]);
  expect(result.handoff.timeWindow).toEqual(options.timeWindow);
  expect(safeDashboardExploreReturnPath(result.handoff.returnTo)).toBe(result.handoff.returnTo);
  return { ...result, document, panel, query: panel.spec.queries[0].spec.plugin.spec.query };
}

function readReturnTo(path: string) {
  return parseExploreQuery(new URLSearchParams(path.split('?')[1]));
}

describe('Explore Dashboard handoff', () => {
  it('does not save a structural trace population as a plain trace dashboard panel', () => {
    const traceStructure = JSON.stringify({
      version: 1,
      a: { serviceName: 'checkout', operationName: null, status: null },
      b: { serviceName: 'cart', operationName: null, status: 'ERROR' },
      relation: 'direct'
    });
    expect(buildExploreDashboardHandoff({ signal: 'traces', timeRange: 'last-30m', traceStructure }, options)).toEqual({
      state: 'unsupported',
      reason: 'trace-structure'
    });
  });
  it('does not turn a sampled calculated field into a raw-log dashboard panel', () => {
    expect(
      buildExploreDashboardHandoff(
        {
          signal: 'logs',
          timeRange: 'last-30m',
          logAggregation: 'calculated',
          logCalculated: JSON.stringify({
            version: 1,
            name: 'attempt',
            kind: 'extract',
            source: 'body',
            before: 'attempt ',
            after: ' failed'
          })
        },
        options
      )
    ).toEqual({ state: 'unsupported', reason: 'log-calculated' });
  });
  it('stores calculated v2 definitions and returns to the same Explore query', () => {
    const logCalculatedV2 = JSON.stringify({
      version: 2,
      nextFieldSeq: 2,
      fields: [{ id: 'c1', kind: 'formula', name: 'upperService', expression: 'upper(@service)' }]
    });
    const result = ready({ signal: 'logs', timeRange: 'last-30m', searchSyntax: 'structured-v2', logCalculatedV2 });
    expect(result.query).toMatchObject({ queryKind: 'table', searchSyntax: 'structured-v2', logCalculatedV2 });
    const returned = readReturnTo(result.handoff.returnTo);
    expect(returned.signal === 'logs' && returned.logCalculatedV2).toBe(logCalculatedV2);
  });
  it('rejects calculated analysis and invalid definitions instead of silently saving raw logs', () => {
    const logCalculatedV2 = JSON.stringify({
      version: 2,
      nextFieldSeq: 2,
      fields: [{ id: 'c1', kind: 'formula', name: 'upperService', expression: 'upper(@service)' }]
    });
    const base = {
      signal: 'logs' as const,
      timeRange: 'last-30m' as const,
      searchSyntax: 'structured-v2',
      logCalculatedV2
    };
    expect(
      buildExploreDashboardHandoff(
        { ...base, logAnalysis: JSON.stringify({ version: 1, representation: 'timeseries' }) },
        options
      ).state
    ).toBe('unsupported');
    expect(
      buildExploreDashboardHandoff(
        { ...base, logCalculatedV2: logCalculatedV2.replace('"version":2', '"version":1') },
        options
      ).state
    ).toBe('unsupported');
  });
  it('persists all metric sources, formulas and visibility in the native document', () => {
    const plan = {
      version: 1,
      queries: [
        { refId: 'a', metric: 'requests_total' },
        { refId: 'b', metric: 'errors_total' }
      ],
      formulas: [{ id: 'f1', expression: 'b / a' }]
    };
    const view = { mode: 'chart', hidden: ['a', 'b'] };
    const result = ready({
      signal: 'metrics',
      timeRange: 'last-30m',
      metricPlan: JSON.stringify(plan),
      metricView: JSON.stringify(view)
    });
    expect(result.query).toMatchObject({ queryKind: 'composition', plan });
    expect(result.panel.spec.plugin.spec).toMatchObject({ metricView: view });
  });
  it('retains scalar metric grouping and filters', () => {
    expect(
      ready({
        signal: 'metrics',
        timeRange: 'last-30m',
        query: 'requests_total',
        metricFilter: 'method=POST',
        groupBy: 'service_name'
      }).query
    ).toMatchObject({ metric: { metricFilter: 'method=POST', groupBy: 'service_name' } });
  });
  it('preserves historical log ordering in the panel query', () => {
    expect(ready({ signal: 'logs', timeRange: 'last-30m', sort: 'oldest' }).query).toMatchObject({ sort: 'oldest' });
  });

  it('preserves a brushed half-open trace window in the panel query', () => {
    expect(ready({ signal: 'traces', timeRange: 'last-30m', endExclusive: true }).query).toMatchObject({
      endExclusive: true
    });
  });

  it('preserves a category filter in the panel contract', () => {
    expect(
      buildExploreDashboardHandoff({ signal: 'logs', timeRange: 'last-30m', severityCategory: 'ERROR' }, options)
    ).toMatchObject({ state: 'ready' });
  });
  it('preserves controlled metric dimensions and converts the step in seconds', () => {
    const query: ExploreQuery = {
      signal: 'metrics',
      timeRange: 'last-1h',
      ...context,
      monitorId: '19',
      intakeProfileId: 'server-direct',
      query: 'jvm_memory_used_bytes',
      aggregation: 'sum',
      temporalAggregation: 'rate',
      step: '60',
      operationName: 'GET /failure',
      windowMode: 'preset',
      autoRefreshMs: 30000
    };
    const original = structuredClone(query);
    const result = ready(query);
    expect(result.pinned).toBe(false);
    expect(result.panel.spec.plugin.kind).toBe('TimeSeriesChart');
    expect(result.query).toEqual({
      signal: 'metrics',
      queryKind: 'time-series',
      context,
      metric: {
        name: 'jvm_memory_used_bytes',
        aggregation: 'sum',
        temporalAggregation: 'rate',
        stepSeconds: 60,
        operationName: 'GET /failure'
      },
      limit: 32
    });
    expect(result.document.metadata).toEqual({ name: options.dashboardKey, project: 'hertzbeat' });
    expect(result.document.spec.display.name).toBe(options.title);
    expect(result.document.spec.duration).toBe('1h');
    expect(JSON.stringify(result.document)).not.toContain('timeWindow');
    const returned = readReturnTo(result.handoff.returnTo);
    expect(returned).toMatchObject({
      ...context,
      monitorId: '19',
      intakeProfileId: 'server-direct',
      start: options.timeWindow.from,
      end: options.timeWindow.to,
      timeZone: options.timeZone
    });
    expect(returned.windowMode).toBeUndefined();
    expect(returned.autoRefreshMs).toBeUndefined();
    expect(query).toEqual(original);
  });

  it.each(['last-15m', 'last-30m', 'last-1h', 'last-6h', 'last-24h'] as const)(
    'keeps %s as the document default while handing off the exact observation window',
    timeRange => {
      const result = ready({ signal: 'logs', timeRange });
      expect(result.document.spec.duration).toBe(timeRange.slice(5));
      expect(result.handoff.timeWindow).toEqual(options.timeWindow);
    }
  );

  it('uses the existing metric aggregation and step parsing semantics', () => {
    const result = ready({
      signal: 'metrics',
      timeRange: 'last-30m',
      query: 'requests_total',
      aggregation: ' SUM ',
      step: ' 86400 '
    });
    expect(result.query).toMatchObject({ metric: { aggregation: 'sum', stepSeconds: 86400 } });
  });

  it('preserves log correlation while fixing a relative window and resetting display pagination', () => {
    const result = ready({
      signal: 'logs',
      timeRange: 'last-1h',
      ...context,
      query: 'timeout',
      severityText: 'ERROR',
      traceId,
      spanId,
      hideInternal: true,
      hideNoise: false,
      pageIndex: 7
    });
    expect(result.pinned).toBe(false);
    expect(result.panel.spec.plugin.kind).toBe('LogsTable');
    expect(result.query).toEqual({
      signal: 'logs',
      queryKind: 'table',
      context,
      search: 'timeout',
      severity: 'ERROR',
      traceId,
      spanId,
      hideInternal: true,
      hideNoise: false,
      limit: 20
    });
    expect(readReturnTo(result.handoff.returnTo)).toMatchObject({
      traceId,
      spanId,
      query: '"timeout"',
      searchSyntax: 'structured-v1',
      severityText: 'ERROR',
      hideInternal: true,
      start: options.timeWindow.from,
      end: options.timeWindow.to
    });
  });

  it('preserves trace table filters including zero duration and entrypoint scope', () => {
    const result = ready({
      signal: 'traces',
      timeRange: 'last-15m',
      ...context,
      query: 'GET /failure',
      errorOnly: true,
      minDurationMs: 0,
      maxDurationMs: 250,
      spanScope: 'entrypoint',
      hideInternal: false,
      sort: 'newest',
      pageIndex: 3
    });
    expect(result.pinned).toBe(false);
    expect(result.panel.spec.plugin.kind).toBe('TraceTable');
    expect(result.query).toEqual({
      signal: 'traces',
      queryKind: 'table',
      context,
      operationName: 'GET /failure',
      errorOnly: true,
      minDurationMs: 0,
      maxDurationMs: 250,
      spanScope: 'entrypoint',
      hideInternal: false,
      limit: 20
    });
    expect(readReturnTo(result.handoff.returnTo)).toMatchObject({
      query: 'GET /failure',
      minDurationMs: 0,
      maxDurationMs: 250,
      errorOnly: true,
      spanScope: 'entrypoint'
    });
  });

  it('pins a selected trace without claiming its context or filters affect Gantt execution', () => {
    const query: ExploreQuery = {
      signal: 'traces',
      timeRange: 'last-1h',
      ...context,
      traceId,
      spanId,
      query: 'GET /failure',
      errorOnly: true,
      minDurationMs: 10,
      resourceFilter: 'service.version=1',
      attributeFilter: 'http.status_code=500',
      sort: 'duration_desc',
      spanScope: 'root',
      hideInternal: true
    };
    const result = ready(query);
    expect(result.pinned).toBe(true);
    expect(result.panel.spec.plugin.kind).toBe('TracingGanttChart');
    expect(result.query).toEqual({ signal: 'traces', queryKind: 'gantt', traceId, spanId });
    expect(readReturnTo(result.handoff.returnTo)).toMatchObject(query);
  });

  it.each(['metrics', 'logs', 'traces'] as const)('allows unfiltered %s without undefined JSON properties', signal => {
    const result = ready({
      signal,
      timeRange: 'last-30m',
      ...(signal === 'metrics' ? { query: 'requests_total' } : {})
    });
    expect(result.query.context).toBeUndefined();
    expect(JSON.parse(JSON.stringify(result.document))).toEqual(result.document);
  });

  it.each([
    ['logs', { logRecordUid: 'selected-record' }],
    ['logs', { live: true }],
    ['traces', { spanId }]
  ] as const)('rejects unsupported %s conditions %j without broadening the query', (signal, fields) => {
    const query = {
      signal,
      timeRange: 'last-30m',
      ...fields
    } as ExploreQuery;
    expect(buildExploreDashboardHandoff(query, options)).toEqual({ state: 'unsupported' });
  });

  it.each([
    { query: undefined },
    { query: '' },
    { query: 'rate(requests_total[5m])' },
    { aggregation: 'p95' },
    { temporalAggregation: 'latest' },
    { step: '0' },
    { step: '60s' },
    { step: '86401' },
    { serviceName: ' alpha ' },
    { entityId: '0' },
    { collectorId: 'bad/id' },
    { serviceName: '${serviceName}' },
    { query: '$__rate_interval' }
  ])('rejects invalid metric data %j through the controlled document contract', fields => {
    expect(
      buildExploreDashboardHandoff(
        { signal: 'metrics', timeRange: 'last-30m', query: 'requests_total', ...fields } as ExploreQuery,
        options
      )
    ).toEqual({ state: 'unsupported' });
  });

  it.each([
    { minDurationMs: -1 },
    { maxDurationMs: Number.NaN },
    { minDurationMs: 20, maxDurationMs: 10 },
    { spanScope: 'any' },
    { sort: 'unknown' },
    { traceId: 'bad-trace' },
    { traceId, spanId: 'bad-span' }
  ])('rejects invalid trace conditions %j', fields => {
    expect(
      buildExploreDashboardHandoff({ signal: 'traces', timeRange: 'last-30m', ...fields } as ExploreQuery, options)
    ).toEqual({ state: 'unsupported' });
  });

  it('preserves JUL severity text without translating it to a category', () => {
    expect(ready({ signal: 'logs', timeRange: 'last-30m', severityText: 'SEVERE' }).query).toMatchObject({
      severity: 'SEVERE'
    });
  });

  it.each([
    { timeWindow: { from: 0, to: 1 } },
    { timeWindow: { from: 2, to: 1 } },
    { timeWindow: { from: 1, to: 86400002 } },
    { timeWindow: { from: 1.5, to: 2 } },
    { timeZone: 'invalid/timezone' },
    { dashboardKey: 'invalid/key' },
    { title: ' ' }
  ])('rejects an invalid handoff envelope %j', changes => {
    expect(buildExploreDashboardHandoff({ signal: 'logs', timeRange: 'last-30m' }, { ...options, ...changes })).toEqual(
      { state: 'unsupported' }
    );
  });
});

describe('Trace panel population persistence', () => {
  it.each(['list', 'groups'] as const)('preserves matched spans %s and same-span predicates', mode => {
    const query: ExploreQuery = {
      signal: 'traces',
      timeRange: 'last-30m',
      sort: 'duration_desc',
      resourceFilter: 'service.version = "1"',
      attributeFilter: 'http.route = "/failure"',
      endExclusive: true,
      traceView: encodeTraceView({
        ...DEFAULT_TRACE_VIEW,
        population: 'matched_spans',
        mode,
        groupBy: 'operationName',
        density: 'comfortable'
      })
    };
    const result = ready(query);
    expect(result.query).toMatchObject({
      queryKind: mode === 'groups' ? 'groups' : 'spans',
      resourceFilter: query.resourceFilter,
      attributeFilter: query.attributeFilter,
      endExclusive: true
    });
    if (mode === 'groups')
      expect(result.query).toMatchObject({
        population: 'matched_spans',
        groupBy: 'operationName',
        orderBy: 'count-desc'
      });
    else expect(result.query).toHaveProperty('sort', 'duration_desc');
    expect(result.panel.spec.plugin.spec).toMatchObject({
      density: 'comfortable',
      columns: DEFAULT_TRACE_VIEW.columns
    });
  });
});
it('preserves raw severity and category plus exact field predicates through a log panel', () => {
  const filters = {
    severityText: 'SEVERE',
    severityCategory: 'ERROR' as const,
    resourceFilter: ' service.version = "v1,blue" ',
    attributeFilter: 'http.route != "/failure"'
  };
  const result = ready({ signal: 'logs', timeRange: 'last-30m', ...filters });
  expect(result.query).toMatchObject({
    severity: 'SEVERE',
    severityCategory: 'ERROR',
    resourceFilter: filters.resourceFilter,
    attributeFilter: filters.attributeFilter
  });
});
