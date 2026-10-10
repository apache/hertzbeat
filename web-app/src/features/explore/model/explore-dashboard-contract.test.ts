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
import { readDashboardPanelHandoff } from '@/features/signal-dashboard/model/signal-dashboard-handoff';
import {
  resolveDashboardPanelQuery,
  buildDashboardPanelExploreLink
} from '@/features/signal-dashboard/model/dashboard-panel-query';
import { buildExploreDashboardHandoff } from './explore-dashboard-handoff';
import { parseExploreQuery } from './explore-url-model';
import type { ExploreQuery } from './explore-query';

const timeWindow = { from: 1788632760000, to: 1788632820000 };
const scope = { serviceName: 'alpha-java-m2', serviceNamespace: 'alpha-proof', environment: 'local-proof' };
const queries: ExploreQuery[] = [
  { signal: 'metrics', timeRange: 'last-1h', ...scope, query: 'jvm_memory_used_bytes', aggregation: 'sum', step: '60' },
  {
    signal: 'logs',
    timeRange: 'last-1h',
    ...scope,
    query: 'latency',
    logSort: JSON.stringify({ version: 1, field: 'attribute:duration', type: 'number', direction: 'desc' }),
    logNumericRange: JSON.stringify({ version: 1, field: 'attribute:duration', min: 2.5, max: 6.75 })
  },
  { signal: 'logs', timeRange: 'last-1h', ...scope, query: 'failure', traceId: '62abd8e24a6bb4266467522b865ba687' },
  { signal: 'traces', timeRange: 'last-1h', ...scope, query: 'GET /failure', errorOnly: true, minDurationMs: 0 },
  {
    signal: 'traces',
    timeRange: 'last-1h',
    ...scope,
    traceId: '62abd8e24a6bb4266467522b865ba687',
    spanId: 'f3c3895e8ead45c9'
  }
];

describe('Explore / Dashboard production contract integration', () => {
  it.each(queries)('round-trips the supported $signal definition through its actual consumer and resolver', query => {
    const source = buildExploreDashboardHandoff(query, {
      timeWindow,
      timeZone: 'Asia/Shanghai',
      title: 'Investigation',
      dashboardKey: 'source-investigation'
    });
    expect(source.state).toBe('ready');
    if (source.state !== 'ready') return;
    const consumed = readDashboardPanelHandoff(source.handoff);
    expect(consumed).toBeDefined();
    if (!consumed) return;
    const panel = Object.values(consumed.document.spec.panels)[0]!;
    const resolved = resolveDashboardPanelQuery({
      panel,
      variables: consumed.document.spec.variables,
      variableValues: {},
      timeWindow: consumed.timeWindow
    });
    expect(resolved.state).toBe('ready');
    if (resolved.state !== 'ready') return;
    const dashboardReturnTo =
      '/observability/dashboards?dashboard=saved&start=1788632760000&end=1788632820000&timeZone=Asia%2FShanghai';
    const link = buildDashboardPanelExploreLink(resolved.query, 'Asia/Shanghai', dashboardReturnTo);
    expect(link.state).toBe('ready');
    if (link.state !== 'ready') return;
    const reopened = parseExploreQuery(new URL(link.path, 'https://hertzbeat.local').searchParams);
    expect(reopened).toMatchObject({
      signal: query.signal,
      start: timeWindow.from,
      end: timeWindow.to,
      timeZone: 'Asia/Shanghai',
      dashboardReturnTo
    });
    if (query.signal === 'logs' && query.logSort) expect(reopened).toMatchObject({ logSort: query.logSort });
    if (query.signal === 'logs' && query.logNumericRange)
      expect(reopened).toMatchObject({ logNumericRange: query.logNumericRange });
    if (source.pinned)
      expect(reopened).toMatchObject({ traceId: '62abd8e24a6bb4266467522b865ba687', spanId: 'f3c3895e8ead45c9' });
    else expect(reopened).toMatchObject({ ...scope, ...expectedSearch(query) });
    expect(consumed.document.spec.duration).toBe('1h');
  });
});

function expectedSearch(query: ExploreQuery) {
  return query.signal === 'logs'
    ? { query: query.query ? JSON.stringify(query.query) : query.query, searchSyntax: 'structured-v1' }
    : { query: query.query };
}

it('rejects invalid typed sorting documents and malformed Explore handoff sources', async () => {
  const { parseHertzBeatDashboardDocument } = await import('@/platform/perses');
  const logSort = JSON.stringify({ version: 1, field: 'attribute:duration', type: 'number', direction: 'desc' });
  const options = { timeWindow, timeZone: 'UTC', title: 'Ordered logs', dashboardKey: 'ordered-logs' };
  const result = buildExploreDashboardHandoff({ signal: 'logs', timeRange: 'last-30m', logSort }, options);
  expect(result.state).toBe('ready');
  if (result.state !== 'ready') throw new Error('Expected a typed log panel');
  const document = structuredClone(parseHertzBeatDashboardDocument(result.handoff.document));
  const query = Object.values(document.spec.panels)[0]!.spec.queries[0].spec.plugin.spec.query;
  Object.assign(query, { logSort: { version: 1, field: 'attribute:duration', type: 'boolean', direction: 'desc' } });
  expect(() => parseHertzBeatDashboardDocument(document)).toThrow();
  expect(buildExploreDashboardHandoff({ signal: 'logs', timeRange: 'last-30m', logSort: '{}' }, options)).toMatchObject(
    { state: 'unsupported' }
  );
});
it('rejects invalid numeric-range documents and malformed Explore handoffs', async () => {
  const { parseHertzBeatDashboardDocument } = await import('@/platform/perses');
  const range = { version: 1, field: 'attribute:duration', min: 2.5, max: 6.75 };
  const options = { timeWindow, timeZone: 'UTC', title: 'Ranged logs', dashboardKey: 'ranged-logs' };
  const result = buildExploreDashboardHandoff(
    { signal: 'logs', timeRange: 'last-30m', logNumericRange: JSON.stringify(range) },
    options
  );
  if (result.state !== 'ready') throw new Error('Expected numeric-range panel');
  const document = structuredClone(parseHertzBeatDashboardDocument(result.handoff.document));
  const query = Object.values(document.spec.panels)[0]!.spec.queries[0].spec.plugin.spec.query;
  Object.assign(query, { logNumericRange: { ...range, min: 7 } });
  expect(() => parseHertzBeatDashboardDocument(document)).toThrow();
  expect(
    buildExploreDashboardHandoff({ signal: 'logs', timeRange: 'last-30m', logNumericRange: '{}' }, options).state
  ).not.toBe('ready');
});
