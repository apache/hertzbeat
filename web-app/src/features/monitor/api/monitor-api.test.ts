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

import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...await importOriginal<typeof import('@/core/http/api-message')>(), apiMessageGet: http.apiMessageGet
}));

import { ApiMessageError } from '@/core/http/api-message';

import {
  classifyMonitorDetailReadError, classifyMonitorMetricReadError, loadFavoriteMetrics, loadHistoryMetric,
  loadMonitorApps, loadMonitorDetail, loadMonitorMetricCatalog, loadMonitors, loadRealtimeMetric,
  MonitorContractError, MonitorMissingError, type MonitorQuery
} from './monitor-api';
import { monitorAppOptions } from '../model/monitor-model';

const query: MonitorQuery = { search: '', app: '', status: '9', labels: '', pageIndex: 0, pageSize: 10 };
const row = { id: 7, name: 'checkout', app: 'website', instance: 'prod', status: 1, gmtUpdate: 0, ignored: true };
const detailRow = { ...row, jobId: 9, type: 2, scrape: null, intervals: null, scheduleType: null,
  cronExpression: null, labels: null, annotations: { team: 'platform' }, description: null,
  creator: 'alice', modifier: 'bob', gmtCreate: null };
const page = { content: [row], totalElements: 1, totalPages: 1, number: 0, size: 10 };

describe('monitor list API contracts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('forwards AbortSignal and strips unknown monitor fields', async () => {
    const signal = new AbortController().signal;
    http.apiMessageGet.mockResolvedValue(page);
    await expect(loadMonitors(query, signal)).resolves.toEqual({ ...page, content: [{
      id: 7, name: 'checkout', app: 'website', instance: 'prod', status: 1, gmtUpdate: 0
    }] });
    expect(http.apiMessageGet).toHaveBeenCalledWith('/api/monitors?pageIndex=0&pageSize=10', { signal });
  });

  it.each([
    null, {}, { ...page, content: null }, { ...page, totalElements: -1 }, { ...page, number: 1 },
    { ...page, size: 20 }, { ...page, content: [{ ...row, id: 1.5 }] },
    { ...page, content: [{ ...row, name: '' }] }, { ...page, content: [{ ...row, status: '1' }] },
    { ...page, content: [{ ...row, gmtUpdate: {} }] }
  ])('rejects malformed page evidence %#', async value => {
    http.apiMessageGet.mockResolvedValue(value);
    await expect(loadMonitors(query)).rejects.toBeInstanceOf(MonitorContractError);
  });

  it('parses application evidence without turning malformed data into empty options', async () => {
    const signal = new AbortController().signal;
    http.apiMessageGet.mockResolvedValue([{ category: 'http', value: 'website', label: 'Website', hide: false, ignored: 1 }]);
    await expect(loadMonitorApps(signal)).resolves.toEqual([{ category: 'http', value: 'website', label: 'Website', hide: false }]);
    expect(http.apiMessageGet).toHaveBeenCalledWith('/api/apps/hierarchy', { signal });
    for (const malformed of [null, {}, [{ category: 1, value: 'website', label: 'Website' }],
      [{ category: 'http', value: '', label: 'Website' }], [{ category: 'http', value: 'website', label: 1 }]]) {
      http.apiMessageGet.mockResolvedValueOnce(malformed);
      await expect(loadMonitorApps()).rejects.toBeInstanceOf(MonitorContractError);
    }
  });

  it('accepts nullable hierarchy metadata and falls back to the required value label', async () => {
    http.apiMessageGet.mockResolvedValue([{ value: 'custom', category: null, label: null, hide: null }]);
    const apps = await loadMonitorApps();
    expect(apps).toEqual([{ value: 'custom', category: null, label: null, hide: null }]);
    expect(monitorAppOptions(apps)).toEqual([{ value: 'custom', label: 'custom' }]);
  });
});

