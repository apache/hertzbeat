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

import { expect, it } from 'vitest';
import fixture from '@/platform/perses/model/fixtures/supported-dashboard.json';
import { hertzBeatQuerySchema, parseHertzBeatDashboardDocument } from '@/platform/perses';
import { buildDashboardPanelExploreLink, resolveDashboardPanelQuery } from './dashboard-panel-query';

it('returns the full applied analysis and dormant raw display under the resolved dashboard window', () => {
  const analysis = {
    version: 1,
    representation: 'timeseries',
    field: 'attribute:proof.facet',
    measure: { function: 'sum', field: 'attribute:proof.value' },
    additionalMeasures: [{ function: 'avg', field: 'attribute:proof.value' }],
    intervalMs: 60000,
    transform: 'throughput',
    limit: 20,
    order: 'measure-desc',
    minCount: 2,
    comparison: { version: 1, search: 'failure', formula: 'a-b', timeShiftMs: 3600000 }
  };
  const returnView = {
    version: 1,
    columns: [{ kind: 'message' }, { kind: 'severity' }],
    density: 'compact',
    wrap: true
  };
  const query = hertzBeatQuerySchema.parse({
    signal: 'logs',
    queryKind: 'analysis',
    analysis,
    returnView,
    search: '  warning  ',
    timeWindow: { from: 1788974795140, to: 1788974798140 },
    context: { serviceName: 'resolved-service', environment: 'production' },
    logNumericRange: { version: 1, field: 'attribute:proof.value', min: -2, max: 6 }
  });
  const result = buildDashboardPanelExploreLink(query, 'Asia/Shanghai', '/observability/dashboards?dashboard=analysis');
  expect(result.state).toBe('ready');
  if (result.state !== 'ready') throw new Error('Expected an analytical Explore return');
  const params = new URL(result.path, 'https://hertzbeat.local').searchParams;
  expect(JSON.parse(params.get('logAnalysis')!)).toEqual(analysis);
  expect(JSON.parse(params.get('logView')!)).toEqual(returnView);
  expect(params.get('query')).toBe('  warning  ');
  expect(params.get('serviceName')).toBe('resolved-service');
  expect(params.get('environment')).toBe('production');
  expect(params.get('start')).toBe('1788974795140');
  expect(params.get('end')).toBe('1788974798140');
  expect(params.get('dashboardReturnTo')).toBe('/observability/dashboards?dashboard=analysis');
});

it.each(['cost ${literal}', '$__literal'])(
  'keeps analytical literal text %s outside variable substitution',
  literal => {
    const source = structuredClone(fixture) as {
      spec: {
        panels: {
          logs: { spec: { plugin: { spec: unknown }; queries: { spec: { plugin: { spec: { query: unknown } } } }[] } };
        };
      };
    };
    const analysis = {
      version: 1,
      representation: 'table',
      field: 'attribute:proof.facet',
      limit: 20,
      order: 'count-desc',
      minCount: 1
    };
    const selection = { version: 1, groups: [{ field: 'attribute:proof.facet', kind: 'value', value: literal }] };
    source.spec.panels.logs.spec.plugin.spec = {};
    source.spec.panels.logs.spec.queries[0]!.spec.plugin.spec.query = {
      signal: 'logs',
      queryKind: 'analysis',
      search: literal,
      analysis,
      logGroupSelection: selection,
      context: { serviceName: '${serviceName}' }
    };
    const document = parseHertzBeatDashboardDocument(source);
    const input = {
      panel: document.spec.panels.logs!,
      variables: document.spec.variables,
      variableValues: { serviceName: 'resolved' },
      timeWindow: { from: 1000, to: 2000 }
    };
    const result = resolveDashboardPanelQuery(input);
    expect(result).toMatchObject({
      state: 'ready',
      query: { search: literal, logGroupSelection: selection, context: { serviceName: 'resolved' } }
    });
    expect(input.panel.spec.queries[0].spec.plugin.spec.query.context?.serviceName).toBe('${serviceName}');
  }
);
