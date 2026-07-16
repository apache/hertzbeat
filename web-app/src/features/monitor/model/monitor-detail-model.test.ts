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

import {
  buildFavoriteMetricPath, buildHistoryMetricPath, buildMetricCatalogPath, buildRealtimeMetricPath,
  monitorHistoryRows, monitorMetricOptions, monitorRealtimeRows, parseMonitorRouteId
} from './monitor-detail-model';

describe('monitor detail model', () => {
  const monitor = { id: 7, app: 'website', name: 'home', instance: 'example.com:443', status: 1 };

  it('extracts visible numeric metric fields', () => {
    expect(monitorMetricOptions([
      { name: 'summary', fields: [{ field: 'responseTime', type: 0, unit: 'ms' }, { field: 'status', type: 1 }] },
      { name: 'hidden', visible: false, fields: [{ field: 'value', type: 0 }] }
    ])).toEqual([{ key: 'summary.responseTime', group: 'summary', field: 'responseTime', unit: 'ms' }]);
  });

  it('builds realtime, favorite, and history paths from master contracts', () => {
    const metric = { key: 'summary.responseTime', group: 'summary', field: 'responseTime', unit: 'ms' };
    expect(buildRealtimeMetricPath(7, metric.key)).toBe('/api/monitor/7/metrics/summary.responseTime');
    expect(buildFavoriteMetricPath(7, metric.key)).toBe('/api/metrics/favorite/7/summary.responseTime');
    expect(buildHistoryMetricPath(monitor, metric, '6h')).toBe('/api/monitor/example.com%3A443/metric/website.summary.responseTime?history=6h&interval=false');
    expect(buildMetricCatalogPath(monitor)).toBe('/api/apps/website/define');
  });

  it('normalizes realtime and history values into inspectable rows', () => {
    expect(monitorRealtimeRows({ valueRows: [{ labels: { host: 'a' }, values: [{ origin: '12', time: 1000 }] }] }))
      .toEqual([{ key: '0:0', labels: { host: 'a' }, value: '12', time: 1000 }]);
    expect(monitorHistoryRows({ values: { 'host=a': [{ mean: '11', time: 1000 }] } }))
      .toEqual([{ key: 'host=a:0', series: 'host=a', value: '11', time: 1000 }]);
  });

  it('accepts only positive safe route ids', () => {
    expect(parseMonitorRouteId('7')).toBe(7);
    expect(parseMonitorRouteId('0')).toBeUndefined();
    expect(parseMonitorRouteId('7.5')).toBeUndefined();
    expect(parseMonitorRouteId('9007199254740992')).toBeUndefined();
  });
});
