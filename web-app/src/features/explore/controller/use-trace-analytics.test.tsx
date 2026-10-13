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

import { ApiMessageError } from '@/core/http/api-message';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { loadTraceAnalytics } from '../api/explore-trace-analytics-api';
import type { TraceExploreQuery } from '../model/explore-query';
import type { ExplorePageResultState } from '../model/explore-result-model';
import { DEFAULT_TRACE_VIEW, encodeTraceView } from '../model/explore-trace-view';
import { buildSignalApiPath } from '../api/explore-api';
import { useTraceAnalytics } from './use-trace-analytics';
vi.mock('../api/explore-trace-analytics-api', async original => ({
  ...(await original<typeof import('../api/explore-trace-analytics-api')>()),
  loadTraceAnalytics: vi.fn()
}));
const query: TraceExploreQuery = { signal: 'traces', timeRange: 'last-30m', start: 100000, end: 200000 };
const response = {
  state: 'unavailable' as const,
  window: { start: 100000, end: 200000, endExclusive: false },
  population: 'matched_traces' as const,
  coverage: null,
  data: null
};
type Response = Awaited<ReturnType<typeof loadTraceAnalytics>>;
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it.each([
  ['service', { serviceName: 'checkout' }],
  ['window', { start: 200000, end: 300000 }]
])('aborts the old %s request and ignores late evidence', async (_name, patch) => {
  const pending: { path: string; signal?: AbortSignal | undefined; resolve: (value: Response) => void }[] = [];
  vi.mocked(loadTraceAnalytics).mockImplementation(
    (path, _request, signal) => new Promise(resolve => pending.push({ path, signal, resolve }))
  );
  const hook = renderHook(({ value }) => useTraceAnalytics(value, { kind: 'loading' }, vi.fn()), {
    initialProps: { value: query },
    wrapper: wrapper()
  });
  await waitFor(() => expect(pending).toHaveLength(2));
  hook.rerender({ value: { ...query, ...patch } });
  await waitFor(() => expect(pending).toHaveLength(4));
  expect(pending.slice(0, 2).every(request => request.signal?.aborted)).toBe(true);
  const current = { ...response, window: { ...response.window, ...patch } };
  await act(async () => {
    pending.slice(2).forEach(request => request.resolve(current));
    await Promise.resolve();
  });
  await waitFor(() => expect(hook.result.current.histogram.state).toBe('ready'));
  await act(async () => {
    pending.slice(0, 2).forEach(request => request.resolve(response));
    await Promise.resolve();
  });
  expect(hook.result.current.histogram.data).toEqual(current);
  expect(hook.result.current.facets.data).toEqual(current);
  expect(pending[2]!.path).not.toBe(pending[0]!.path);
});
it('isolates facet field requests without refetching the histogram', async () => {
  const pending: { signal?: AbortSignal | undefined; resolve: (value: Response) => void }[] = [];
  vi.mocked(loadTraceAnalytics).mockImplementation((_path, request, signal) =>
    request.kind === 'facets' ? new Promise(resolve => pending.push({ signal, resolve })) : Promise.resolve(response)
  );
  const hook = renderHook(() => useTraceAnalytics(query, { kind: 'loading' }, vi.fn()), { wrapper: wrapper() });
  await waitFor(() => expect(pending).toHaveLength(1));
  act(() => hook.result.current.onFieldChange('operationName'));
  await waitFor(() => expect(pending).toHaveLength(2));
  expect(pending[0]!.signal?.aborted).toBe(true);
  await act(async () => {
    pending[0]!.resolve(response);
    await Promise.resolve();
  });
  expect(hook.result.current.facets.state).toBe('loading');
  expect(hook.result.current.facets.data).toBeUndefined();
  await act(async () => {
    pending[1]!.resolve(response);
    await Promise.resolve();
  });
  await waitFor(() => expect(hook.result.current.facets.state).toBe('ready'));
  expect(vi.mocked(loadTraceAnalytics).mock.calls.filter(([, request]) => request.kind === 'histogram')).toHaveLength(
    1
  );
  expect(vi.mocked(loadTraceAnalytics).mock.calls.at(-1)![0]).toContain('field=operationName');
});
it('enables only the requested population representation and hides disabled cached results', async () => {
  vi.mocked(loadTraceAnalytics).mockResolvedValue(response);
  const hook = renderHook(({ value }) => useTraceAnalytics(value, { kind: 'loading' }, vi.fn()), {
    initialProps: { value: query },
    wrapper: wrapper()
  });
  await waitFor(() => expect(hook.result.current.histogram.state).toBe('ready'));
  expect(vi.mocked(loadTraceAnalytics).mock.calls.map(([, request]) => request.kind)).toEqual(['histogram', 'facets']);
  hook.rerender({
    value: { ...query, traceView: encodeTraceView({ ...DEFAULT_TRACE_VIEW, population: 'matched_spans' }) }
  });
  await waitFor(() => expect(hook.result.current.spans.state).toBe('ready'));
  expect(hook.result.current.groups.state).toBe('idle');
  expect(
    vi
      .mocked(loadTraceAnalytics)
      .mock.calls.slice(2)
      .map(([, request]) => [request.kind, request.population])
  ).toEqual([
    ['histogram', 'matched_spans'],
    ['facets', 'matched_spans'],
    ['spans', 'matched_spans']
  ]);
  hook.rerender({
    value: {
      ...query,
      traceView: encodeTraceView({ ...DEFAULT_TRACE_VIEW, population: 'matched_spans', mode: 'groups' })
    }
  });
  await waitFor(() => expect(hook.result.current.groups.state).toBe('ready'));
  expect(hook.result.current.spans.data).toBeUndefined();
  expect(hook.result.current.spans.state).toBe('idle');
  expect(loadTraceAnalytics).toHaveBeenCalledTimes(6);
});
it('re-fetches enabled statistics on refresh and exposes an explicit retry', async () => {
  vi.mocked(loadTraceAnalytics).mockResolvedValue(response);
  const hook = renderHook(({ state }) => useTraceAnalytics(query, state, vi.fn()), {
    initialProps: { state: { kind: 'loading' } as ExplorePageResultState },
    wrapper: wrapper()
  });
  await waitFor(() => expect(hook.result.current.facets.state).toBe('ready'));
  hook.rerender({ state: { kind: 'refreshing', evidence: {} as never } });
  await waitFor(() => expect(loadTraceAnalytics).toHaveBeenCalledTimes(4));
  await waitFor(() => expect(hook.result.current.facets.state).toBe('ready'));
  act(() => hook.result.current.facets.retry());
  await waitFor(() => expect(loadTraceAnalytics).toHaveBeenCalledTimes(5));
});
it('hides cached statistics after permission denial, including retry and parent permission state', async () => {
  let phase = 'ready';
  vi.mocked(loadTraceAnalytics).mockImplementation(() => {
    if (phase === 'denied') return Promise.reject(new ApiMessageError('denied', { status: 403 }));
    if (phase === 'retry') return new Promise(() => {});
    return Promise.resolve(response);
  });
  const hook = renderHook(({ state }) => useTraceAnalytics(query, state, vi.fn()), {
    initialProps: { state: { kind: 'loading' } as ExplorePageResultState },
    wrapper: wrapper()
  });
  await waitFor(() => expect(hook.result.current.facets.state).toBe('ready'));
  phase = 'denied';
  act(() => hook.result.current.facets.retry());
  await waitFor(() => expect(hook.result.current.facets.state).toBe('permission'));
  expect(hook.result.current.facets.data).toBeUndefined();
  phase = 'retry';
  act(() => hook.result.current.facets.retry());
  await waitFor(() => expect(loadTraceAnalytics).toHaveBeenCalledTimes(4));
  expect(hook.result.current.facets.data).toBeUndefined();
  hook.rerender({ state: { kind: 'permission' } });
  expect(hook.result.current.histogram.data).toBeUndefined();
  expect(hook.result.current.facets.data).toBeUndefined();
});

