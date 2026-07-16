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

import { loadMonitorApps, loadMonitors, MonitorContractError, type MonitorQuery } from './monitor-api';
import { monitorAppOptions } from '../model/monitor-model';

const query: MonitorQuery = { search: '', app: '', status: '9', labels: '', pageIndex: 0, pageSize: 10 };
const row = { id: 7, name: 'checkout', app: 'website', instance: 'prod', status: 1, gmtUpdate: 0, ignored: true };
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
