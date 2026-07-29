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
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TraceDetail } from '../model/explore-signal-contract';
import { exploreEvidenceScopeKey, type TraceExploreQuery } from '../model/explore-model';
import { exploreQueryKeys } from './explore-query-keys';
import { useTraceDetailController } from './use-trace-detail-controller';

const api = vi.hoisted(() => ({ loadTraceDetail: vi.fn() }));
vi.mock('../api/explore-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/explore-api')>()),
  ...api
}));

describe('Trace detail controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('owns open, ready selection, cross-signal actions, pagination, and close reset', async () => {
    api.loadTraceDetail.mockResolvedValue(traceDetail('trace-1'));
    const openPath = vi.fn();
    const view = renderController(openPath);
    expect(view.result.current.state.kind).toBe('closed');
    act(() => view.result.current.openTrace('trace-1'));
    expect(view.result.current.state.kind).toBe('loading');
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));
    act(() => view.result.current.selectSpan('span-2'));
    expect(view.result.current.state).toMatchObject({ kind: 'ready', selected: { spanId: 'span-2' } });
    act(() => view.result.current.openRelatedLogs());
    expect(openPath).toHaveBeenLastCalledWith(expect.stringMatching(/signal=logs.*traceId=trace-1/));
    act(() => view.result.current.openRelatedMetrics());
    expect(openPath).toHaveBeenLastCalledWith(expect.stringMatching(/signal=metrics.*serviceName=payments/));
    expect(openPath).toHaveBeenLastCalledWith(expect.not.stringContaining('operationName='));
    act(() => view.result.current.changePage(3));
    expect(openPath).toHaveBeenLastCalledWith(expect.stringContaining('page=2'));
    act(() => view.result.current.close());
    expect(view.result.current.state.kind).toBe('closed');
    act(() => view.result.current.openTrace('trace-1'));
    await waitFor(() =>
      expect(view.result.current.state).toMatchObject({ kind: 'ready', selected: { spanId: 'span-1' } })
    );
  });

  it('injects operationName only from an honestly selected matching root span', async () => {
    api.loadTraceDetail.mockResolvedValue(rootAlignedTraceDetail('trace-1'));
    const openPath = vi.fn();
    const view = renderController(openPath);
    act(() => view.result.current.openTrace('trace-1'));
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));

    act(() => view.result.current.openRelatedMetrics());

    expect(openPath).toHaveBeenLastCalledWith(expect.stringContaining('operationName=POST+%2Fcheckout'));
  });

  it.each([
    ['child selection', rootAlignedTraceDetail('trace-1'), 'span-2'],
    ['root name mismatch', traceDetail('trace-1'), undefined],
    ['missing root name', { ...rootAlignedTraceDetail('trace-1'), rootSpanName: null }, undefined],
    ['missing root selection', { ...rootAlignedTraceDetail('trace-1'), rootSpanId: 'missing-span' }, undefined]
  ] as const)('does not inject operationName for %s', async (_label, detail, selectedSpanId) => {
    api.loadTraceDetail.mockResolvedValue(detail);
    const openPath = vi.fn();
    const view = renderController(openPath);
    act(() => view.result.current.openTrace('trace-1'));
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));
    if (selectedSpanId) act(() => view.result.current.selectSpan(selectedSpanId));

    act(() => view.result.current.openRelatedMetrics());

    expect(openPath).toHaveBeenLastCalledWith(expect.not.stringContaining('operationName='));
  });

  it('preserves full context for trace logs and clears downstream identity when a span changes the metric service', async () => {
    api.loadTraceDetail.mockResolvedValue(traceDetail('trace-1'));
    const openPath = vi.fn();
    const view = renderController(openPath);
    const scopedQuery: TraceExploreQuery = {
      signal: 'traces',
      timeRange: 'last-30m',
      collectorId: 'collector-east',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'prod',
      instance: 'checkout-7d9',
      endpoint: '/checkout',
      start: 1_000,
      end: 2_000
    };
    view.rerender({ query: scopedQuery });
    act(() => view.result.current.openTrace('trace-1'));
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));

    act(() => view.result.current.openRelatedLogs());
    expect(openPath).toHaveBeenLastCalledWith(
      '/explore?signal=logs&timeRange=last-30m&collectorId=collector-east&serviceName=checkout' +
        '&serviceNamespace=commerce&environment=prod&instance=checkout-7d9&endpoint=%2Fcheckout' +
        '&traceId=trace-1&start=1000&end=2000'
    );

    act(() => view.result.current.selectSpan('span-2'));
    act(() => view.result.current.openRelatedMetrics());
    expect(openPath).toHaveBeenLastCalledWith(
      '/explore?signal=metrics&timeRange=last-30m&collectorId=collector-east&serviceName=payments' +
        '&start=1000&end=2000'
    );
  });

  it.each([
    ['missing', async () => new (await import('../model/explore-signal-contract')).ExploreSignalMissingError()],
    [
      'unavailable',
      async () => new (await import('@/core/http/api-message')).ApiMessageError('offline', { status: 503 })
    ],
    ['error', async () => new (await import('../model/explore-signal-contract')).ExploreSignalContractError('bad')],
    ['error', () => new Error('bad')]
  ] as const)('classifies detail failure as %s and retries', async (kind, reasonFactory) => {
    api.loadTraceDetail.mockRejectedValueOnce(await reasonFactory()).mockResolvedValueOnce(traceDetail('trace-1'));
    const view = renderController(vi.fn());
    act(() => view.result.current.openTrace('trace-1'));
    await waitFor(() => expect(view.result.current.state.kind).toBe(kind));
    await act(async () => {
      await view.result.current.retry();
    });
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));
  });

  it('aborts old detail work and ignores late results after switch or close', async () => {
    const first = deferred<TraceDetail>();
    const second = deferred<TraceDetail>();
    const signals: AbortSignal[] = [];
    api.loadTraceDetail.mockImplementation((traceId: string, signal: AbortSignal) => {
      signals.push(signal);
      return traceId === 'trace-1' ? first.promise : second.promise;
    });
    const view = renderController(vi.fn());
    act(() => view.result.current.openTrace('trace-1'));
    await waitFor(() => expect(signals).toHaveLength(1));
    act(() => view.result.current.openTrace('trace-2'));
    await waitFor(() => expect(signals[0]?.aborted).toBe(true));
    act(() => first.resolve(traceDetail('trace-1')));
    act(() => second.resolve(traceDetail('trace-2')));
    await waitFor(() =>
      expect(view.result.current.state).toMatchObject({ kind: 'ready', detail: { traceId: 'trace-2' } })
    );
    const third = deferred<TraceDetail>();
    api.loadTraceDetail.mockImplementationOnce((_traceId: string, signal: AbortSignal) => {
      signals.push(signal);
      return third.promise;
    });
    act(() => view.result.current.openTrace('trace-3'));
    await waitFor(() => expect(signals).toHaveLength(3));
    act(() => view.result.current.close());
    await waitFor(() => expect(signals[2]?.aborted).toBe(true));
    expect(view.result.current.state.kind).toBe('closed');
  });

  it('permanently clears selected trace evidence and prevents stale pivots when scope changes A to B to A', async () => {
    api.loadTraceDetail.mockResolvedValue(traceDetail('trace-1'));
    const openPath = vi.fn();
    const view = renderController(openPath);
    act(() => view.result.current.openTrace('trace-1'));
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));

    view.rerender({ query: { ...defaultQuery, serviceName: 'payments' } });
    expect(view.result.current.state.kind).toBe('closed');
    view.rerender({ query: defaultQuery });
    expect(view.result.current.state.kind).toBe('closed');

    act(() => view.result.current.openRelatedLogs());
    act(() => view.result.current.openRelatedMetrics());
    expect(openPath).not.toHaveBeenCalled();
  });

  it('aborts pending detail work when its query scope changes', async () => {
    const pending = deferred<TraceDetail>();
    let signal: AbortSignal | undefined;
    api.loadTraceDetail.mockImplementation((_traceId: string, requestSignal: AbortSignal) => {
      signal = requestSignal;
      return pending.promise;
    });
    const view = renderController(vi.fn());
    act(() => view.result.current.openTrace('trace-1'));
    await waitFor(() => expect(signal).toBeDefined());

    view.rerender({ query: { ...defaultQuery, serviceName: 'payments' } });

    expect(view.result.current.state.kind).toBe('closed');
    await waitFor(() => expect(signal?.aborted).toBe(true));
  });

  it('allows an explicit detail open in the new scope without cleanup clearing it', async () => {
    api.loadTraceDetail.mockImplementation((traceId: string) => Promise.resolve(traceDetail(traceId)));
    const view = renderController(vi.fn());
    act(() => view.result.current.openTrace('trace-1'));
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));

    view.rerender({ query: { ...defaultQuery, serviceName: 'payments' } });
    expect(view.result.current.state.kind).toBe('closed');
    act(() => view.result.current.openTrace('trace-2'));

    await waitFor(() =>
      expect(view.result.current.state).toMatchObject({ kind: 'ready', detail: { traceId: 'trace-2' } })
    );
  });

  it('keeps an opened detail when the same scope rerenders without another open', async () => {
    api.loadTraceDetail.mockResolvedValue(traceDetail('trace-1'));
    const view = renderController(vi.fn());
    act(() => view.result.current.openTrace('trace-1'));
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));

    view.rerender({ query: { ...defaultQuery } });

    expect(view.result.current.state).toMatchObject({ kind: 'ready', detail: { traceId: 'trace-1' } });
    expect(api.loadTraceDetail).toHaveBeenCalledOnce();
  });

  it('shares the feature-owned detail identity with cached trace evidence', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: Number.POSITIVE_INFINITY } }
    });
    client.setQueryData(
      exploreQueryKeys.detail(exploreEvidenceScopeKey(defaultQuery), 'trace-1'),
      traceDetail('trace-1')
    );
    const view = renderController(vi.fn(), client);

    act(() => view.result.current.openTrace('trace-1'));

    await waitFor(() =>
      expect(view.result.current.state).toMatchObject({ kind: 'ready', detail: { traceId: 'trace-1' } })
    );
    expect(api.loadTraceDetail).not.toHaveBeenCalled();
  });
});