function deferredAnalytics<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

it.each([
  ['operation/query', { query: 'POST /current' }],
  ['service', { serviceName: 'payments' }],
  ['window', { start: 300000, end: 400000 }]
] as const)('isolates trace histogram and facets after a %s-only change', async (_dimension, patch) => {
  const pending: Array<{
    path: string;
    kind: 'histogram' | 'facets';
    signal?: AbortSignal | undefined;
    deferred: ReturnType<typeof deferredAnalytics<Response>>;
  }> = [];
  vi.mocked(loadTraceAnalytics).mockImplementation((path, request, signal) => {
    const deferred = deferredAnalytics<Response>();
    if (request.kind !== 'histogram' && request.kind !== 'facets') throw new Error('unexpected representation');
    pending.push({ path, kind: request.kind, signal, deferred });
    return deferred.promise;
  });
  const initial = { ...query, query: 'GET /old', serviceName: 'checkout' };
  const next = { ...initial, ...patch };
  const hook = renderHook(({ value }) => useTraceAnalytics(value, { kind: 'loading' }, vi.fn()), {
    initialProps: { value: initial },
    wrapper: wrapper()
  });
  await waitFor(() => expect(pending).toHaveLength(2));
  hook.rerender({ value: next });
  await waitFor(() => expect(pending).toHaveLength(4));
  expect(pending.slice(0, 2).every(request => request.signal?.aborted)).toBe(true);
  expect(hook.result.current.histogram.data).toBeUndefined();
  expect(hook.result.current.facets.data).toBeUndefined();
  const expected = new URL(buildSignalApiPath(next), 'http://fixture').searchParams;
  for (const request of pending.slice(2)) {
    const params = new URL(request.path, 'http://fixture').searchParams;
    for (const key of ['operationName', 'serviceName', 'start', 'end']) expect(params.get(key)).toBe(expected.get(key));
  }
  const currentHistogram = analyticsFixture(pending[2]!.path, 'histogram', 'current-value', 17);
  const currentFacets = analyticsFixture(pending[3]!.path, 'facets', 'current-service', 17);
  await act(async () => {
    pending
      .slice(2)
      .forEach(request => request.deferred.resolve(request.kind === 'histogram' ? currentHistogram : currentFacets));
    await Promise.all(pending.slice(2).map(request => request.deferred.promise));
  });
  await waitFor(() => expect(hook.result.current.histogram.data).toEqual(currentHistogram));
  await waitFor(() => expect(hook.result.current.facets.data).toEqual(currentFacets));
  await act(async () => {
    pending
      .slice(0, 2)
      .forEach(request =>
        request.deferred.resolve(analyticsFixture(request.path, request.kind, 'obsolete-service', 2))
      );
    await Promise.all(pending.slice(0, 2).map(request => request.deferred.promise));
  });
  expect(hook.result.current.histogram.data).toEqual(currentHistogram);
  expect(hook.result.current.facets.data).toEqual(currentFacets);
});
it.each(['serviceName', 'operationName'] as const)(
  'keeps %s facets and histogram on the same current query/window after late errors',
  async field => {
    const pending: Array<{
      path: string;
      kind: string;
      signal?: AbortSignal | undefined;
      deferred: ReturnType<typeof deferredAnalytics<Response>>;
    }> = [];
    vi.mocked(loadTraceAnalytics).mockImplementation((path, request, signal) => {
      const deferred = deferredAnalytics<Response>();
      pending.push({ path, kind: request.kind, signal, deferred });
      return deferred.promise;
    });
    const initial = { ...query, query: 'GET /old', serviceName: 'checkout' };
    const hook = renderHook(({ value }) => useTraceAnalytics(value, { kind: 'loading' }, vi.fn()), {
      initialProps: { value: initial },
      wrapper: wrapper()
    });
    await waitFor(() => expect(pending).toHaveLength(2));
    if (field === 'operationName') {
      act(() => hook.result.current.onFieldChange(field));
      await waitFor(() => expect(pending).toHaveLength(3));
    }
    const boundary = pending.length;
    const next = { ...initial, query: 'POST /current', serviceName: 'payments', start: 300000, end: 400000 };
    hook.rerender({ value: next });
    expect(hook.result.current.histogram).toMatchObject({ state: 'loading' });
    expect(hook.result.current.histogram.data).toBeUndefined();
    expect(hook.result.current.facets.data).toBeUndefined();
    await waitFor(() => expect(pending).toHaveLength(boundary + 2));
    expect(pending.slice(0, boundary).every(request => request.signal?.aborted)).toBe(true);
    const main = new URL(buildSignalApiPath(next), 'http://fixture').searchParams;
    for (const request of pending.slice(boundary)) {
      const params = new URL(request.path, 'http://fixture').searchParams;
      for (const key of ['operationName', 'serviceName', 'start', 'end']) expect(params.get(key)).toBe(main.get(key));
      if (request.kind === 'facets') expect(params.get('field')).toBe(field);
    }
    const histogram = analyticsFixture(pending[boundary]!.path, 'histogram');
    const facets = analyticsFixture(pending[boundary + 1]!.path, 'facets');
    await act(async () => {
      pending
        .slice(boundary)
        .forEach(request => request.deferred.resolve(request.kind === 'histogram' ? histogram : facets));
      await Promise.all(pending.slice(boundary).map(request => request.deferred.promise));
    });
    await waitFor(() => expect(hook.result.current.histogram.state).toBe('ready'));
    await waitFor(() => expect(hook.result.current.facets.state).toBe('ready'));
    await act(async () => {
      pending.slice(0, boundary).forEach(request => request.deferred.reject(new Error('obsolete analytics failed')));
      await Promise.allSettled(pending.slice(0, boundary).map(request => request.deferred.promise));
    });
    expect(hook.result.current.histogram.data).toEqual(histogram);
    expect(hook.result.current.facets.data).toEqual(facets);
    hook.unmount();
  }
);
it('retries a delayed histogram failure without resetting a successful service facet', async () => {
  const retry = deferredAnalytics<Response>();
  vi.mocked(loadTraceAnalytics).mockImplementation((_path, request) =>
    request.kind === 'facets' ? Promise.resolve(response) : Promise.reject(new Error('histogram offline'))
  );
  const hook = renderHook(() => useTraceAnalytics(query, { kind: 'loading' }, vi.fn()), { wrapper: wrapper() });
  await waitFor(() => expect(hook.result.current.histogram.state).toBe('error'));
  await waitFor(() => expect(hook.result.current.facets.state).toBe('ready'));
  vi.mocked(loadTraceAnalytics).mockImplementation(() => retry.promise);
  act(() => {
    hook.result.current.histogram.retry();
    hook.result.current.histogram.retry();
  });
  await waitFor(() => expect(hook.result.current.histogram.state).toBe('loading'));
  expect(loadTraceAnalytics).toHaveBeenCalledTimes(3);
  expect(hook.result.current.facets.state).toBe('ready');
  await act(async () => {
    retry.resolve(response);
    await retry.promise;
  });
  await waitFor(() => expect(hook.result.current.histogram.state).toBe('ready'));
  expect(hook.result.current.facets.state).toBe('ready');
});

function analyticsFixture(path: string, kind: 'histogram' | 'facets', value = 'current-value', count = 1): Response {
  const params = new URL(path, 'http://fixture').searchParams;
  const start = Number(params.get('start'));
  const end = Number(params.get('end'));
  const common = {
    state: 'ready' as const,
    window: { start, end, endExclusive: false },
    population: 'matched_traces' as const,
    coverage: { mode: 'window' as const, rowLimit: null, scannedRows: null, truncated: false }
  };
  if (kind === 'histogram')
    return {
      ...common,
      data: {
        totalCount: count,
        errorCount: 0,
        intervalMs: end - start,
        buckets: [{ start, end, endExclusive: false, count, errorCount: 0 }]
      }
    };
  const field = params.get('field') === 'operationName' ? ('operationName' as const) : ('serviceName' as const);
  return {
    ...common,
    data: {
      field,
      totalCount: count,
      missingCount: 0,
      membership: 'multiple' as const,
      values: [{ value, count, errorCount: 0 }],
      truncated: false
    }
  };
}
