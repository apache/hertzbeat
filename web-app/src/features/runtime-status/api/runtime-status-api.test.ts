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

const { apiMessageGet } = vi.hoisted(() => ({ apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', () => ({ apiMessageGet }));

import { loadRuntimeStatus, RuntimeStatusContractError, runtimeStatusPath } from './runtime-status-api';

describe('runtime status API', () => {
  beforeEach(() => apiMessageGet.mockReset());

  it('consumes the exact v1 snapshot through core HTTP with cancellation', async () => {
    const signal = new AbortController().signal;
    const wire = runtimeStatusFixture();
    apiMessageGet.mockResolvedValue(wire);

    await expect(loadRuntimeStatus({ signal })).resolves.toEqual(snapshotFromWire(wire));
    expect(apiMessageGet).toHaveBeenCalledWith(runtimeStatusPath, { signal });
  });

  it.each([
    ['schema version', { schemaVersion: 2 }],
    ['observed instant', { observedAt: 'not-an-instant' }],
    ['unknown server error', { server: { status: 'unknown', errorCode: 'server_unavailable' } }],
    ['degraded storage without error', { storage: { kind: 'greptime', status: 'degraded', errorCode: null } }],
    [
      'inconsistent Collector counts',
      {
        collectors: {
          status: 'available',
          total: 2,
          online: 3,
          runtimeHealthy: 1,
          lastReportedAt: '2026-07-22T01:02:00Z',
          errorCode: null
        }
      }
    ],
    [
      'unknown Collector counts',
      {
        collectors: {
          status: 'unknown',
          total: 0,
          online: null,
          runtimeHealthy: null,
          lastReportedAt: null,
          errorCode: null
        }
      }
    ]
  ])('rejects invalid %s evidence', async (_label, override) => {
    apiMessageGet.mockResolvedValue({ ...runtimeStatusFixture(), ...override });

    await expect(loadRuntimeStatus()).rejects.toBeInstanceOf(RuntimeStatusContractError);
  });

  it('accepts canonical unknown and unavailable evidence without inferred Collector counts', async () => {
    const value = runtimeStatusFixture({
      server: { status: 'unknown', errorCode: null },
      storage: { kind: 'greptime', status: 'unavailable', errorCode: 'storage_unavailable' },
      collectors: {
        status: 'unavailable',
        total: null,
        online: null,
        runtimeHealthy: null,
        lastReportedAt: null,
        errorCode: 'collector_status_unavailable'
      }
    });
    apiMessageGet.mockResolvedValue(value);

    await expect(loadRuntimeStatus()).resolves.toEqual(snapshotFromWire(value));
  });
});

function runtimeStatusFixture(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    observedAt: '2026-07-22T01:02:03Z',
    server: { status: 'available', errorCode: null },
    storage: { kind: 'greptime', status: 'degraded', errorCode: 'storage_query_failed' },
    collectors: {
      status: 'available',
      total: 3,
      online: 2,
      runtimeHealthy: 1,
      lastReportedAt: '2026-07-22T01:02:00Z',
      errorCode: null
    },
    ...overrides
  };
}

function snapshotFromWire(value: ReturnType<typeof runtimeStatusFixture>) {
  return {
    observedAt: value.observedAt,
    server: value.server,
    storage: value.storage,
    collectors: value.collectors
  };
}
