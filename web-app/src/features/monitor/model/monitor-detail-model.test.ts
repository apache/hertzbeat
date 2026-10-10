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

import type { MonitorMetricValue } from './monitor-contract';
import {
  defaultMonitorDetailRefreshSeconds,
  monitorDetailRefreshChoices,
  monitorDetailRefreshInterval,
  monitorHistoryMetrics,
  monitorHistoryRows,
  monitorHistorySeries,
  monitorMetricHistoryRanges,
  monitorMetricHistoryUsesInterval,
  monitorMetricOptions,
  monitorRealtimeGroups,
  monitorRealtimeRows,
  parseMonitorDetailRefresh,
  parseMonitorMetricHistory,
  parseMonitorRouteId,
  safeMonitorGrafanaUrl
} from './monitor-detail-model';

describe('monitor detail model', () => {
  it('keeps exact history wire tokens and Angular-compatible initial interval defaults', () => {
    expect(monitorMetricHistoryRanges).toEqual(['30m', '1h', '6h', '24h', '1W', '4W', '12W']);
    expect(monitorMetricHistoryRanges.map(monitorMetricHistoryUsesInterval)).toEqual([
      false,
      false,
      false,
      false,
      true,
      true,
      true
    ]);
    expect(parseMonitorMetricHistory('12W')).toBe('12W');
    expect(parseMonitorMetricHistory('12w')).toBe('30m');
  });

  it('extracts visible numeric metric fields', () => {
    expect(
      monitorMetricOptions([
        {
          name: 'summary',
          fields: [
            { field: 'responseTime', type: 0, unit: 'ms' },
            { field: 'hostCode', type: 0, label: true },
            { field: 'status', type: 1 }
          ]
        },
        { name: 'hidden', visible: false, fields: [{ field: 'value', type: 0 }] }
      ])
    ).toEqual([{ key: 'summary.responseTime', group: 'summary', field: 'responseTime', unit: 'ms' }]);
  });

  it('keeps only visible numeric fields in history definition order', () => {
    expect(
      monitorHistoryMetrics([
        {
          name: 'summary',
          fields: [
            { field: 'responseTime', type: 0, unit: 'ms' },
            { field: 'host', type: 1 },
            { field: 'code', type: 0, label: true }
          ]
        },
        { name: 'hidden', visible: false, fields: [{ field: 'value', type: 0 }] },
        { name: 'availability', fields: [{ field: 'success', type: 0 }] }
      ])
    ).toEqual([
      { key: 'summary.responseTime', group: 'summary', field: 'responseTime', unit: 'ms' },
      { key: 'availability.success', group: 'availability', field: 'success' }
    ]);
  });

  it('builds raw and interval chart series without inventing numeric points', () => {
    const emptyValue: MonitorMetricValue = {
      origin: null,
      mean: null,
      median: null,
      min: null,
      max: null,
      time: null
    };
    const value = (overrides: Partial<typeof emptyValue> = {}) => ({ ...emptyValue, ...overrides });
    const history = {
      values: {
        'host=a': [
          value({ origin: '12.5', time: 1000 }),
          value({ origin: 'not-a-number', time: 2000 }),
          value({ origin: '13', time: null })
        ]
      }
    };

    expect(monitorHistorySeries(history, false)).toEqual([{ name: 'host=a', points: [[1000, 12.5]] }]);
    expect(
      monitorHistorySeries(
        {
          values: {
            aggregate: [
              value({ mean: '10', min: '8', max: '12', time: 1000 }),
              value({ mean: null, min: null, max: null, time: 2000 })
            ]
          }
        },
        true
      )
    ).toEqual([
      { name: 'Max', points: [[1000, 12]] },
      { name: 'Min', points: [[1000, 8]] },
      { name: 'Mean', points: [[1000, 10]] }
    ]);
    expect(monitorHistorySeries({ values: { aggregate: [value({ time: 2000 })] } }, true)).toEqual([]);
  });

  it('adds one realtime-only representative only when a visible group has no numeric field', () => {
    expect(
      monitorMetricOptions([
        {
          name: 'mixed',
          fields: [
            { field: 'value', type: 0 },
            { field: 'status', type: 1 }
          ]
        },
        {
          name: 'identity',
          fields: [
            { field: 'host', type: 1, label: true },
            { field: 'version', type: 1 },
            { field: 'status', type: 1 }
          ]
        },
        { name: 'labelsOnly', fields: [{ field: 'host', type: 1, label: true }] }
      ])
    ).toEqual([
      { key: 'mixed.value', group: 'mixed', field: 'value' },
      {
        key: 'identity.version',
        group: 'identity',
        field: 'version',
        historySupported: false
      }
    ]);
  });

  it('keeps realtime groups in the backend definition order without collapsing them to one field', () => {
    expect(
      monitorRealtimeGroups([
        { name: 'summary', visible: true, fields: [{ field: 'responseTime', type: 0 }] },
        { name: 'identity', visible: true, fields: [{ field: 'host', type: 1, label: true }] },
        { name: 'summary', visible: true, fields: [{ field: 'status', type: 1 }] },
        { name: 'hidden', visible: false, fields: [{ field: 'value', type: 0 }] }
      ])
    ).toEqual([{ group: 'summary' }, { group: 'identity' }]);
  });

  it('preserves every non-label realtime field as inspectable group evidence', () => {
    const empty = { mean: null, median: null, min: null, max: null };
    expect(
      monitorRealtimeRows({
        time: 2000,
        fields: [
          { name: 'hostCode', type: 1, unit: null, label: true },
          { name: 'responseTime', type: 0, unit: 'ms', label: false },
          { name: 'status', type: 1, unit: null, label: false },
          { name: 'message', type: 1, unit: null, label: false }
        ],
        valueRows: [
          {
            labels: { hostCode: 'a' },
            values: [
              { ...empty, origin: 'a', time: 1000 },
              { ...empty, origin: '12', time: 0 },
              { ...empty, origin: 'UP', time: null },
              { ...empty, origin: null, time: null }
            ]
          }
        ]
      })
    ).toEqual([
      {
        key: '0:responseTime',
        labels: { hostCode: 'a' },
        field: 'responseTime',
        unit: 'ms',
        value: '12',
        time: 0,
        collectedAt: 2000
      },
      {
        key: '0:status',
        labels: { hostCode: 'a' },
        field: 'status',
        unit: null,
        value: 'UP',
        time: 2000,
        collectedAt: 2000
      },
      {
        key: '0:message',
        labels: { hostCode: 'a' },
        field: 'message',
        unit: null,
        value: '—',
        time: 2000,
        collectedAt: 2000
      }
    ]);
    expect(
      monitorRealtimeRows({
        time: null,
        fields: [{ name: 'status', type: 1, unit: null, label: false }],
        valueRows: [
          {
            labels: {},
            values: [{ ...empty, origin: 'UP', time: null }]
          }
        ]
      })
    ).toEqual([
      {
        key: '0:status',
        labels: {},
        field: 'status',
        unit: null,
        value: 'UP',
        time: null,
        collectedAt: null
      }
    ]);
  });

  it('normalizes history values into inspectable rows', () => {
    expect(
      monitorHistoryRows({
        values: { 'host=a': [{ origin: null, mean: '11', median: null, min: null, max: null, time: 1000 }] }
      })
    ).toEqual([{ key: 'host=a:0', series: 'host=a', value: '11', time: 1000 }]);
  });

  it('accepts only positive safe route ids', () => {
    expect(parseMonitorRouteId('7')).toBe(7);
    expect(parseMonitorRouteId('0')).toBeUndefined();
    expect(parseMonitorRouteId('7.5')).toBeUndefined();
    expect(parseMonitorRouteId('9007199254740992')).toBeUndefined();
  });

  it('normalizes detail refresh to the legacy default and one shared allowlist', () => {
    expect(defaultMonitorDetailRefreshSeconds).toBe(90);
    expect(monitorDetailRefreshChoices).toEqual([10, 30, 60, 300, 0]);
    expect(parseMonitorDetailRefresh(null)).toBe(90);
    expect(parseMonitorDetailRefresh('bad')).toBe(90);
    expect(parseMonitorDetailRefresh('90')).toBe(90);
    expect(parseMonitorDetailRefresh('10')).toBe(10);
    expect(parseMonitorDetailRefresh('0')).toBe(0);
    expect(monitorDetailRefreshInterval(90)).toBe(90_000);
    expect(monitorDetailRefreshInterval(0)).toBe(false);
  });

  it.each([
    [null, undefined],
    [{ enabled: false, url: 'https://grafana.example/d/ops' }, undefined],
    [{ enabled: true, url: null }, undefined],
    [{ enabled: true, url: '' }, undefined],
    [{ enabled: true, url: '/d/ops' }, undefined],
    [{ enabled: true, url: 'javascript:alert(1)' }, undefined],
    [{ enabled: true, url: 'data:text/html,unsafe' }, undefined],
    [{ enabled: true, url: 'https://operator:secret@grafana.example/d/ops' }, undefined],
    [{ enabled: true, url: 'https://grafana.example/d/ops?orgId=1' }, 'https://grafana.example/d/ops?orgId=1'],
    [{ enabled: true, url: 'http://grafana.internal/d/ops' }, 'http://grafana.internal/d/ops']
  ])('allows only an explicitly enabled absolute HTTP(S) Grafana URL', (dashboard, expected) => {
    expect(safeMonitorGrafanaUrl(dashboard)).toBe(expected);
  });
});
