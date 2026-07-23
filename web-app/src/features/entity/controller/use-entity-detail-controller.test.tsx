/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

const api = vi.hoisted(() => ({ deleteEntity: vi.fn(), loadEntityDetail: vi.fn() }));
const modal = vi.hoisted(() => ({ confirm: vi.fn() }));
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

import { useEntityDetailController } from './use-entity-detail-controller';

const detail = {
  entity: { id: 7, type: 'service', name: 'checkout', displayName: 'Checkout API' },
  identities: [],
  boundMonitors: [],
  relations: []
};

describe('useEntityDetailController deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadEntityDetail.mockResolvedValue(detail);
    api.deleteEntity.mockResolvedValue(undefined);
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
      { path: '/entities', element: null }
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
