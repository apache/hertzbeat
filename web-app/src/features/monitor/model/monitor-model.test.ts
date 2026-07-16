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

import { buildMonitorActionPath, buildMonitorListPath, buildMonitorRoutePath, monitorAppOptions, monitorSelectionScope, monitorStatusKey, parseMonitorTimestamp, reconcileMonitorSelection, safeMonitorReturnTo, readMonitorQuery } from './monitor-model';

describe('monitor list model', () => {
  it('normalizes unsupported pagination and keeps explicit filters', () => {
    const query = readMonitorQuery(new URLSearchParams('search=mysql&app=mysql&status=2&pageIndex=-1&pageSize=99'));

    expect(query).toEqual({ search: 'mysql', app: 'mysql', status: '2', labels: '', pageIndex: 0, pageSize: 10 });
    expect(buildMonitorListPath(query)).toBe('/api/monitors?pageIndex=0&pageSize=10&search=mysql&app=mysql&status=2');
  });

  it('omits the all-status sentinel from backend requests', () => {
    expect(buildMonitorListPath({ search: '', app: '', status: '9', labels: '', pageIndex: 1, pageSize: 20 }))
      .toBe('/api/monitors?pageIndex=1&pageSize=20');
  });

  it('preserves label drilldown in monitor requests', () => {
    const query = readMonitorQuery(new URLSearchParams('labels=env%3Aprod'));
    expect(query.labels).toBe('env:prod');
    expect(buildMonitorListPath(query)).toContain('labels=env%3Aprod');
  });

  it('maps established monitor states without inventing health', () => {
    expect(monitorStatusKey(0)).toBe('monitor.status.paused');
    expect(monitorStatusKey(1)).toBe('monitor.status.available');
    expect(monitorStatusKey(2)).toBe('monitor.status.unavailable');
    expect(monitorStatusKey(8)).toBe('monitor.status.unknown');
  });

  it('keeps monitor templates even when they are hidden from the settings menu', () => {
    expect(monitorAppOptions([
      { category: 'http', value: 'website', label: 'Website', },
      { category: 'auto', value: 'prometheus', label: 'Prometheus' },
      { category: '__system__', value: 'internal', label: 'Internal' }
    ])).toEqual([{ value: 'website', label: 'Website' }]);
  });

  it('builds established copy, enable, pause, and delete action paths', () => {
    expect(buildMonitorActionPath('copy', [7])).toBe('/api/monitor/copy/7');
    expect(buildMonitorActionPath('enable', [7, 8])).toBe('/api/monitors/manage?ids=7&ids=8');
    expect(buildMonitorActionPath('pause', [7, 8])).toBe('/api/monitors/manage?ids=7&ids=8&type=JSON');
    expect(buildMonitorActionPath('delete', [7, 8])).toBe('/api/monitors?ids=7&ids=8');
  });

  it('rejects copy without exactly one monitor id', () => {
    expect(() => buildMonitorActionPath('copy', [])).toThrow();
    expect(() => buildMonitorActionPath('copy', [7, 8])).toThrow();
  });

  it('accepts backend ISO timestamps without crashing table rendering', () => {
    expect(parseMonitorTimestamp('2026-07-13T10:26:18.824226')).toBe(Date.parse('2026-07-13T10:26:18.824226'));
    expect(parseMonitorTimestamp(null)).toBeUndefined();
  });

  it('preserves list query context for detail and edit navigation', () => {
    expect(buildMonitorRoutePath(7, 'view', '/monitors?app=website&pageIndex=2')).toBe('/monitors/7?returnTo=%2Fmonitors%3Fapp%3Dwebsite%26pageIndex%3D2');
    expect(buildMonitorRoutePath(7, 'edit', '/monitors?status=2')).toBe('/monitors/7/edit?returnTo=%2Fmonitors%3Fstatus%3D2');
    expect(safeMonitorReturnTo('/monitors?app=website')).toBe('/monitors?app=website');
    expect(safeMonitorReturnTo('https://example.com')).toBe('/monitors');
  });

  it('keeps bulk selection inside one query scope and visible row set', () => {
    const base = readMonitorQuery(new URLSearchParams('search=checkout&pageIndex=0&pageSize=10'));
    const filtered = readMonitorQuery(new URLSearchParams('search=orders&pageIndex=0&pageSize=10'));
    const paged = readMonitorQuery(new URLSearchParams('search=checkout&pageIndex=1&pageSize=10'));
    const scope = monitorSelectionScope(base);
    const selection = { scope, ids: [7, 8, 7] };

    expect(monitorSelectionScope(filtered)).not.toBe(scope);
    expect(monitorSelectionScope(paged)).not.toBe(scope);
    expect(reconcileMonitorSelection(selection, scope, [8, 9])).toEqual([8]);
    expect(reconcileMonitorSelection(selection, monitorSelectionScope(filtered), [7, 8])).toEqual([]);
    expect(reconcileMonitorSelection(selection, monitorSelectionScope(paged), [7, 8])).toEqual([]);
  });

  it('preserves the existing selection reference when reconciliation makes no change', () => {
    const query = readMonitorQuery(new URLSearchParams('search=checkout&pageIndex=0&pageSize=10'));
    const ids = [7, 8];
    const selection = { scope: monitorSelectionScope(query), ids };

    expect(reconcileMonitorSelection(selection, selection.scope, [7, 8, 9])).toBe(ids);
  });
});
