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
import { dashboardPanelSchema } from '../model/hertzbeat-dashboard-panel';

function panel(representation: string, chart = representation === 'timeseries') {
  return {
    kind: 'Panel',
    spec: {
      display: { name: 'Log evidence' },
      plugin: { kind: chart ? 'TimeSeriesChart' : 'LogsTable', spec: {} },
      queries: [
        {
          kind: chart ? 'TimeSeriesQuery' : 'LogQuery',
          spec: {
            plugin: {
              kind: chart ? 'HertzBeatTimeSeriesQuery' : 'HertzBeatLogQuery',
              spec: {
                version: 1,
                query: {
                  signal: 'logs',
                  queryKind: 'analysis',
                  search: '  literal  ',
                  analysis: {
                    version: 1,
                    representation,
                    limit: 20,
                    order: 'count-desc',
                    minCount: 1,
                    intervalMs: 1000
                  },
                  returnView: { version: 1, columns: [{ kind: 'message' }], density: 'compact', wrap: false }
                }
              }
            }
          }
        }
      ]
    }
  };
}

describe('analytical log panel contracts', () => {
  it.each(['table', 'toplist', 'timeseries'])('admits the exact %s pairing without rewriting state', mode => {
    const value = panel(mode);
    expect(dashboardPanelSchema.parse(value)).toEqual(value);
  });
  it.each(['table', 'toplist', 'timeseries'])('rejects crossed %s visual pairing', mode => {
    expect(dashboardPanelSchema.safeParse(panel(mode, mode !== 'timeseries')).success).toBe(false);
  });
  it('rejects raw and metric display options on analytical panels', () => {
    const table = panel('table');
    table.spec.plugin.spec = { density: 'compact' };
    expect(dashboardPanelSchema.safeParse(table).success).toBe(false);
    const chart = panel('timeseries');
    chart.spec.plugin.spec = { metricView: { version: 1 } };
    expect(dashboardPanelSchema.safeParse(chart).success).toBe(false);
  });
});

it('preserves dormant extra measures, selectors and a shifted comparison without using a synthetic runtime window', () => {
  const value = panel('timeseries');
  const query = value.spec.queries[0]!.spec.plugin.spec.query;
  Object.assign(query.analysis, {
    additionalMeasures: [{ function: 'sum', field: 'attribute:value' }],
    comparison: { version: 1, search: ' b ', formula: 'a+b', timeShiftMs: 3600000 }
  });
  Object.assign(query, {
    logGroupSelection: { version: 1, groups: [{ field: 'attribute:key', kind: 'value', value: '2.0' }] },
    logNumericRange: { version: 1, field: 'attribute:value', min: -1.5, max: 4 }
  });
  expect(dashboardPanelSchema.parse(value)).toEqual(value);
});
it.each([
  {
    additionalMeasures: [
      { function: 'sum', field: 'attribute:value' },
      { function: 'sum', field: 'attribute:value' }
    ]
  },
  { intervalMs: 2000 },
  { comparison: { version: 1, search: '', formula: 'c+1' } },
  { comparison: { version: 1, search: '', timeShiftMs: 123 } },
  { measure: { function: 'count' } },
  { unexpected: true }
])('rejects invalid or noncanonical retained analysis', changes => {
  const value = panel('timeseries');
  Object.assign(value.spec.queries[0]!.spec.plugin.spec.query.analysis, changes);
  expect(dashboardPanelSchema.safeParse(value).success).toBe(false);
});
it('rejects malformed return-view and oversized encoded view without rewriting raw columns', () => {
  const value = panel('table');
  const view = value.spec.queries[0]!.spec.plugin.spec.query.returnView;
  Object.assign(view, { extra: true });
  expect(dashboardPanelSchema.safeParse(value).success).toBe(false);
  const oversized = panel('table');
  Object.assign(oversized.spec.queries[0]!.spec.plugin.spec.query.returnView, {
    columns: [
      { kind: 'message' },
      { kind: 'field', scope: 'attributes', path: Array.from({ length: 8 }, () => 'x'.repeat(256)) },
      { kind: 'field', scope: 'resource', path: Array.from({ length: 8 }, () => 'y'.repeat(256)) },
      { kind: 'field', scope: 'resource', path: Array.from({ length: 8 }, () => 'z'.repeat(256)) }
    ]
  });
  expect(dashboardPanelSchema.safeParse(oversized).success).toBe(false);
});
it.each(['severity', 'traceId', 'spanId'])('rejects noncanonical %s while preserving search whitespace', field => {
  const value = panel('table');
  Object.assign(value.spec.queries[0]!.spec.plugin.spec.query, { [field]: ' value ' });
  expect(dashboardPanelSchema.safeParse(value).success).toBe(false);
});
