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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QueryContextProvider } from '@/shared/query-context';
import { GlobalTimeProvider, RouteTimeProvider } from '@/shared/time';

import type { MetricConsole } from '../model/explore-signal-contract';
import { useExplorePageController } from './use-explore-page-controller';

const api = vi.hoisted(() => ({ loadLogSignal: vi.fn(), loadMetricSignal: vi.fn(), loadTraceSignal: vi.fn() }));
vi.mock('../api/explore-api', async importOriginal => ({ ...(await importOriginal<typeof import('../api/explore-api')>()), ...api }));

describe('Explore page controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadMetricSignal.mockResolvedValue(metricConsole([]));
    api.loadLogSignal.mockResolvedValue(page([]));
    api.loadTraceSignal.mockResolvedValue(page([]));
  });

  it('owns URL pushes and converges on Back history without browser globals', async () => {
    const routed = renderController(['/explore?signal=metrics', '/explore?signal=metrics&query=current'], 1);
    await waitFor(() => expect(routed.current().query.query).toBe('current'));
    act(() => routed.current().updateQuery({ serviceName: 'checkout' }));
    expect(routed.router.state.location.search).toContain('serviceName=checkout');
    await act(async () => routed.router.navigate(-1));
    await waitFor(() => expect(routed.current().query.query).toBe('current'));
    await act(async () => routed.router.navigate(-1));
    await waitFor(() => expect(routed.current().query.query).toBeUndefined());
    await act(async () => routed.router.navigate(1));
    await waitFor(() => expect(routed.current().query.query).toBe('current'));
  });

  it('clears downstream scope and old-service identity on service and Collector switches', async () => {
    const routed = renderController([
      '/explore?signal=metrics&collectorId=east&serviceName=checkout&serviceNamespace=commerce'
      + '&environment=prod&instance=checkout-1&endpoint=POST%20%2Fcheckout'
    ]);
    await waitFor(() => expect(routed.current().query.serviceName).toBe('checkout'));
    act(() => routed.current().updateQuery({ serviceName: 'payments' }));
    await waitFor(() => expect(routed.router.state.location.search).toContain('serviceName=payments'));
    expect(routed.router.state.location.search).toContain('collectorId=east');
    expect(routed.router.state.location.search).not.toMatch(/serviceNamespace|environment|instance|endpoint/u);

    act(() => routed.current().updateQuery({ collectorId: 'west' }));
    await waitFor(() => expect(routed.router.state.location.search).toContain('collectorId=west'));
    expect(routed.router.state.location.search).not.toMatch(/serviceName|serviceNamespace|environment|instance|endpoint/u);
  });

  it('never requests an invalid handoff or live log history', async () => {
    const invalid = renderController(['/explore?signal=traces&collectorId=east']);
    await waitFor(() => expect(invalid.current().handoff).toBe('invalid'));
    await act(async () => invalid.current().refresh());
    expect(api.loadTraceSignal).not.toHaveBeenCalled();
    invalid.unmount();

    const live = renderController(['/explore?signal=logs&live=true']);
    await waitFor(() => expect(live.current().result.kind).toBe('live'));
    await act(async () => live.current().refresh());
    expect(api.loadLogSignal).not.toHaveBeenCalled();
  });

  it('freezes the inherited route window and keeps exact onboarding windows fixed', async () => {
    const relative = renderController(['/explore?signal=metrics']);
    await waitFor(() => expect(api.loadMetricSignal).toHaveBeenCalled());
    const inherited = api.loadMetricSignal.mock.calls[0]?.[0];
    expect(inherited.start).toEqual(expect.any(Number));
    expect(inherited.end).toEqual(expect.any(Number));
    await act(async () => relative.current().refresh());
    expect(api.loadMetricSignal.mock.calls[1]?.[0]).toMatchObject({ start: inherited.start, end: inherited.end });
    relative.unmount();

    const exact = renderController(['/explore?signal=metrics&serviceName=checkout&serviceNamespace=shop&environment=prod&collectorId=east&start=1000&end=2000']);
    await waitFor(() => expect(api.loadMetricSignal).toHaveBeenCalledTimes(3));
    expect(api.loadMetricSignal.mock.calls[2]?.[0]).toMatchObject({ start: 1000, end: 2000 });
    await act(async () => exact.current().refresh());
    expect(api.loadMetricSignal.mock.calls[3]?.[0]).toMatchObject({ start: 1000, end: 2000 });
  });

  it.each(['metrics', 'logs', 'traces'] as const)('auto-refetches %s every 30 seconds without changing history', async signal => {
    vi.useFakeTimers();
    try {
      const routed = renderController([`/explore?signal=${signal}`]);
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      const loader = signal === 'metrics' ? api.loadMetricSignal : signal === 'logs' ? api.loadLogSignal : api.loadTraceSignal;
      expect(loader).toHaveBeenCalledTimes(1);
      const key = routed.router.state.location.key;
      await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
      expect(loader).toHaveBeenCalledTimes(2);
      expect(routed.router.state.location.key).toBe(key);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    [page([]), 'empty'], [page([], 3, 3, 1), 'ready']
  ])('classifies authoritative page evidence as %s', async (evidence, kind) => {
    api.loadTraceSignal.mockResolvedValue(evidence);
    const routed = renderController(['/explore?signal=traces']);
    await waitFor(() => expect(routed.current().result.kind).toBe(kind));
  });

  it('keeps unavailable, contract, and other failures distinct from empty', async () => {
    const { ApiMessageError } = await import('@/core/http/api-message');
    const { ExploreSignalContractError } = await import('../model/explore-signal-contract');
    for (const [reason, kind] of [
      [new ApiMessageError('offline', { status: 503 }), 'unavailable'],
      [new ExploreSignalContractError('bad'), 'error'],
      [new Error('bad'), 'error']
    ] as const) {
      api.loadLogSignal.mockRejectedValue(reason);
      const routed = renderController(['/explore?signal=logs']);
      await waitFor(() => expect(routed.current().result.kind).toBe(kind));
      routed.unmount();
    }
  });

  it('does not let a stale previous-signal promise replace the current result', async () => {
    const metric = deferred<MetricConsole>();
    api.loadMetricSignal.mockReturnValue(metric.promise);
    api.loadLogSignal.mockResolvedValue(page([logRow({ body: 'current' })]));
    const routed = renderController(['/explore?signal=metrics']);
    await waitFor(() => expect(api.loadMetricSignal).toHaveBeenCalled());
    act(() => routed.current().updateQuery({ signal: 'logs', pageIndex: undefined }));
    await waitFor(() => expect(routed.current().result).toMatchObject({ kind: 'ready', signal: 'logs' }));
    act(() => metric.resolve(metricConsole([])));
    await act(async () => metric.promise);
    expect(routed.current().result).toMatchObject({ kind: 'ready', signal: 'logs' });
  });
});

