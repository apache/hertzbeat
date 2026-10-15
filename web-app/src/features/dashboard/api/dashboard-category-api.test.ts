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
import { apiMessageGet } from '@/core/http/api-message';
import { loadDashboardCategorySummary } from './dashboard-category-api';
vi.mock('@/core/http/api-message', () => ({ apiMessageGet: vi.fn() }));
describe('dashboard summary read contract', () => {
  beforeEach(() => {
    vi.mocked(apiMessageGet).mockReset();
  });
  it('reads the existing summary endpoint and passes cancellation', async () => {
    const signal = new AbortController().signal;
    vi.mocked(apiMessageGet).mockResolvedValue({ apps: [] });
    expect(await loadDashboardCategorySummary(signal)).toEqual({ apps: [] });
    expect(apiMessageGet).toHaveBeenCalledWith('/api/summary', { signal });
  });
  it('normalizes the backend null apps response when no monitors exist', async () => {
    vi.mocked(apiMessageGet).mockResolvedValue({ apps: null });
    expect(await loadDashboardCategorySummary()).toEqual({ apps: [] });
  });
  it.each([null, {}, { apps: 'invalid' }, { apps: [{}] }, { apps: [{ category: 'db', app: 'mysql', size: -1 }] }])(
    'rejects malformed evidence rather than displaying healthy zero counts',
    async value => {
      vi.mocked(apiMessageGet).mockResolvedValue(value);
      await expect(loadDashboardCategorySummary()).rejects.toThrow();
    }
  );
  it('preserves transport failures', async () => {
    const failure = new Error('permission denied');
    vi.mocked(apiMessageGet).mockRejectedValue(failure);
    await expect(loadDashboardCategorySummary()).rejects.toBe(failure);
  });
});