function renderController(
  openPath: (path: string) => void,
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(({ query }) => useTraceDetailController(query, openPath), {
    initialProps: { query: defaultQuery },
    wrapper
  });
}

const defaultQuery: TraceExploreQuery = { signal: 'traces', timeRange: 'last-30m' };

function traceDetail(traceId: string): TraceDetail {
  return {
    traceId,
    rootSpanId: 'span-1',
    serviceName: 'checkout',
    serviceNamespace: null,
    rootSpanName: 'POST',
    durationNanos: 2,
    status: 'OK',
    startTime: 0,
    errorSpanCount: 0,
    resourceAttributes: null,
    spans: [span(traceId, 'span-1', 'checkout'), span(traceId, 'span-2', 'payments')]
  };
}
function rootAlignedTraceDetail(traceId: string): TraceDetail {
  const detail = traceDetail(traceId);
  return {
    ...detail,
    rootSpanName: 'POST /checkout',
    spans: [span(traceId, 'span-1', 'checkout', 'POST /checkout'), span(traceId, 'span-2', 'payments')]
  };
}
function span(traceId: string, spanId: string, serviceName: string, spanName = spanId) {
  return {
    traceId,
    spanId,
    parentSpanId: null,
    spanName,
    serviceName,
    status: 'OK',
    spanKind: null,
    statusMessage: null,
    traceState: null,
    scopeName: null,
    scopeVersion: null,
    durationNanos: 1,
    startTime: 0,
    highlighted: false,
    resourceAttributes: null,
    spanAttributes: null,
    events: null,
    links: null,
    codeNavigationHint: null
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
