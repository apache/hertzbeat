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
import type { MetricConsole } from '@/features/explore';
import { dashboardMetricPreview } from './dashboard-metric-preview';
function consoleFor(start = 1000): MetricConsole {
  return {
    context: {
      entityId: null,
      entityType: null,
      entityName: null,
      serviceName: null,
      serviceNamespace: null,
      environment: null,
      operationName: null,
      start,
      end: 2000
    },
    query: 'metric',
    datasource: 'greptime',
    queryMode: 'scalar',
    results: {
      refId: 'a',
      status: 200,
      msg: null,
      frames: [
        {
          schema: {
            fields: [
              { name: 'timestamp', type: 'time', unit: null },
              { name: 'value', type: 'number', unit: null }
            ],
            labels: { __name__: 'metric' },
            meta: {}
          },
          data: [
            [1000, 12],
            [2000, 16]
          ]
        }
      ]
    },
    stats: { totalSeries: 1, nonEmptySeries: 1, latestObservedAt: 2000 },
    emptyStateReason: null,
    errorMessage: null
  };
}
describe('favorite metric preview', () => {
  it('retains an unknown unit without inventing percent or rate semantics', () => {
    const data = dashboardMetricPreview(consoleFor(), 1000, 2000);
    expect(data.kind).toBe('ready');
    if (data.kind === 'ready') expect(data.series[0]?.unit).toBeUndefined();
  });
  it('refuses data from a different exact window', () => {
    expect(dashboardMetricPreview(consoleFor(500), 1000, 2000)).toEqual({ kind: 'unavailable' });
  });
  it('does not present partial composition results as a successful preview', () => {
    const data = consoleFor();
    data.composition = {
      plan: { version: 1, queries: [{ refId: 'a', metric: 'metric' }], formulas: [] },
      sources: [{ refId: 'a', state: 'error', series: [] }],
      formulas: []
    };
    expect(dashboardMetricPreview(data, 1000, 2000)).toEqual({ kind: 'unavailable' });
  });
});
