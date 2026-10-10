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

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiMessageGet } from '@/core/http/api-message';

import { loadEntityRedSignal } from './entity-signal-api';

vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessageGet: vi.fn()
}));

const request = vi.mocked(apiMessageGet);
const window = { from: 1_750_000_000_000, to: 1_750_000_060_000 } as const;

describe('entity RED signal API', () => {
  beforeEach(() => request.mockReset());

  it('loads an exact bounded window through the entity-owned Flow endpoint', async () => {
    const signal = new AbortController().signal;
    request.mockResolvedValue(redResponse());

    await expect(loadEntityRedSignal(7, window, signal)).resolves.toMatchObject({
      state: 'ready',
      source: 'greptime_flow',
      identity: { entityId: '7', serviceName: 'checkout' },
      summary: { requestCount: 120, errorCount: 3 },
      series: [{ timestamp: window.from }]
    });
    expect(request).toHaveBeenCalledWith(`/api/entities/7/signals/red?start=${window.from}&end=${window.to}`, {
      signal
    });
  });

  it.each([
    { state: 'empty', summary: null, series: [] },
    { state: 'unavailable', summary: null, series: [] }
  ] as const)('keeps $state distinct without inventing zero summaries', async override => {
    request.mockResolvedValue(redResponse(override));

    await expect(loadEntityRedSignal(7, window)).resolves.toMatchObject(override);
  });

  it.each([
    { window: { start: window.from + 1, end: window.to } },
    { identity: { ...redResponse().identity, entityId: '8' } },
    { state: 'ready', summary: null },
    { state: 'empty', summary: redResponse().summary },
    { state: 'unavailable', series: [redResponse().series[0]] },
    { series: [{ ...redResponse().series[0], timestamp: window.to }] },
    { source: 'raw_traces' }
  ])('fails closed on contradictory or untrusted RED evidence %#', async override => {
    request.mockResolvedValue(redResponse(override));

    await expect(loadEntityRedSignal(7, window)).rejects.toThrow('Entity RED response is invalid');
  });
});

function redResponse(override: Record<string, unknown> = {}) {
  const sample = {
    requestCount: 120,
    errorCount: 3,
    requestRatePerSecond: 2,
    errorRate: 0.025,
    latencyAverageMs: 84,
    latencyP95Ms: 170
  };
  return {
    state: 'ready',
    source: 'greptime_flow',
    resolutionSeconds: 60,
    window: { start: window.from, end: window.to },
    identity: {
      workspaceId: 'default',
      entityId: '7',
      entityType: 'service',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      deploymentEnvironment: 'prod'
    },
    summary: sample,
    series: [{ timestamp: window.from, ...sample }],
    ...override
  };
}
