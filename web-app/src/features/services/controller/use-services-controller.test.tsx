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

import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GlobalTimeProvider, RouteTimeProvider } from '@/shared/time';
import { loadEntityRedSignal } from '@/features/entity/queries';
import { loadServices, loadServiceDetail, loadServiceOperations, loadServiceTraceFreshness } from '../api/services-api';
import { useServicesController } from './use-services-controller';
import { loadServicePerformance } from '../api/service-performance';
vi.mock('../api/service-performance', () => ({ loadServicePerformance: vi.fn() }));
vi.mock('../api/services-api', () => ({
  loadServices: vi.fn(),
  loadServiceDetail: vi.fn(),
  loadServiceOperations: vi.fn(),
  loadServiceTraceFreshness: vi.fn()
}));
vi.mock('@/features/entity/queries', async original => ({
  ...(await original<typeof import('@/features/entity/queries')>()),
  loadEntityRedSignal: vi.fn()
}));
const base = '/observability/services?start=1750000000000&end=1750000060000&timeZone=UTC';
const page = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 };
const detail = {
  entity: { id: 7, type: 'service', name: 'checkout' },
  identities: [],
  relations: [],
  monitorPreview: { items: [], total: 0, complete: true }
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadServicePerformance).mockResolvedValue({
    state: 'ready',
    candidateLimit: 500,
    totalElements: 0,
    content: [],
    pageIndex: 0,
    pageSize: 10,
    sort: 'errorCount',
    order: 'desc',
    window: { start: 1750000000000, end: 1750000060000 },
    population: 'observed_server_spans',
    source: 'greptime_flow',
    resolutionSeconds: 60
  });
  vi.mocked(loadServices).mockResolvedValue(page);
  vi.mocked(loadServiceDetail).mockResolvedValue(detail);
  vi.mocked(loadServiceOperations).mockResolvedValue([]);
  vi.mocked(loadServiceTraceFreshness).mockResolvedValue(null);
  vi.mocked(loadEntityRedSignal).mockRejectedValue(new Error('unavailable'));
});
afterEach(cleanup);
function wrapper(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: PropsWithChildren) => (
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={client}>
        <GlobalTimeProvider>
          <RouteTimeProvider policy="route_owned" canonicalizeInvalidExact={false}>
            {children}
          </RouteTimeProvider>
        </GlobalTimeProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}