describe('monitor detail API contracts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('forwards AbortSignal and allowlists the full editor-compatible detail shape', async () => {
    const signal = new AbortController().signal;
    http.apiMessageGet.mockResolvedValue({
      monitor: { ...detailRow, intervals: 60, scheduleType: 'interval', cronExpression: null,
        description: 'Home page', scrape: 'static', labels: { env: 'prod' }, ignored: true },
      params: [{ id: 4, monitorId: 7, field: 'host', type: 1, paramValue: null,
        gmtCreate: 0, gmtUpdate: null, ignored: true }],
      collector: null,
      grafanaDashboard: { monitorId: 7, folderUid: null, slug: 'home', status: null, uid: 'abc',
        url: null, version: 2, enabled: true, template: null, ignored: true },
      metrics: [{ name: 'summary', favorited: false, fields: [{ type: 0 }], ignored: true }],
      ignored: true
    });

    await expect(loadMonitorDetail('7', signal)).resolves.toEqual({
      monitor: { id: 7, jobId: 9, name: 'checkout', app: 'website', instance: 'prod', status: 1, type: 2,
        intervals: 60, scheduleType: 'interval', cronExpression: null, description: 'Home page', scrape: 'static',
        labels: { env: 'prod' }, annotations: { team: 'platform' }, creator: 'alice', modifier: 'bob',
        gmtCreate: null, gmtUpdate: 0 },
      params: [{ id: 4, monitorId: 7, field: 'host', type: 1, paramValue: null,
        gmtCreate: 0, gmtUpdate: null }],
      collector: null,
      grafanaDashboard: { monitorId: 7, folderUid: null, slug: 'home', status: null, uid: 'abc',
        url: null, version: 2, enabled: true, template: null },
      metrics: [{ name: 'summary', favorited: false }]
    });
    expect(http.apiMessageGet).toHaveBeenCalledWith('/api/monitor/7', { signal });
  });

  it('accepts nullable dashboard and collector values from the required envelope', async () => {
    http.apiMessageGet.mockResolvedValue({
      monitor: detailRow, params: [], collector: null, grafanaDashboard: null, metrics: []
    });
    await expect(loadMonitorDetail(7)).resolves.toMatchObject({
      monitor: { id: 7 }, params: [], collector: null, grafanaDashboard: null, metrics: []
    });
  });

  it.each([
    null, {}, { monitor: null },
    { monitor: { ...detailRow, id: 8 }, params: [], collector: null, grafanaDashboard: null, metrics: [] },
    { monitor: { ...detailRow, intervals: '60' }, params: [], collector: null, grafanaDashboard: null, metrics: [] },
    { monitor: detailRow, params: [{}], collector: null, grafanaDashboard: null, metrics: [] },
    { monitor: detailRow, params: [], collector: 7, grafanaDashboard: null, metrics: [] },
    { monitor: detailRow, params: [], collector: null, grafanaDashboard: [], metrics: [] },
    { monitor: detailRow, params: [], collector: null,
      grafanaDashboard: { monitorId: 8, folderUid: null, slug: null, status: null, uid: null,
        url: null, version: null, enabled: true, template: null }, metrics: [] },
    { monitor: detailRow, params: [], collector: null, grafanaDashboard: null, metrics: [{ name: '' }] },
    { monitor: detailRow, params: [], collector: null, grafanaDashboard: null,
      metrics: [{ name: 'summary', favorited: 'false' }] }
  ])('rejects missing or malformed detail evidence %#', async value => {
    http.apiMessageGet.mockResolvedValue(value);
    const expected = value === null ? MonitorMissingError : MonitorContractError;
    await expect(loadMonitorDetail(7)).rejects.toBeInstanceOf(expected);
  });

  it('classifies missing, unavailable, and contract detail reads separately', () => {
    expect(classifyMonitorDetailReadError(new ApiMessageError('missing', { status: 404 }))).toBe('missing');
    expect(classifyMonitorDetailReadError(new ApiMessageError('missing', { status: 200, code: 15 }))).toBe('missing');
    expect(classifyMonitorDetailReadError(new ApiMessageError('offline', { status: 503 }))).toBe('unavailable');
    expect(classifyMonitorDetailReadError(new MonitorContractError('bad'))).toBe('error');
  });
});

