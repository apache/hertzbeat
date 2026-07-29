/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

const api = vi.hoisted(() => ({ deleteEntity: vi.fn(), loadEntityDetail: vi.fn(), loadEntityMonitors: vi.fn() }));
const modal = vi.hoisted(() => ({ confirm: vi.fn() }));
const capability = vi.hoisted(() => ({ useEntityCapabilities: vi.fn() }));
vi.mock('../api/entity-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/entity-api')>()),
  ...api
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { name?: string }) => (options?.name ? `${key}:${options.name}` : key)
  })
}));
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()),
  App: { useApp: () => ({ modal }) }
}));
vi.mock('./use-entity-capabilities', () => capability);

import { useEntityDetailController } from './use-entity-detail-controller';

const detail = {
  entity: { id: 7, type: 'service', name: 'checkout', displayName: 'Checkout API' },
  identities: [],
  monitorPreview: { items: [], total: 0, complete: true },
  relations: []
};
const monitorPage = {
  content: [{ id: 3, name: 'checkout-http', app: 'website', status: 2 }],
  totalElements: 75,
  totalPages: 2,
  number: 0,
  size: 50
};

describe('useEntityDetailController deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadEntityDetail.mockResolvedValue(detail);
    api.loadEntityMonitors.mockResolvedValue(monitorPage);
    api.deleteEntity.mockResolvedValue(undefined);
    capability.useEntityCapabilities.mockReturnValue({ canWrite: true, canDelete: true });
  });
  afterEach(cleanup);

  it('uses the display name in a precise confirmation and cancellation performs zero writes', async () => {
    const routed = renderController('/entities/7?returnTo=%2Fentities%3Fsearch%3Dcheckout');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));
    act(() => routed.current().actions.remove());

    expect(modal.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'entity.delete.title:Checkout API',
        content: 'entity.delete.description',
        okButtonProps: { danger: true }
      })
    );
    expect(api.deleteEntity).not.toHaveBeenCalled();
  });

  it('does not admit delete when the current session lacks delete permission', async () => {
    capability.useEntityCapabilities.mockReturnValue({ canWrite: true, canDelete: false });
    const routed = renderController('/entities/7');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));
    act(() => routed.current().actions.remove());

    expect(routed.current().state.canDelete).toBe(false);
    expect(modal.confirm).not.toHaveBeenCalled();
    expect(api.deleteEntity).not.toHaveBeenCalled();
  });

  it('does not navigate to write routes without write permission', async () => {
    capability.useEntityCapabilities.mockReturnValue({ canWrite: false, canDelete: false });
    const routed = renderController('/entities/7');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));

    act(() => routed.current().actions.edit());
    act(() => routed.current().actions.definition());

    expect(routed.router.state.location.pathname).toBe('/entities/7');
  });

  it('retires an open delete confirmation when the session loses permission', async () => {
    const routed = renderController('/entities/7');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));
    act(() => routed.current().actions.remove());
    const confirmation = modal.confirm.mock.calls[0]?.[0] as { onOk?: () => Promise<unknown> } | undefined;

    capability.useEntityCapabilities.mockReturnValue({ canWrite: true, canDelete: false });
    await act(() => routed.router.navigate('/entities/7?role=changed'));
    await act(async () => {
      await expect(confirmation?.onOk?.()).resolves.toBeUndefined();
    });

    expect(routed.current().state.canDelete).toBe(false);
    expect(api.deleteEntity).not.toHaveBeenCalled();
  });

  it('refreshes detail through its owned query key without clearing ready evidence', async () => {
    const routed = renderController('/entities/7');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));
    act(() => routed.current().actions.refresh());

    await waitFor(() => expect(api.loadEntityDetail).toHaveBeenCalledTimes(2));
    expect(routed.current().state.evidence.kind).toBe('ready');
  });

  it('loads page zero from the operational endpoint and owns next, previous, and normalized filters', async () => {
    api.loadEntityMonitors.mockImplementation((_id: number, query: { pageIndex: number }) =>
      Promise.resolve({ ...monitorPage, number: query.pageIndex })
    );
    const routed = renderController('/entities/7');
    await waitFor(() => expect(routed.current().state.monitors.evidence.kind).toBe('ready'));
    expect(api.loadEntityMonitors).toHaveBeenLastCalledWith(7, { pageIndex: 0, pageSize: 50 }, expect.any(AbortSignal));

    act(() => routed.current().actions.changeMonitorPage(1));
    await waitFor(() =>
      expect(api.loadEntityMonitors).toHaveBeenLastCalledWith(
        7,
        { pageIndex: 1, pageSize: 50 },
        expect.any(AbortSignal)
      )
    );
    act(() => routed.current().actions.changeMonitorPage(0));
    await waitFor(() => expect(routed.current().state.monitors.query.pageIndex).toBe(0));

    act(() => routed.current().actions.changeMonitorFilters({ status: 2, app: ' website ' }));
    await waitFor(() =>
      expect(api.loadEntityMonitors).toHaveBeenLastCalledWith(
        7,
        { status: 2, app: 'website', pageIndex: 0, pageSize: 50 },
        expect.any(AbortSignal)
      )
    );
    act(() => routed.current().actions.changeMonitorFilters({ app: '   ' }));
    await waitFor(() => expect(routed.current().state.monitors.query).toEqual({ pageIndex: 0, pageSize: 50 }));
  });

  it('keeps detail ready when the monitor section alone is forbidden', async () => {
    api.loadEntityMonitors.mockRejectedValueOnce(new ApiMessageError('private monitor detail', { status: 403 }));
    const routed = renderController('/entities/7');

    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));
    await waitFor(() => expect(routed.current().state.monitors.evidence.kind).toBe('permission'));
    expect(JSON.stringify(routed.current().state)).not.toContain('private');
  });

  it('cancels an old entity scope and never publishes its late detail', async () => {
    const old = deferred<typeof detail>();
    const next = deferred<typeof detail>();
    api.loadEntityDetail.mockImplementation((id: number, signal: AbortSignal) => {
      if (id === 7) {
        signal.addEventListener('abort', () => old.resolve(detail));
        return old.promise;
      }
      return next.promise;
    });
    const routed = renderController('/entities/7');
    await waitFor(() => expect(api.loadEntityDetail).toHaveBeenCalledTimes(1));

    await act(() => routed.router.navigate('/entities/8'));
    next.resolve({ ...detail, entity: { ...detail.entity, id: 8, name: 'payments' } });
    await waitFor(() => expect(readyEntityName(routed.current())).toBe('payments'));
    expect(api.loadEntityDetail.mock.calls[0]?.[1]).toMatchObject({ aborted: true });
  });

  it('resets monitor paging synchronously by entity scope and retires the old monitor request', async () => {
    const old = deferred<typeof monitorPage>();
    const next = deferred<typeof monitorPage>();
    api.loadEntityMonitors.mockImplementation((id: number) => (id === 7 ? old.promise : next.promise));
    const routed = renderController('/entities/7');
    await waitFor(() => expect(api.loadEntityMonitors).toHaveBeenCalledTimes(1));
    act(() => routed.current().actions.changeMonitorPage(1));
    await waitFor(() => expect(api.loadEntityMonitors).toHaveBeenCalledTimes(2));
    const oldPageSignal = api.loadEntityMonitors.mock.calls[1]?.[2] as AbortSignal;

    await act(() => routed.router.navigate('/entities/8'));
    expect(routed.current().state.monitors.query.pageIndex).toBe(0);
    next.resolve({ ...monitorPage, content: [{ id: 8, name: 'payments', app: 'website', status: 1 }] });
    await waitFor(() => expect(readyMonitorName(routed.current())).toBe('payments'));
    expect(oldPageSignal.aborted).toBe(true);
    old.resolve({
      ...monitorPage,
      number: 1,
      content: [{ id: 7, name: 'late-checkout', app: 'website', status: 2 }]
    });
    expect(readyMonitorName(routed.current())).toBe('payments');
  });

  it('does not resurrect an old entity page when navigation returns to that entity', async () => {
    api.loadEntityMonitors.mockImplementation((_id: number, query: { pageIndex: number }) =>
      Promise.resolve({ ...monitorPage, number: query.pageIndex })
    );
    const routed = renderController('/entities/7');
    await waitFor(() => expect(routed.current().state.monitors.evidence.kind).toBe('ready'));
    act(() => routed.current().actions.changeMonitorPage(1));
    await waitFor(() => expect(routed.current().state.monitors.query.pageIndex).toBe(1));

    await act(() => routed.router.navigate('/entities/8'));
    expect(routed.current().state.monitors.query.pageIndex).toBe(0);
    await act(() => routed.router.navigate('/entities/7'));
    expect(routed.current().state.monitors.query.pageIndex).toBe(0);
  });

  it('prevents pending double submit, invalidates entity caches, and returns safely after success', async () => {
    const pending = deferred<void>();
    api.deleteEntity.mockReturnValue(pending.promise);
    const routed = renderController('/entities/7?returnTo=%2Fentities%3Fsearch%3Dcheckout');
    const invalidate = vi.spyOn(routed.client, 'invalidateQueries');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));
    act(() => routed.current().actions.remove());
    const confirmation = modal.confirm.mock.calls[0]?.[0] as { onOk?: () => unknown } | undefined;
    act(() => {
      void confirmation?.onOk?.();
      void confirmation?.onOk?.();
    });

    await waitFor(() => expect(routed.current().state.deleting).toBe(true));
    expect(api.deleteEntity).toHaveBeenCalledTimes(1);
    pending.resolve();
    await waitFor(() => expect(routed.router.state.location.pathname).toBe('/entities'));
    expect(new URLSearchParams(routed.router.state.location.search).get('search')).toBe('checkout');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['entities', 'list'], refetchType: 'none' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['entities', 'detail', 7], refetchType: 'none' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['entities', 'editor', 7], refetchType: 'none' });
  });

  it.each([
    [new ApiMessageError('private permission detail', { status: 403 }), 'permission'],
    [new ApiMessageError('private validation detail', { status: 409 }), 'validation'],
    [new ApiMessageError('private unavailable detail', { status: 503 }), 'unavailable'],
    [new Error('private generic detail'), 'error']
  ] as const)('publishes only the redacted %s failure class', async (failure, expected) => {
    api.deleteEntity.mockRejectedValueOnce(failure);
    const routed = renderController('/entities/7');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));
    act(() => routed.current().actions.remove());
    const confirmation = modal.confirm.mock.calls[0]?.[0] as { onOk?: () => Promise<unknown> } | undefined;
    await act(async () => {
      await expect(confirmation?.onOk?.()).resolves.toBeUndefined();
    });
    await waitFor(() => expect(routed.current().state.deleteFailure).toBe(expected));
    expect(JSON.stringify(routed.current().state)).not.toContain('private');
    expect(routed.router.state.location.pathname).toBe('/entities/7');
  });

  it('treats an already deleted resource as successful convergence', async () => {
    api.deleteEntity.mockRejectedValueOnce(new ApiMessageError('private missing detail', { status: 404 }));
    const routed = renderController('/entities/7?returnTo=%2Fentities');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));
    act(() => routed.current().actions.remove());
    const confirmation = modal.confirm.mock.calls[0]?.[0] as { onOk?: () => Promise<unknown> } | undefined;
    await act(async () => {
      await expect(confirmation?.onOk?.()).resolves.toBeUndefined();
    });
    await waitFor(() => expect(routed.router.state.location.pathname).toBe('/entities'));
  });

  it('opens the matched noise-control destination with entity ownership', async () => {
    api.loadEntityDetail.mockResolvedValueOnce({
      ...detail,
      noiseControls: {
        activeSilenceCount: 1,
        matchingInhibitCount: 0,
        activeSilences: [{ id: 31, name: 'Maintenance', type: 'silence', global: false, matchedLabels: [] }],
        matchingInhibits: [],
        possibleAlertSuppression: true
      }
    });
    const routed = renderController('/entities/7');
    await waitFor(() => expect(routed.current().state.evidence.kind).toBe('ready'));
    act(() => routed.current().actions.manageNoiseControls('silence'));

    await waitFor(() => expect(routed.router.state.location.pathname).toBe('/alerts/silences'));
    expect(routed.router.state.location.search).toContain('entityId=7');
    expect(routed.router.state.location.search).toContain('matchingRuleIds=31');
  });
});

function renderController(entry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let controller: ReturnType<typeof useEntityDetailController> | undefined;
  function Probe() {
    controller = useEntityDetailController();
    return null;
  }
  const router = createMemoryRouter(
    [
      {
        path: '/entities/:entityId',
        element: (
          <QueryClientProvider client={client}>
            <Probe />
          </QueryClientProvider>
        )
      },
      { path: '/entities', element: null },
      { path: '/alerts/silences', element: null }
    ],
    { initialEntries: [entry] }
  );
  render(<RouterProvider router={router} />);
  return {
    client,
    router,
    current: () => {
      if (!controller) throw new Error('controller not mounted');
      return controller;
    }
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>(complete => {
    resolve = complete;
  });
  return { promise, resolve };
}

function readyEntityName(controller: ReturnType<typeof useEntityDetailController>) {
  return controller.state.evidence.kind === 'ready' ? controller.state.evidence.detail.entity.name : undefined;
}

function readyMonitorName(controller: ReturnType<typeof useEntityDetailController>) {
  const evidence = controller.state.monitors.evidence;
  return evidence.kind === 'ready' ? evidence.records[0]?.name : undefined;
}
