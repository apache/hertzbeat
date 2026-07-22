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

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RUNTIME_STATUS_REFRESH_INTERVAL_MS, useRuntimeStatusController } from './use-runtime-status-controller';

type QueryOptions = {
  queryKey: readonly string[];
  queryFn: (context: { signal: AbortSignal }) => unknown;
  refetchInterval: number;
};
type QueryEvidence = { data?: unknown; error: unknown; isPending: boolean };

const query = vi.hoisted(() => ({
  useQuery: vi.fn<(options: QueryOptions) => QueryEvidence>()
}));
vi.mock('@tanstack/react-query', () => ({ useQuery: query.useQuery }));
const api = vi.hoisted(() => ({ loadRuntimeStatus: vi.fn() }));
vi.mock('../api/runtime-status-api', () => api);

describe('useRuntimeStatusController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query.useQuery.mockReturnValue({ data: undefined, error: null, isPending: true });
  });

  it('owns the stable query identity, cancellation, and named refresh interval', async () => {
    renderHook(() => useRuntimeStatusController());
    const options = query.useQuery.mock.calls[0]?.[0];
    if (!options) throw new Error('Expected runtime status query options');
    const signal = new AbortController().signal;

    await options.queryFn({ signal });

    expect(options.queryKey).toEqual(['ui-runtime-status']);
    expect(options.refetchInterval).toBe(RUNTIME_STATUS_REFRESH_INTERVAL_MS);
    expect(api.loadRuntimeStatus).toHaveBeenCalledWith({ signal });
  });

  it('publishes authoritative evidence only after it resolves', () => {
    const snapshot = runtimeStatusFixture();
    query.useQuery.mockReturnValue({ data: snapshot, error: null, isPending: false });

    expect(renderHook(() => useRuntimeStatusController()).result.current).toEqual({
      state: 'ready',
      snapshot
    });
  });

  it('does not expose cached evidence while pending and fails closed on any query error', () => {
    query.useQuery.mockReturnValue({ data: runtimeStatusFixture(), error: null, isPending: true });
    expect(renderHook(() => useRuntimeStatusController()).result.current).toEqual({
      state: 'loading',
      snapshot: null
    });

    query.useQuery.mockReturnValue({
      data: runtimeStatusFixture(),
      error: new Error('invalid response'),
      isPending: false
    });
    expect(renderHook(() => useRuntimeStatusController()).result.current).toMatchObject({
      state: 'unavailable',
      snapshot: {
        observedAt: null,
        server: { status: 'unavailable', errorCode: 'server_unavailable' },
        storage: { status: 'unavailable', errorCode: 'storage_unavailable' },
        collectors: { status: 'unavailable', errorCode: 'collector_status_unavailable' }
      }
    });
  });
});

function runtimeStatusFixture() {
  return {
    observedAt: '2026-07-22T01:02:03Z',
    server: { status: 'available' as const, errorCode: null },
    storage: { kind: 'greptime' as const, status: 'available' as const, errorCode: null },
    collectors: {
      status: 'available' as const,
      total: 3,
      online: 2,
      runtimeHealthy: 1,
      lastReportedAt: '2026-07-22T01:02:00Z',
      errorCode: null
    }
  };
}
