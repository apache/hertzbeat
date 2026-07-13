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

import { buildMonitorListPath, monitorAppOptions, monitorStatusKey, readMonitorQuery } from './monitor-model';

describe('monitor list model', () => {
  it('normalizes unsupported pagination and keeps explicit filters', () => {
    const query = readMonitorQuery(new URLSearchParams('search=mysql&app=mysql&status=2&pageIndex=-1&pageSize=99'));

    expect(query).toEqual({ search: 'mysql', app: 'mysql', status: '2', pageIndex: 0, pageSize: 10 });
    expect(buildMonitorListPath(query)).toBe('/api/monitors?pageIndex=0&pageSize=10&search=mysql&app=mysql&status=2');
  });

  it('omits the all-status sentinel from backend requests', () => {
    expect(buildMonitorListPath({ search: '', app: '', status: '9', pageIndex: 1, pageSize: 20 }))
      .toBe('/api/monitors?pageIndex=1&pageSize=20');
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
});
