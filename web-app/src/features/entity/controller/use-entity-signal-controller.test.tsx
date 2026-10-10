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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const perses = vi.hoisted(() => ({ queryHertzBeatData: vi.fn() }));
const api = vi.hoisted(() => ({ loadEntityRedSignal: vi.fn() }));
const time = vi.hoisted(() => ({
  value: {
    window: { from: 1_750_000_000_000, to: 1_750_000_060_000 },
    refreshRevision: 4,
    requestRefresh: vi.fn()
  }
}));

vi.mock('@/platform/perses', async importOriginal => ({
  ...(await importOriginal<typeof import('@/platform/perses')>()),
  queryHertzBeatData: perses.queryHertzBeatData
}));
vi.mock('../api/entity-signal-api', () => api);
vi.mock('@/shared/time', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/time')>()),
  useSharedTimeOptional: () => time.value
}));

import type { EntityDetail } from '../model/entity-contract';
import { useEntitySignalController } from './use-entity-signal-controller';

const detail: EntityDetail = {
  entity: { id: 7, type: 'service', name: 'checkout' },
  identities: [],
  monitorPreview: { items: [], total: 0, complete: true },
  relations: []
};

describe('useEntitySignalController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadEntityRedSignal.mockResolvedValue({
      state: 'empty',
      source: 'greptime_flow',
      resolutionSeconds: 60,
      window: { start: time.value.window.from, end: time.value.window.to },
      identity: {
        workspaceId: 'default',
        entityId: '7',
        entityType: 'service',
        serviceName: 'checkout',
        serviceNamespace: null,
        deploymentEnvironment: null
      },
      summary: null,
      series: []
    });
    perses.queryHertzBeatData.mockResolvedValue({ state: 'empty', truncated: false });
  });
  afterEach(cleanup);

  it('runs bounded overview queries with one entity scope and React Query cancellation signals', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const { result } = renderHook(() => useEntitySignalController(detail), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.state?.kind).toBe('ready'));
    await waitFor(() => expect(api.loadEntityRedSignal).toHaveBeenCalledOnce());
    expect(api.loadEntityRedSignal).toHaveBeenCalledWith(7, time.value.window, expect.any(AbortSignal));
    expect(perses.queryHertzBeatData).toHaveBeenCalledTimes(2);
    const queries = perses.queryHertzBeatData.mock.calls.map(call => call[0] as unknown);
    expect(queries).toEqual([
      expect.objectContaining({
        signal: 'logs',
        queryKind: 'table',
        timeWindow: time.value.window,
        context: { entityId: '7', entityType: 'service' },
        limit: 25
      }),
      expect.objectContaining({
        signal: 'traces',
        queryKind: 'table',
        timeWindow: time.value.window,
        context: { entityId: '7', entityType: 'service' },
        limit: 25
      })
    ]);
    expect(result.current.state).toMatchObject({
      capabilities: {
        metrics: 'unknown',
        redMetrics: 'empty',
        logs: 'empty',
        traces: 'empty',
        nativeMetrics: 'unknown'
      }
    });
  });

  it('queries independent signals from degraded base identity and keeps missing legacy context unknown', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const { result } = renderHook(() => useEntitySignalController(detail.entity), { wrapper: wrapper(client) });

    await waitFor(() =>
      expect(api.loadEntityRedSignal).toHaveBeenCalledWith(7, time.value.window, expect.any(AbortSignal))
    );
    await waitFor(() => expect(perses.queryHertzBeatData).toHaveBeenCalledTimes(2));
    expect(result.current.state).toMatchObject({
      kind: 'ready',
      capabilities: { topology: 'unknown', collection: 'unknown', alerts: 'unknown' },
      boundMonitors: { state: 'unknown' },
      topology: { names: [] },
      alerts: {}
    });
    expect(result.current.state).not.toHaveProperty('boundMonitors.total');
  });

  it('retires an old entity RED request before publishing the new entity scope', async () => {
    let oldSignal: AbortSignal | undefined;
    api.loadEntityRedSignal.mockImplementation((id: number, _window: unknown, signal: AbortSignal) => {
      if (id === 7) {
        oldSignal = signal;
        return new Promise(() => undefined);
      }
      return Promise.resolve({
        state: 'unavailable',
        source: 'greptime_flow',
        resolutionSeconds: 60,
        window: { start: time.value.window.from, end: time.value.window.to },
        identity: {
          workspaceId: 'default',
          entityId: '8',
          entityType: 'service',
          serviceName: 'payments',
          serviceNamespace: null,
          deploymentEnvironment: null
        },
        summary: null,
        series: []
      });
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const { rerender } = renderHook(({ value }) => useEntitySignalController(value), {
      initialProps: { value: detail },
      wrapper: wrapper(client)
    });
    await waitFor(() => expect(oldSignal).toBeDefined());

    rerender({ value: { ...detail, entity: { ...detail.entity, id: 8, name: 'payments' } } });

    await waitFor(() =>
      expect(api.loadEntityRedSignal).toHaveBeenCalledWith(8, time.value.window, expect.any(AbortSignal))
    );
    expect(oldSignal?.aborted).toBe(true);
  });

  it('uses a distinct trace cache scope when an exact trace identity is added', async () => {
    window.history.replaceState({}, '', '/entities/7');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    renderHook(() => useEntitySignalController(detail), { wrapper: browserWrapper(client) });

    await waitFor(() =>
      expect(perses.queryHertzBeatData).toHaveBeenCalledWith(
        expect.objectContaining({ signal: 'traces', queryKind: 'table' }),
        expect.any(Object)
      )
    );

    act(() => {
      window.history.pushState({}, '', '/entities/7?traceId=0123456789abcdef0123456789abcdef&spanId=fedcba9876543210');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await waitFor(() =>
      expect(perses.queryHertzBeatData).toHaveBeenCalledWith(
        expect.objectContaining({
          signal: 'traces',
          queryKind: 'gantt',
          traceId: '0123456789abcdef0123456789abcdef',
          spanId: 'fedcba9876543210'
        }),
        expect.any(Object)
      )
    );
    expect(perses.queryHertzBeatData).toHaveBeenCalledWith(
      expect.objectContaining({
        signal: 'logs',
        queryKind: 'table',
        traceId: '0123456789abcdef0123456789abcdef',
        spanId: 'fedcba9876543210'
      }),
      expect.any(Object)
    );
  });

  it.each([
    ['America/New_York', 'America/New_York'],
    ['not/a-zone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC']
  ])('uses a valid routed time zone and falls back safely for %s', async (routedTimeZone, expectedTimeZone) => {
    window.history.replaceState({}, '', `/entities/7?timeZone=${encodeURIComponent(routedTimeZone)}`);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const { result } = renderHook(() => useEntitySignalController(detail), { wrapper: browserWrapper(client) });

    await waitFor(() => expect(result.current.state?.kind).toBe('ready'));
    expect(result.current.state).toMatchObject({
      plan: { anchor: { window: { timeZone: expectedTimeZone } } }
    });
  });
});

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: React.PropsWithChildren) {
    return (
      <MemoryRouter>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </MemoryRouter>
    );
  };
}

function browserWrapper(client: QueryClient) {
  return function Wrapper({ children }: React.PropsWithChildren) {
    return (
      <BrowserRouter>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </BrowserRouter>
    );
  };
}