function renderController(entries: string[], initialIndex = 0) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let controller: ReturnType<typeof useExplorePageController> | undefined;
  function Probe() { controller = useExplorePageController(); return null; }
  const router = createMemoryRouter([{ path: '/explore', element: (
    <QueryClientProvider client={client}>
      <QueryContextProvider>
        <GlobalTimeProvider><RouteTimeProvider policy="route_owned"><Probe /></RouteTimeProvider></GlobalTimeProvider>
      </QueryContextProvider>
    </QueryClientProvider>
  ) }], {
    initialEntries: entries, initialIndex
  });
  const view = render(<RouterProvider router={router} />);
  return { router, unmount: view.unmount, current: () => { if (!controller) throw new Error('controller not mounted'); return controller; } };
}

function metricConsole(frames: NonNullable<NonNullable<MetricConsole['results']>['frames']>): MetricConsole {
  return { context: null, query: null, datasource: null, queryMode: null,
    results: { refId: null, status: 200, msg: null, frames }, stats: null, emptyStateReason: null, errorMessage: null };
}
function page(content: unknown[], totalElements = content.length, number = 0, totalPages = totalElements ? 1 : 0) {
  return { content, totalElements, totalPages, number, size: 20 };
}
function logRow(override: Partial<import('../model/explore-signal-contract').LogRow> = {}): import('../model/explore-signal-contract').LogRow {
  return { timeUnixNano: null, observedTimeUnixNano: null, severityNumber: null, severityText: null, body: null,
    attributes: null, droppedAttributesCount: null, traceId: null, spanId: null, traceFlags: null, resource: null,
    resourceSchemaUrl: null, instrumentationScope: null, scopeSchemaUrl: null, ...override };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
