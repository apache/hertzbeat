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
import { parseHertzBeatDashboardDocument } from '@/platform/perses';
import { buildExploreDashboardHandoff } from './explore-dashboard-handoff';
import { parseExploreQuery } from './explore-url-model';

const options = {
  timeWindow: { from: 1788974795140, to: 1788974798140 },
  timeZone: 'Asia/Shanghai',
  title: 'Applied log analysis',
  dashboardKey: 'applied-log-analysis'
};

it.each(['table', 'toplist', 'timeseries'] as const)(
  'hands off %s with its actual visual plugin and complete applied state',
  representation => {
    const analysis = {
      version: 1,
      representation,
      field: 'attribute:proof.facet',
      measure: { function: 'sum', field: 'attribute:proof.value' },
      additionalMeasures: [{ function: 'avg', field: 'attribute:proof.value' }],
      intervalMs: 60000,
      limit: 20,
      order: 'measure-desc',
      minCount: 2,
      ...(representation === 'timeseries' ? { transform: 'throughput' } : {}),
      ...(representation !== 'toplist'
        ? { comparison: { version: 1, search: 'failure', formula: 'a-b', timeShiftMs: 3600000 } }
        : {})
    };
    const view = { version: 1, columns: [{ kind: 'message' }, { kind: 'severity' }], density: 'compact', wrap: true };
    const result = buildExploreDashboardHandoff(
      {
        signal: 'logs',
        timeRange: 'last-30m',
        serviceName: 'proof-logs',
        query: '  warning  ',
        logAnalysis: JSON.stringify(analysis),
        logView: JSON.stringify(view),
        logNumericRange: JSON.stringify({ version: 1, field: 'attribute:proof.value', min: -2, max: 6 })
      },
      options
    );
    expect(result.state).toBe('ready');
    if (result.state !== 'ready') throw new Error('Expected a supported analytical panel');
    const panel = Object.values(parseHertzBeatDashboardDocument(result.handoff.document).spec.panels)[0]!;
    const series = representation === 'timeseries';
    expect(parseHertzBeatDashboardDocument(result.handoff.document).spec.layouts[0].spec.items[0]?.height).toBe(
      series ? 16 : representation === 'table' ? 12 : 8
    );
    expect(panel.spec.plugin.kind).toBe(series ? 'TimeSeriesChart' : 'LogsTable');
    expect(panel.spec.queries[0].kind).toBe(series ? 'TimeSeriesQuery' : 'LogQuery');
    expect(panel.spec.queries[0].spec.plugin.kind).toBe(series ? 'HertzBeatTimeSeriesQuery' : 'HertzBeatLogQuery');
    expect(panel.spec.queries[0].spec.plugin.spec.query).toMatchObject({
      signal: 'logs',
      queryKind: 'analysis',
      search: '  warning  ',
      analysis,
      returnView: view,
      logNumericRange: { version: 1, field: 'attribute:proof.value', min: -2, max: 6 }
    });
    const returned = parseExploreQuery(new URLSearchParams(result.handoff.returnTo.split('?')[1]));
    expect(returned).toMatchObject({
      logAnalysis: JSON.stringify(analysis),
      logView: JSON.stringify(view),
      start: options.timeWindow.from,
      end: options.timeWindow.to
    });
  }
);

it('preserves exact group selection without inventing a raw return view', () => {
  const selection = {
    version: 1,
    groups: [{ field: 'attribute:proof.facet', kind: 'value', value: 'cost ${literal}' }]
  };
  const result = buildExploreDashboardHandoff(
    {
      signal: 'logs',
      timeRange: 'last-30m',
      query: '$__literal',
      logAnalysis: JSON.stringify({
        version: 1,
        representation: 'table',
        field: 'attribute:proof.facet',
        limit: 20,
        order: 'count-desc',
        minCount: 1
      }),
      logGroupSelection: JSON.stringify(selection)
    },
    options
  );
  expect(result.state).toBe('ready');
  if (result.state !== 'ready') throw new Error('Expected exact analytical handoff');
  const query = parseHertzBeatDashboardDocument(result.handoff.document).spec.panels.explore!.spec.queries[0].spec
    .plugin.spec.query;
  expect(query).toMatchObject({ queryKind: 'analysis', search: '$__literal', logGroupSelection: selection });
  expect(query).not.toHaveProperty('returnView');
});