describe('monitor metric API contracts', () => {
  const monitor = { id: 7, name: 'checkout', app: 'website', instance: 'prod', status: 1 };
  const metric = { key: 'summary.responseTime', group: 'summary', field: 'responseTime', unit: 'ms' };
  beforeEach(() => http.apiMessageGet.mockReset());

  it('strictly parses catalog and favorites and forwards their signals', async () => {
    const signal = new AbortController().signal;
    http.apiMessageGet
      .mockResolvedValueOnce({ metrics: [{ name: 'summary', visible: true,
        fields: [{ type: 0, field: 'responseTime', unit: 'ms', label: false, ignored: true },
          { type: 0, field: 'hostCode', unit: null, label: true }], ignored: true }], ignored: true })
      .mockResolvedValueOnce(['summary.responseTime']);
    await expect(loadMonitorMetricCatalog(monitor, signal)).resolves.toEqual({ metrics: [{ name: 'summary',
      visible: true, fields: [{ type: 0, field: 'responseTime', unit: 'ms', label: false },
        { type: 0, field: 'hostCode', label: true }] }] });
    await expect(loadFavoriteMetrics(7, signal)).resolves.toEqual(['summary.responseTime']);
    expect(http.apiMessageGet).toHaveBeenNthCalledWith(1, '/api/apps/website/define', { signal });
    expect(http.apiMessageGet).toHaveBeenNthCalledWith(2, '/api/metrics/favorite/7', { signal });
  });

  it('strictly parses realtime and history while preserving epoch zero', async () => {
    const signal = new AbortController().signal;
    http.apiMessageGet
      .mockResolvedValueOnce({ id: 7, app: 'website', metrics: 'summary', time: 0,
        fields: [{ name: 'responseTime', type: 0, unit: 'ms', label: false }],
        valueRows: [{ labels: { host: 'a' }, values: [{ origin: '12', mean: null,
        median: null, min: null, max: null, time: 0, ignored: true }], ignored: true }], ignored: true })
      .mockResolvedValueOnce({ instance: 'prod', app: null, metrics: 'summary',
        field: { name: 'responseTime', type: 0, unit: null, label: null },
        values: { 'host=a': [{ origin: null, mean: '11', median: null, min: null,
        max: null, time: 0, ignored: true }] }, ignored: true });
    await expect(loadRealtimeMetric(7, metric, signal)).resolves.toEqual({
      fields: [{ name: 'responseTime', type: 0, unit: 'ms', label: false }], valueRows: [{
      labels: { host: 'a' }, values: [{ origin: '12', mean: null, median: null, min: null, max: null, time: 0 }]
    }] });
    await expect(loadHistoryMetric(monitor, metric, '30m', signal)).resolves.toEqual({ values: {
      'host=a': [{ origin: null, mean: '11', median: null, min: null, max: null, time: 0 }]
    } });
    expect(http.apiMessageGet).toHaveBeenNthCalledWith(1, '/api/monitor/7/metrics/summary', { signal });
  });

  it('maps a canonical realtime no-data response to empty evidence', async () => {
    http.apiMessageGet.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 7, app: 'website', metrics: 'summary', time: 0,
      fields: [{ name: 'responseTime', type: 0, unit: 'ms', label: false }], valueRows: null
    });
    await expect(loadRealtimeMetric(7, metric)).resolves.toEqual({ fields: [], valueRows: [] });
    await expect(loadRealtimeMetric(7, metric)).resolves.toEqual({
      fields: [{ name: 'responseTime', type: 0, unit: 'ms', label: false }], valueRows: []
    });
  });

  it.each([
    ['catalog', null], ['catalog', { metrics: null }], ['favorites', {}], ['favorites', ['']],
    ['catalog', { metrics: [{ name: 'summary', visible: true,
      fields: [{ type: 0, field: 'value', unit: null }] }] }],
    ['realtime', { id: 8, app: 'website', metrics: 'summary', time: 0, fields: [], valueRows: [] }],
    ['realtime', { id: 7, app: 'website', metrics: 'other', time: 0, fields: [], valueRows: [] }],
    ['realtime', { id: 7, app: 'website', metrics: 'summary', time: 0, fields: [],
      valueRows: [{ labels: { host: 1 }, values: [] }] }],
    ['realtime', { id: 7, app: 'website', metrics: 'summary', time: 0,
      fields: [{ name: 'value', type: 0, unit: null, label: false },
        { name: 'value', type: 0, unit: null, label: false }], valueRows: [] }],
    ['realtime', { id: 7, app: 'website', metrics: 'summary', time: 0,
      fields: [{ name: 'value', type: 0, unit: null, label: false }],
      valueRows: [{ labels: {}, values: [] }] }],
    ['realtime', { id: 7, app: 'website', metrics: 'summary', time: 0,
      fields: [{ name: 'responseTime', type: 0, unit: 'ms', label: false }],
      valueRows: [{ labels: {}, values: [{ time: '0' }] }] }],
    ['history', { values: [] }], ['history', { values: { series: [{}] } }]
  ] as const)('rejects malformed %s evidence %#', async (kind, value) => {
    http.apiMessageGet.mockResolvedValue(value);
    const promise = kind === 'catalog' ? loadMonitorMetricCatalog(monitor)
      : kind === 'favorites' ? loadFavoriteMetrics(7)
        : kind === 'realtime' ? loadRealtimeMetric(7, metric)
          : loadHistoryMetric(monitor, metric, '30m');
    await expect(promise).rejects.toBeInstanceOf(MonitorContractError);
  });

  it('classifies storage failure as unavailable and malformed evidence as error', () => {
    expect(classifyMonitorMetricReadError(new ApiMessageError('storage', { status: 200, code: 15 })))
      .toBe('unavailable');
    expect(classifyMonitorMetricReadError(new MonitorContractError('bad'))).toBe('error');
  });
});
