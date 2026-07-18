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

import { MonitorContractError } from './monitor-contract';
import {
  parseFavoriteMetrics,
  parseHistoryMetric,
  parseMonitorMetricCatalog,
  parseRealtimeMetric
} from './monitor-metric-schema';

describe('Monitor metric read schemas', () => {
  it('maps valid favorites and catalog evidence while stripping unknown fields', () => {
    expect(parseFavoriteMetrics(['summary.responseTime'])).toEqual(['summary.responseTime']);
    expect(parseMonitorMetricCatalog({
      metrics: [{
        name: 'summary',
        visible: true,
        fields: [{ type: 0, field: 'responseTime', unit: 'ms', label: false, ignored: true }],
        ignored: true
      }],
      ignored: true
    })).toEqual({ metrics: [{
      name: 'summary',
      visible: true,
      fields: [{ type: 0, field: 'responseTime', unit: 'ms', label: false }]
    }] });
  });

  it('preserves canonical realtime no-data and nullable value fields', () => {
    expect(parseRealtimeMetric(null, 7, 'summary')).toEqual({ fields: [], valueRows: [] });
    expect(parseRealtimeMetric(undefined, 7, 'summary')).toEqual({ fields: [], valueRows: [] });
    expect(parseRealtimeMetric(realtimeWire(), 7, 'summary')).toEqual({
      fields: [{ name: 'responseTime', type: 0, unit: 'ms', label: false }],
      valueRows: [{
        labels: { host: 'checkout-a' },
        values: [{ origin: '12', mean: null, median: null, min: null, max: null, time: 0 }]
      }]
    });
  });

  it('maps history only after monitor, metric, and numeric-field identity match', () => {
    expect(parseHistoryMetric(historyWire(), 'prod', 'summary', 'responseTime')).toEqual({
      values: { series: [{ origin: null, mean: '11', median: null, min: null, max: null, time: 0 }] }
    });
  });

  it.each([
    () => parseFavoriteMetrics(null),
    () => parseMonitorMetricCatalog({}),
    () => parseMonitorMetricCatalog({ metrics: null }),
    () => parseRealtimeMetric({ ...realtimeWire(), app: undefined }, 7, 'summary'),
    () => parseRealtimeMetric({ ...realtimeWire(), id: 8 }, 7, 'summary'),
    () => parseRealtimeMetric({ ...realtimeWire(), metrics: 'other' }, 7, 'summary'),
    () => parseRealtimeMetric({ ...realtimeWire(), fields: [realtimeWire().fields[0], realtimeWire().fields[0]] }, 7, 'summary'),
    () => parseRealtimeMetric({ ...realtimeWire(), valueRows: [{ labels: {}, values: [] }] }, 7, 'summary'),
    () => parseRealtimeMetric({ ...realtimeWire(), fields: [{ ...realtimeWire().fields[0], type: 128 }] }, 7, 'summary'),
    () => parseHistoryMetric({ ...historyWire(), instance: 'other' }, 'prod', 'summary', 'responseTime'),
    () => parseHistoryMetric({ ...historyWire(), metrics: 'other' }, 'prod', 'summary', 'responseTime'),
    () => parseHistoryMetric({ ...historyWire(), field: { ...historyWire().field, name: 'other' } }, 'prod', 'summary', 'responseTime'),
    () => parseHistoryMetric({ ...historyWire(), field: { ...historyWire().field, type: 1 } }, 'prod', 'summary', 'responseTime'),
    () => parseHistoryMetric({ ...historyWire(), field: { ...historyWire().field, type: 128 } }, 'prod', 'summary', 'responseTime'),
    () => parseHistoryMetric({ ...historyWire(), app: undefined }, 'prod', 'summary', 'responseTime')
  ])('rejects missing, identity, uniqueness, width, and Java-byte violations %#', parse => {
    expect(parse).toThrow(MonitorContractError);
  });

  it('sanitizes Zod failures behind the stable Monitor contract error', () => {
    let error: unknown;
    try {
      parseRealtimeMetric({ ...realtimeWire(), fields: [{ privateWire: 'must-not-leak' }] }, 7, 'summary');
    } catch (reason) {
      error = reason;
    }
    expect(error).toBeInstanceOf(MonitorContractError);
    expect(error).not.toHaveProperty('issues');
    expect(JSON.stringify(error)).not.toContain('must-not-leak');
  });
});

function realtimeWire() {
  return {
    id: 7,
    app: 'website',
    metrics: 'summary',
    time: 0,
    fields: [{ name: 'responseTime', type: 0, unit: 'ms', label: false }],
    valueRows: [{
      labels: { host: 'checkout-a' },
      values: [{ origin: '12', mean: null, median: null, min: null, max: null, time: 0 }]
    }]
  };
}

function historyWire() {
  return {
    instance: 'prod',
    app: null,
    metrics: 'summary',
    field: { name: 'responseTime', type: 0, unit: null, label: null },
    values: { series: [{ origin: null, mean: '11', median: null, min: null, max: null, time: 0 }] }
  };
}
