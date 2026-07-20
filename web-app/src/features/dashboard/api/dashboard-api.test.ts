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
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  ...http
}));

import { ApiMessageError } from '@/core/http/api-message';
import { loadDashboardAlertSummary, loadDashboardSummary } from './dashboard-api';
import { DashboardContractError } from '../model/dashboard-model';

describe('dashboard API', () => {
  beforeEach(() => vi.clearAllMocks());
  it('reads both endpoints as unknown with the shared abort signal', async () => {
    const signal = new AbortController().signal;
    http.apiMessageGet.mockResolvedValueOnce({ apps: [] }).mockResolvedValueOnce({
      total: 0,
      dealNum: 0,
      rate: 100,
      priorityWarningNum: 0,
      priorityCriticalNum: 0,
      priorityEmergencyNum: 0
    });
    await expect(loadDashboardSummary(signal)).resolves.toEqual({ apps: [] });
    await expect(loadDashboardAlertSummary(signal)).resolves.toMatchObject({ total: 0 });
    expect(http.apiMessageGet).toHaveBeenNthCalledWith(1, '/api/summary', { signal });
    expect(http.apiMessageGet).toHaveBeenNthCalledWith(2, '/api/alerts/summary', { signal });
  });
  it('rejects malformed payloads instead of manufacturing zeros', async () => {
    http.apiMessageGet.mockResolvedValueOnce({ apps: null }).mockResolvedValueOnce({});
    await expect(loadDashboardSummary()).resolves.toEqual({ apps: null });
    await expect(loadDashboardAlertSummary()).rejects.toBeInstanceOf(DashboardContractError);
  });

  it('normalizes transport failures from both endpoints before leaving the API', async () => {
    http.apiMessageGet.mockRejectedValueOnce(new ApiMessageError('private summary failure', { status: 503 }));
    await expect(loadDashboardSummary()).rejects.toMatchObject({ kind: 'unavailable' });

    http.apiMessageGet.mockRejectedValueOnce(new ApiMessageError('private alert failure', { status: 400 }));
    await expect(loadDashboardAlertSummary()).rejects.toMatchObject({ kind: 'error' });
  });
});