describe('services query controller boundaries', () => {
  it('keeps two invalid time markers through service selection and refresh until an explicit preset Query', async () => {
    const { result } = renderHook(useServicesController, {
      wrapper: wrapper('/observability/services?start=broken&end=broken&timeZone=UTC')
    });
    act(() => result.current.actions.select(7));
    await waitFor(() => expect(result.current.state.detail.kind).toBe('ready'));
    expect(result.current.state.validWindow).toBe(false);
    act(() => result.current.actions.refresh());
    expect(loadEntityRedSignal).not.toHaveBeenCalled();
    expect(loadServiceOperations).not.toHaveBeenCalled();
    act(() => result.current.actions.page(1));
    expect(result.current.state.validWindow).toBe(false);
    act(() => result.current.actions.updateDraft({ search: '', environment: '', range: '15m' }));
    act(() => result.current.actions.query());
    await waitFor(() => expect(result.current.state.operations.kind).toBe('ready'));
    expect(result.current.state.query.end! - result.current.state.query.start!).toBe(900000);
  });

  it('aborts an old selected service request and rejects its late result after selection changes', async () => {
    let finish: (value: typeof detail) => void = () => {};
    let oldSignal: AbortSignal | undefined;
    vi.mocked(loadServiceDetail).mockImplementation((id, signal) => {
      if (id === 7) {
        oldSignal = signal;
        return new Promise(resolve => {
          finish = resolve;
        });
      }
      return Promise.resolve({ ...detail, entity: { ...detail.entity, id, name: 'inventory' } });
    });
    const { result } = renderHook(useServicesController, { wrapper: wrapper(`${base}&entityId=7`) });
    await waitFor(() => expect(oldSignal).toBeDefined());
    act(() => result.current.actions.select(8));
    await waitFor(() =>
      expect(result.current.state.detail).toMatchObject({ kind: 'ready', data: { entity: { id: 8 } } })
    );
    expect(oldSignal!.aborted).toBe(true);
    act(() => finish(detail));
    expect(result.current.state.detail).toMatchObject({ kind: 'ready', data: { entity: { id: 8 } } });
    expect(result.current.state.paths.traces).toContain('entityId=8');
  });

  it('keeps identity during refresh without promoting cached RED values and clears it on selection change', async () => {
    const identity = {
      workspaceId: 'default',
      entityId: '7',
      entityType: 'service',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      deploymentEnvironment: 'prod'
    };
    vi.mocked(loadEntityRedSignal).mockResolvedValueOnce({
      state: 'empty',
      source: 'greptime_flow',
      resolutionSeconds: 60,
      window: { start: 1750000000000, end: 1750000060000 },
      identity,
      summary: null,
      series: []
    });
    const { result } = renderHook(useServicesController, { wrapper: wrapper(`${base}&entityId=7`) });
    await waitFor(() => expect(result.current.state.red.kind).toBe('ready'));
    vi.mocked(loadEntityRedSignal).mockImplementation(() => new Promise(() => {}));
    act(() => result.current.actions.refresh());
    await waitFor(() => expect(result.current.state.red.kind).toBe('loading'));
    expect(result.current.state).toMatchObject({ identity });
    expect(result.current.state.red).not.toHaveProperty('data');
    act(() => result.current.actions.select(8));
    expect(result.current.state).not.toMatchObject({ identity });
  });

  it('queries server performance by default and keeps committed view/sort/page across detail selection', async () => {
    const { result } = renderHook(useServicesController, {
      wrapper: wrapper(base + '&view=performance&sort=name&order=asc&pageIndex=2')
    });
    await waitFor(() => expect(result.current.state.performance?.kind).toBe('ready'));
    expect(loadServices).not.toHaveBeenCalled();
    act(() => result.current.actions.select(7));
    await waitFor(() => expect(result.current.state.detail.kind).toBe('ready'));
    const calls = vi.mocked(loadServicePerformance).mock.calls.length;
    act(() => result.current.actions.refresh());
    expect(loadServicePerformance).toHaveBeenCalledTimes(calls);
    expect(result.current.state.query).toMatchObject({ view: 'performance', sort: 'name', order: 'asc', pageIndex: 2 });
    act(() => result.current.actions.directory());
    await waitFor(() => expect(result.current.state.query.entityId).toBeUndefined());
    expect(result.current.state.query.pageIndex).toBe(2);
    act(() => result.current.actions.directoryQuery({ sort: 'errorCount' }));
    await waitFor(() => expect(result.current.state.query.sort).toBe('errorCount'));
    expect(result.current.state.query.pageIndex).toBeUndefined();
  });

  it('aborts stale performance reads and switches explicitly to registered without a hidden ranking fetch', async () => {
    let finish: ((value: Awaited<ReturnType<typeof loadServicePerformance>>) => void) | undefined;
    const reply = {
      state: 'ready',
      candidateLimit: 500,
      totalElements: 0,
      content: [],
      pageIndex: 0,
      pageSize: 10,
      sort: 'errorRate',
      order: 'asc',
      window: { start: 1750000000000, end: 1750000060000 },
      population: 'observed_server_spans',
      source: 'greptime_flow',
      resolutionSeconds: 60
    } as const;
    vi.mocked(loadServicePerformance).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    vi.mocked(loadServicePerformance).mockResolvedValue({ ...reply, content: [] });
    const { result } = renderHook(useServicesController, {
      wrapper: wrapper(base + '&search=checkout&environmentFilter=prod&pageIndex=2')
    });
    await waitFor(() => expect(loadServicePerformance).toHaveBeenCalledOnce());
    const oldSignal = vi.mocked(loadServicePerformance).mock.calls[0]![1]!;
    act(() => result.current.actions.directoryQuery({ sort: 'errorRate', order: 'asc' }));
    await waitFor(() => expect(result.current.state.performance?.kind).toBe('ready'));
    expect(oldSignal.aborted).toBe(true);
    await act(async () => {
      finish?.({ ...reply, content: [], totalElements: 7 });
      await Promise.resolve();
    });
    expect(result.current.state.performance).toMatchObject({ data: { totalElements: 0 } });
    act(() => result.current.actions.directoryQuery({ view: 'registered', sort: undefined, order: undefined }));
    await waitFor(() => expect(result.current.state.list.kind).toBe('ready'));
    expect(result.current.state.query).toMatchObject({
      view: 'registered',
      search: 'checkout',
      environmentFilter: 'prod'
    });
    expect(result.current.state.query.sort).toBeUndefined();
    expect(result.current.state.query.pageIndex).toBeUndefined();
    const reads = vi.mocked(loadServicePerformance).mock.calls.length;
    act(() => result.current.actions.refresh());
    expect(loadServicePerformance).toHaveBeenCalledTimes(reads);
  });

  it('refreshes only catalog when nothing is selected', async () => {
    const { result } = renderHook(useServicesController, { wrapper: wrapper(base + '&view=registered') });
    await waitFor(() => expect(result.current.state.list.kind).toBe('ready'));
    act(() => result.current.actions.refresh());
    await waitFor(() => expect(loadServices).toHaveBeenCalledTimes(2));
    expect(loadServiceDetail).not.toHaveBeenCalled();
    expect(loadEntityRedSignal).not.toHaveBeenCalled();
    expect(loadServiceOperations).not.toHaveBeenCalled();
    expect(loadServiceTraceFreshness).not.toHaveBeenCalled();
  });
  it('does not turn loading or inaccessible selected service into global signal links', async () => {
    vi.mocked(loadServiceDetail).mockRejectedValue(new Error('missing'));
    const { result } = renderHook(useServicesController, { wrapper: wrapper(`${base}&entityId=7`) });
    expect(result.current.state.paths.traces).toBe('');
    await waitFor(() => expect(result.current.state.detail.kind).toBe('error'));
    expect(result.current.state.paths.logs).toBe('');
    act(() => result.current.actions.refresh());
    expect(loadServiceOperations).not.toHaveBeenCalled();
    expect(loadEntityRedSignal).not.toHaveBeenCalled();
  });
  it('blocks invalid exact windows instead of widening them on refresh', async () => {
    const { result } = renderHook(useServicesController, {
      wrapper: wrapper('/observability/services?entityId=7&start=broken&end=1750000060000&timeZone=UTC')
    });
    await waitFor(() => expect(result.current.state.detail.kind).toBe('ready'));
    expect(result.current.state.validWindow).toBe(false);
    act(() => result.current.actions.refresh());
    expect(loadServiceOperations).not.toHaveBeenCalled();
    expect(loadEntityRedSignal).not.toHaveBeenCalled();
  });
  it('isolates RED failure from operations and treats missing freshness as an honest unknown', async () => {
    const { result } = renderHook(useServicesController, { wrapper: wrapper(`${base}&entityId=7`) });
    await waitFor(() => expect(result.current.state.red.kind).toBe('error'));
    expect(result.current.state.operations).toEqual({ kind: 'ready', data: [] });
    expect(result.current.state.freshness).toEqual({ kind: 'ready', data: null });
    expect(result.current.state.paths.traces).toContain('entityId=7');
  });
  it('stages the time preset until Query, then retires the old window', async () => {
    const { result } = renderHook(useServicesController, { wrapper: wrapper(`${base}&entityId=7`) });
    await waitFor(() => expect(result.current.state.operations.kind).toBe('ready'));
    act(() => result.current.actions.updateDraft({ search: '', environment: '', range: '15m' }));
    expect(result.current.state.query.start).toBe(1750000000000);
    expect(loadServiceOperations).toHaveBeenCalledTimes(1);
    act(() => result.current.actions.query());
    await waitFor(() => expect(result.current.state.query.end! - result.current.state.query.start!).toBe(900000));
    expect(result.current.state.query.entityId).toBe('7');
  });
});
