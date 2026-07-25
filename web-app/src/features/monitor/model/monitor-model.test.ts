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
  buildMonitorRoutePath,
  monitorAppOptions,
  monitorSelectionScope,
  monitorStatusKey,
  parseMonitorTimestamp,
  readMonitorQuery,
  reconcileMonitorSelection,
  safeMonitorReturnTo,
  writeMonitorQuery
} from './monitor-model';

describe('monitor list model', () => {
  it('normalizes unsupported pagination and keeps explicit filters', () => {
    const query = readMonitorQuery(new URLSearchParams('search=mysql&app=mysql&status=2&pageIndex=-1&pageSize=99'));

    expect(query).toEqual({
      search: 'mysql',
      app: 'mysql',
      status: '2',
      labels: '',
      sort: null,
      order: null,
      pageIndex: 0,
      pageSize: 10
    });
    expect(writeMonitorQuery(query).toString()).toBe('pageIndex=0&pageSize=10&search=mysql&app=mysql&status=2');
  });

  it.each(['1tail', '1.5', '9007199254740992'])('rejects a non-canonical page index %s', pageIndex => {
    expect(readMonitorQuery(new URLSearchParams({ pageIndex })).pageIndex).toBe(0);
  });

  it('rejects a page-size prefix instead of silently accepting it', () => {
    expect(readMonitorQuery(new URLSearchParams({ pageSize: '20tail' })).pageSize).toBe(10);
  });

  it('rejects unknown status filters instead of forwarding them to the backend', () => {
    expect(readMonitorQuery(new URLSearchParams({ status: 'healthy' })).status).toBe('9');
  });

  it('omits the all-status sentinel from backend requests', () => {
    expect(
      writeMonitorQuery({
        search: '',
        app: '',
        status: '9',
        labels: '',
        sort: null,
        order: null,
        pageIndex: 1,
        pageSize: 20
      }).toString()
    ).toBe('pageIndex=1&pageSize=20');
  });

  it('preserves label drilldown in monitor requests', () => {
    const query = readMonitorQuery(new URLSearchParams('labels=env%3Aprod'));
    expect(query.labels).toBe('env:prod');
    expect(writeMonitorQuery(query).toString()).toContain('labels=env%3Aprod');
  });

  it('keeps only a complete allowlisted server sort pair', () => {
    const sorted = readMonitorQuery(new URLSearchParams('sort=name&order=asc&pageIndex=2'));
    expect(sorted).toMatchObject({ sort: 'name', order: 'asc', pageIndex: 2 });
    expect(writeMonitorQuery(sorted).toString()).toContain('sort=name&order=asc');

    expect(readMonitorQuery(new URLSearchParams('sort=name')).sort).toBeNull();
    expect(readMonitorQuery(new URLSearchParams('sort=private&order=desc')).sort).toBeNull();
    expect(readMonitorQuery(new URLSearchParams('sort=status&order=sideways')).sort).toBeNull();
  });

  it('maps established monitor states without inventing health', () => {
    expect(monitorStatusKey(0)).toBe('monitor.status.paused');
    expect(monitorStatusKey(1)).toBe('monitor.status.available');
    expect(monitorStatusKey(2)).toBe('monitor.status.unavailable');
    expect(monitorStatusKey(8)).toBe('monitor.status.unknown');
  });

  it('keeps hide=true apps available for creation while excluding system and invalid apps', () => {
    expect(
      monitorAppOptions([
        { category: 'http', value: 'website', label: 'Website' },
        { category: 'auto', value: 'prometheus', label: 'Prometheus' },
        { category: '__system__', value: 'internal', label: 'Internal' },
        { category: 'database', value: 'mysql', label: 'MySQL', hide: true },
        { category: 'http', value: '', label: 'Invalid' }
      ])
    ).toEqual([
      { value: 'website', label: 'Website' },
      { value: 'prometheus', label: 'Prometheus' },
      { value: 'mysql', label: 'MySQL' }
    ]);
  });

  it('accepts backend ISO timestamps without crashing table rendering', () => {
    expect(parseMonitorTimestamp('2026-07-13T10:26:18.824226')).toBe(Date.parse('2026-07-13T10:26:18.824226'));
    expect(parseMonitorTimestamp(null)).toBeUndefined();
  });

  it('preserves list query context for detail and edit navigation', () => {
    expect(buildMonitorRoutePath(7, 'view', '/monitors?app=website&pageIndex=2')).toBe(
      '/monitors/7?returnTo=%2Fmonitors%3Fapp%3Dwebsite%26pageIndex%3D2'
    );
    expect(buildMonitorRoutePath(7, 'edit', '/monitors?status=2')).toBe(
      '/monitors/7/edit?returnTo=%2Fmonitors%3Fstatus%3D2'
    );
    expect(safeMonitorReturnTo('/monitors?app=website')).toBe('/monitors?app=website');
    expect(safeMonitorReturnTo('https://example.com')).toBe('/monitors');
    expect(safeMonitorReturnTo('/monitors-evil')).toBe('/monitors');
    expect(safeMonitorReturnTo('/monitors/7')).toBe('/monitors');
    expect(safeMonitorReturnTo('/monitors#selection')).toBe('/monitors');
  });

  it('keeps only normalized monitor filters in return paths', () => {
    expect(safeMonitorReturnTo('/monitors?app=website&token=private-token&credential=private-credential')).toBe(
      '/monitors?app=website'
    );
    expect(safeMonitorReturnTo('/monitors?search=%20mysql%20&status=2&pageIndex=2&pageSize=20&unknown=value')).toBe(
      '/monitors?search=mysql&status=2&pageIndex=2&pageSize=20'
    );
    expect(safeMonitorReturnTo('/monitors?app=website#token=private-token')).toBe('/monitors?app=website');

    const routePath = buildMonitorRoutePath(
      7,
      'view',
      '/monitors?app=website&token=private-token#credential=private-credential'
    );
    const returnTo = new URL(routePath, 'https://hertzbeat.local').searchParams.get('returnTo');
    expect(returnTo).toBe('/monitors?app=website');
    expect(routePath).not.toContain('private-token');
    expect(routePath).not.toContain('private-credential');
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
