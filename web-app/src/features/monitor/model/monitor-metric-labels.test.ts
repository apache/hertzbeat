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
  monitorFieldLabel,
  monitorGroupLabel,
  monitorHistoryLabel,
  selectMonitorMetricLabels
} from './monitor-metric-labels';

describe('monitor metric display labels', () => {
  it('selects only the exact application metric namespace without changing keys', () => {
    const labels = selectMonitorMetricLabels('website', {
      'monitor.app.website.metrics.summary': ' Summary ',
      'monitor.app.website.metrics.summary.metric.responseTime': 'Response Time',
      'monitor.app.website.help': 'Help',
      'monitor.app.website_other.metrics.summary': 'Other',
      'monitor.app.redis.metrics.summary': 'Redis'
    });
    expect(labels).toEqual({ summary: 'Summary', 'summary.metric.responseTime': 'Response Time' });
    expect(monitorGroupLabel(labels, 'summary')).toBe('Summary');
    expect(monitorFieldLabel(labels, 'summary', 'responseTime')).toBe('Response Time');
    expect(monitorHistoryLabel(labels, { key: 'summary.responseTime', group: 'summary', field: 'responseTime' })).toBe(
      'Summary / Response Time'
    );
  });

  it('falls back for missing, blank, self-referencing or inherited translations', () => {
    const labels = selectMonitorMetricLabels('website', {
      'monitor.app.website.metrics.summary': ' ',
      'monitor.app.website.metrics.summary.metric.responseTime':
        'monitor.app.website.metrics.summary.metric.responseTime'
    });
    expect(monitorGroupLabel(labels, 'summary')).toBe('summary');
    expect(monitorGroupLabel(labels, 'constructor')).toBe('constructor');
    expect(monitorFieldLabel(labels, 'summary', 'responseTime')).toBe('responseTime');
    expect(monitorHistoryLabel(labels, { key: 'summary.responseTime', group: 'summary', field: 'responseTime' })).toBe(
      'summary.responseTime'
    );
    expect(monitorFieldLabel(undefined, undefined, 'custom.value')).toBe('custom.value');
    expect(selectMonitorMetricLabels(undefined, {})).toEqual({});
  });

  it('keeps fields scoped to their group and supports literal dots in identities', () => {
    const labels = selectMonitorMetricLabels('custom', {
      'monitor.app.custom.metrics.first.metric.value': 'First value',
      'monitor.app.custom.metrics.second.metric.value': 'Second value',
      'monitor.app.custom.metrics.http.server.metric.status.code': 'HTTP status'
    });
    expect(monitorFieldLabel(labels, 'first', 'value')).toBe('First value');
    expect(monitorFieldLabel(labels, 'second', 'value')).toBe('Second value');
    expect(monitorFieldLabel(labels, 'http.server', 'status.code')).toBe('HTTP status');
  });
});
