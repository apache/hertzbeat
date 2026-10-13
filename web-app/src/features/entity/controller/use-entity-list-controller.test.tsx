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
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ loadEntities: vi.fn() }));
const capability = vi.hoisted(() => ({ useEntityCapabilities: vi.fn() }));
vi.mock('../api/entity-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/entity-api')>()),
  ...api
}));
vi.mock('./use-entity-capabilities', () => capability);

import { useEntityListController } from './use-entity-list-controller';

describe('useEntityListController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadEntities.mockResolvedValue(page('checkout'));
    capability.useEntityCapabilities.mockReturnValue({ canWrite: true, canDelete: true });
  });
  afterEach(cleanup);

  it('retains unsent search through type, status, sort, pagination and same-search history', async () => {
    const v = renderController('/entities?search=old');
    await waitFor(() => expect(v.current().state.evidence.kind).toBe('ready'));
    act(() => v.current().actions.updateDraft('pending'));
    act(() => v.current().actions.changeFilter('type', 'service'));
    expect(v.current().state.draft).toBe('pending');
    act(() => v.current().actions.changeFilter('status', 'active'));
    expect(v.current().state.draft).toBe('pending');
    act(() => v.current().actions.changeSort('name', 'asc'));
    act(() => v.current().actions.changePage(2, 20));
    expect(v.current().state.query.search).toBe('old');
    expect(v.current().state.draft).toBe('pending');
    await act(() => v.router.navigate(-1));
    expect(v.current().state.draft).toBe('pending');
    await act(() => v.router.navigate(1));
    expect(v.current().state.draft).toBe('pending');
    act(() => v.current().actions.updateDraft('  next  '));
    act(() => v.current().actions.submit());
    expect(v.current().state.draft).toBe('next');
    await act(() => v.router.navigate(-1));
    expect(v.current().state.draft).toBe('old');
    await act(() => v.router.navigate(1));
    expect(v.current().state.draft).toBe('next');
    act(() => v.current().actions.updateDraft('  next  '));
    act(() => v.current().actions.submit());
    expect(v.current().state.draft).toBe('next');
  });

  it('rehydrates the committed search after a detail route unmount', async () => {
    const v = renderController('/entities?search=old');
    await waitFor(() => expect(v.current().state.evidence.kind).toBe('ready'));
    act(() => v.current().actions.updateDraft('pending'));
    await act(() => v.router.navigate('/entities/7'));
    await act(() => v.router.navigate(-1));
    expect(v.current().state.draft).toBe('old');
  });

  it('applies and clears canonical or custom types with page reset while preserving unsent search through history', async () => {
    const routed = renderController('/entities?search=old&pageIndex=3&type=vendor_resource');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));
    expect(routed.current().state.query.type).toBe('vendor_resource');
    act(() => routed.current().actions.updateDraft('pending'));
    act(() => routed.current().actions.changeFilter('type', 'service'));
    await waitFor(() =>
      expect(api.loadEntities).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: 'service', search: 'old', pageIndex: 0 }),
        expect.any(AbortSignal)
      )
    );
    act(() => routed.current().actions.changeFilter('type', 'custom_type/v2'));
    expect(routed.current().state.query.type).toBe('custom_type/v2');
    expect(new URLSearchParams(routed.router.state.location.search).get('type')).toBe('custom_type/v2');
    act(() => routed.current().actions.changeFilter('type', ''));
    expect(new URLSearchParams(routed.router.state.location.search).has('type')).toBe(false);
    await act(() => routed.router.navigate(-1));
    expect(routed.current().state.query.type).toBe('custom_type/v2');
    expect(routed.current().state.navigation).toEqual({ key: routed.router.state.location.key, type: 'POP' });
    expect(routed.current().state.draft).toBe('pending');
    await act(() => routed.router.navigate(-1));
    expect(routed.current().state.query.type).toBe('service');
    await act(() => routed.router.navigate(1));
    expect(routed.current().state.query.type).toBe('custom_type/v2');
    await act(() => routed.router.navigate(1));
    expect(routed.current().state.query.type).toBe('');
    expect(routed.current().state.query.search).toBe('old');
    expect(routed.current().state.draft).toBe('pending');
  });

  it('canonicalizes direct list URLs and drops unrelated parameters', async () => {
    const routed = renderController('/entities?search=%20checkout%20&pageIndex=-1&pageSize=999&token=private');

    await waitFor(() => expect(routed.router.state.location.search).not.toContain('token'));
    expect(routed.router.state.location.search).toBe(
      '?sort=gmtUpdate&order=desc&pageIndex=0&pageSize=10&search=checkout'
    );
  });

  it('cancels the old scope and never publishes its late response over a new query', async () => {
    const old = deferred<ReturnType<typeof page>>();
    const next = deferred<ReturnType<typeof page>>();
    api.loadEntities.mockImplementation((query, signal: AbortSignal) => {
      if (query.search === 'old') {
        signal.addEventListener('abort', () => old.reject(new DOMException('Aborted', 'AbortError')));
        return old.promise;
      }
      return next.promise;
    });
    const routed = renderController('/entities?search=old');
    await waitFor(() => expect(api.loadEntities).toHaveBeenCalledTimes(1));

    await act(() => routed.router.navigate('/entities?search=new'));
    await waitFor(() => expect(api.loadEntities).toHaveBeenCalledTimes(2));
    next.resolve(page('new'));
    await waitFor(() => expect(readyName(routed.current())).toBe('new'));
    expect(api.loadEntities.mock.calls[0]?.[1]).toMatchObject({ aborted: true });
  });

  it('opens detail with the complete canonical list return context', async () => {
    const routed = renderController('/entities?search=checkout&type=service&pageIndex=2&pageSize=20');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));
    act(() => routed.current().actions.open(7));

    await waitFor(() => expect(routed.router.state.location.pathname).toBe('/entities/7'));
    const returnTo = new URLSearchParams(routed.router.state.location.search).get('returnTo');
    expect(returnTo).toBe('/entities?sort=gmtUpdate&order=desc&pageIndex=2&pageSize=20&search=checkout&type=service');
  });

  it('does not navigate to write routes without write permission', async () => {
    capability.useEntityCapabilities.mockReturnValue({ canWrite: false, canDelete: false });
    const routed = renderController('/entities');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));

    act(() => routed.current().actions.importDefinitions());
    act(() => routed.current().actions.create());

    expect(routed.router.state.location.pathname).toBe('/entities');
  });
});

