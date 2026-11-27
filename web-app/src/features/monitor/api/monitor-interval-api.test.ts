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

import { describe, expect, it, vi } from 'vitest';

import { apiMessagePut } from '@/core/http/api-message';

import { updateMonitorIntervals } from './monitor-interval-api';

vi.mock('@/core/http/api-message', () => ({ apiMessagePut: vi.fn() }));

describe('batch interval updates', () => {
  const signal = new AbortController().signal;
  it('sends IDs in the body and retains each per-monitor outcome', async () => {
    const result = { updated: [1], cron: [2], failed: [3] };
    vi.mocked(apiMessagePut).mockResolvedValue(result);
    await expect(updateMonitorIntervals([1, 2, 3], 30, signal)).resolves.toEqual(result);
    expect(apiMessagePut).toHaveBeenCalledWith('/api/monitors/interval', { ids: [1, 2, 3], intervals: 30 }, { signal });
  });

  it.each([
    { updated: [1], cron: [], failed: [] },
    { updated: [1], cron: [1], failed: [] },
    { updated: [1], cron: [], failed: [3] }
  ])('rejects incomplete or unrelated acknowledgements', async result => {
    vi.mocked(apiMessagePut).mockResolvedValue(result);
    await expect(updateMonitorIntervals([1, 2], 30, signal)).rejects.toThrow();
  });
});
