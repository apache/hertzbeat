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

import { describe, expect, it, vi } from 'vitest';
import { apiMessageGet } from '@/core/http/api-message';
import { buildSignalApiPath } from './explore-api';
import { buildLogScopeSuggestionPath, loadLogScopeSuggestions } from './explore-log-scope-suggestions';
vi.mock('@/core/http/api-message', () => ({ apiMessageGet: vi.fn() }));
describe('log scope suggestions API', () => {
  it('retains the complete submitted list scope and exact time without pagination', () => {
    const query = {
      signal: 'logs' as const,
      timeRange: 'last-30m' as const,
      query: 'timeout',
      serviceName: 'checkout',
      environment: 'prod',
      severityCategory: 'ERROR' as const,
      severityText: 'SEVERE',
      resourceFilter: 'service.version=1',
      hideNoise: true,
      pageIndex: 3
    };
    const window = { from: 100000, to: 200000 };
    const path = buildLogScopeSuggestionPath(query, window, 'serviceName');
    const expected = new URLSearchParams(
      buildSignalApiPath({ ...query, start: window.from, end: window.to }).split('?')[1]
    );
    expected.delete('pageIndex');
    expected.delete('pageSize');
    expected.set('groupBy', 'service.name');
    expected.set('limit', '20');
    expected.set('orderBy', 'count-desc');
    expect(path).toBe('/api/logs/stats/group-by?' + expected.toString());
  });
  it('rejects wrong dimensions and returns bounded values without unknown or counts', async () => {
    vi.mocked(apiMessageGet).mockResolvedValueOnce({
      groupBy: 'service.name',
      groups: [
        { value: 'checkout', count: 8 },
        { value: 'unknown', count: 900 }
      ]
    });
    expect(await loadLogScopeSuggestions('/api/logs/stats/group-by?groupBy=service.name', 'serviceName')).toEqual([
      'checkout'
    ]);
    vi.mocked(apiMessageGet).mockResolvedValueOnce({ groupBy: 'severity', groups: [] });
    await expect(
      loadLogScopeSuggestions('/api/logs/stats/group-by?groupBy=service.name', 'serviceName')
    ).rejects.toThrow();
  });
});