function renderController(entry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let controller: ReturnType<typeof useEntityListController> | undefined;
  function Probe() {
    controller = useEntityListController();
    return null;
  }
  const router = createMemoryRouter(
    [
      {
        path: '/entities',
        element: (
          <QueryClientProvider client={client}>
            <Probe />
          </QueryClientProvider>
        )
      },
      { path: '/entities/:entityId', element: null }
    ],
    { initialEntries: [entry] }
  );
  render(<RouterProvider router={router} />);
  return {
    router,
    current: () => {
      if (!controller) throw new Error('controller not mounted');
      return controller;
    }
  };
}

function page(name: string) {
  return {
    content: [
      {
        id: 7,
        type: 'service',
        name,
        identityCount: 0,
        monitorCount: 0,
        relationCount: 0,
        activeAlertCount: 0
      }
    ],
    totalElements: 1,
    totalPages: 1,
    number: 0,
    size: 10,
    first: true,
    last: true,
    empty: false,
    numberOfElements: 1,
    pageable: {},
    sort: {}
  };
}

function readyName(controller: ReturnType<typeof useEntityListController>) {
  return controller.state.evidence.kind === 'ready' ? controller.state.evidence.records[0]?.name : undefined;
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((complete, fail) => {
    resolve = complete;
    reject = fail;
  });
  return { promise, resolve, reject };
}
