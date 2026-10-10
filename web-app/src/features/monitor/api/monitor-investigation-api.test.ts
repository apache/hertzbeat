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

const http = vi.hoisted(() => ({ apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  ...http
}));

import { loadMonitorInvestigation } from './monitor-api';
import { MonitorContractError } from '../model/monitor-contract';

const window = { from: 1_750_000_000_000, to: 1_750_003_600_000 };

describe('monitor investigation API', () => {
  beforeEach(() => http.apiMessageGet.mockReset());

  it('loads the exact bounded Monitor Signal View contract and forwards cancellation', async () => {
    const signal = new AbortController().signal;
    http.apiMessageGet.mockResolvedValue(readyInvestigation());

    await expect(loadMonitorInvestigation(42, window, signal)).resolves.toEqual(readyInvestigation());
    expect(http.apiMessageGet).toHaveBeenCalledWith(
      '/api/monitor/42/investigation?start=1750000000000&end=1750003600000',
      { signal }
    );
  });

  it.each([
    [0, window],
    [42, { from: window.to, to: window.from }],
    [42, { from: window.from, to: window.from + 86_400_001 }]
  ])('rejects invalid Monitor or window evidence before I/O %#', async (monitorId, candidateWindow) => {
    await expect(loadMonitorInvestigation(monitorId, candidateWindow)).rejects.toBeInstanceOf(MonitorContractError);
    expect(http.apiMessageGet).not.toHaveBeenCalled();
  });
});

function readyInvestigation() {
  return {
    monitorId: 42,
    window: { start: window.from, end: window.to },
    collection: {
      state: 'ready' as const,
      source: 'greptime_collection_events' as const,
      event: {
        observedAt: window.to - 1_000,
        durationMillis: 125,
        outcome: 'FAILURE' as const,
        collectorId: 'collector-a',
        target: '10.0.0.8:3306',
        metricSet: 'summary',
        failureClass: 'UNREACHABLE' as const,
        phase: 'CONNECT' as const,
        fieldCount: 0,
        rowCount: 0
      }
    },
    alerts: {
      state: 'ready' as const,
      source: 'current_alerts' as const,
      scope: 'current' as const,
      activeCount: 1,
      previews: [
        { id: 9, status: 'firing', severity: 'critical', summary: 'Target unreachable', activeAt: 1_749_999_000_000 }
      ]
    },
    binding: {
      state: 'ready' as const,
      identity: {
        monitorId: 42,
        entityId: 7,
        entityType: 'service' as const,
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'production',
        signals: ['metrics', 'logs', 'traces'] as const
      }
    }
  };
}
