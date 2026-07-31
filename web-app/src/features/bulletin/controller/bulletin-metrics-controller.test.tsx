/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BulletinRequestFailure } from '../model/bulletin-failure';
import type { BulletinRefreshSeconds } from '../model/bulletin-refresh-model';
import {
  refreshSavedBulletinMetrics,
  useBulletinMetrics,
  useBulletinMetricsController
} from './bulletin-metrics-controller';
import { bulletinQueryKeys } from './bulletin-query-keys';

const api = vi.hoisted(() => ({ loadBulletinMetrics: vi.fn() }));

vi.mock('../api/bulletin-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/bulletin-api')>()),
  loadBulletinMetrics: api.loadBulletinMetrics
}));

describe('Bulletin metrics controller', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    cleanup();
    focusManager.setFocused(undefined);
  });

  it('does not start a metrics read without read capability', async () => {
    const hook = renderHook(() => useBulletinMetrics(7, false), { wrapper: createWrapper() });

    await act(async () => Promise.resolve());

    expect(hook.result.current).toEqual({ kind: 'idle' });
    expect(api.loadBulletinMetrics).not.toHaveBeenCalled();
  });

  it('classifies a non-empty response with zero rendered fields as empty', async () => {
    api.loadBulletinMetrics.mockResolvedValue({
      name: 'Ops',
      content: [
        {
          monitorName: 'site',
          monitorId: 7,
          host: 'localhost',
          metrics: [{ name: 'responseTime', fields: [[], []] }]
        }
      ]
    });
    const hook = renderHook(() => useBulletinMetrics(7), { wrapper: createWrapper() });

    await waitFor(() => expect(hook.result.current).toEqual({ kind: 'empty' }));
  });

  it('presents metrics permission failure', async () => {
    api.loadBulletinMetrics.mockRejectedValue(new BulletinRequestFailure('permission', 'uncertain'));
    const hook = renderHook(() => useBulletinMetrics(7), { wrapper: createWrapper() });

    await waitFor(() => expect(hook.result.current).toEqual({ kind: 'permission' }));
  });

  it('uses the selected in-memory cadence and disables automatic refresh when Off', async () => {
    vi.useFakeTimers();
    try {
      api.loadBulletinMetrics.mockResolvedValue({ name: 'Ops', content: [] });
      const hook = renderHook(({ refreshSeconds }) => useBulletinMetricsController(7, true, refreshSeconds), {
        initialProps: { refreshSeconds: 10 as BulletinRefreshSeconds },
        wrapper: createWrapper()
      });
      await act(async () => Promise.resolve());
      expect(api.loadBulletinMetrics).toHaveBeenCalledTimes(1);

      await act(async () => vi.advanceTimersByTimeAsync(10_000));
      expect(api.loadBulletinMetrics).toHaveBeenCalledTimes(2);

      hook.rerender({ refreshSeconds: 0 });
      await act(async () => vi.advanceTimersByTimeAsync(30_000));
      expect(api.loadBulletinMetrics).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not start a duplicate automatic request while selected metrics are still loading', async () => {
    vi.useFakeTimers();
    try {
      api.loadBulletinMetrics.mockReturnValue(new Promise(() => undefined));
      renderHook(() => useBulletinMetricsController(7, true, 10), { wrapper: createWrapper() });
      await act(async () => Promise.resolve());
      expect(api.loadBulletinMetrics).toHaveBeenCalledTimes(1);

      await act(async () => vi.advanceTimersByTimeAsync(30_000));
      expect(api.loadBulletinMetrics).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('pauses the selected-metrics cadence while hidden and resumes without a catch-up burst', async () => {
    vi.useFakeTimers();
    focusManager.setFocused(false);
    try {
      api.loadBulletinMetrics.mockResolvedValue({ name: 'Ops', content: [] });
      const client = new QueryClient({
        defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } }
      });
      renderHook(() => useBulletinMetricsController(7, true, 10), { wrapper: createWrapper(client) });
      await act(async () => Promise.resolve());
      expect(api.loadBulletinMetrics).toHaveBeenCalledTimes(1);

      await act(async () => vi.advanceTimersByTimeAsync(30_000));
      expect(api.loadBulletinMetrics).toHaveBeenCalledTimes(1);

      act(() => focusManager.setFocused(true));
      expect(api.loadBulletinMetrics).toHaveBeenCalledTimes(1);
      await act(async () => vi.advanceTimersByTimeAsync(10_000));
      expect(api.loadBulletinMetrics).toHaveBeenCalledTimes(2);
    } finally {
      focusManager.setFocused(undefined);
      vi.useRealTimers();
    }
  });

  it('aborts selected metrics when the Bulletin workspace unmounts', async () => {
    let signal: AbortSignal | undefined;
    api.loadBulletinMetrics.mockImplementation((_id: number, requestSignal: AbortSignal) => {
      signal = requestSignal;
      return new Promise((_resolve, reject) => {
        requestSignal.addEventListener('abort', () => reject(new DOMException('abort', 'AbortError')), { once: true });
      });
    });
    const hook = renderHook(() => useBulletinMetricsController(7, true, 30), { wrapper: createWrapper() });
    await waitFor(() => expect(signal).toBeInstanceOf(AbortSignal));

    hook.unmount();

    expect(signal?.aborted).toBe(true);
  });

  it('cannot manually fetch metrics without a selected Bulletin', async () => {
    api.loadBulletinMetrics.mockResolvedValue({ name: 'Unexpected', content: [] });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const hook = renderHook(() => useBulletinMetrics(null), { wrapper: createWrapper(client) });
    expect(hook.result.current).toEqual({ kind: 'idle' });
    const idleQuery = client.getQueryCache().find({ queryKey: bulletinQueryKeys.metrics(null) });

    await act(async () => {
      await idleQuery?.fetch().catch(() => undefined);
    });

    expect(api.loadBulletinMetrics).not.toHaveBeenCalled();
  });

  it('cancels metrics owned by a retired selection', async () => {
    const requests: Array<{ id: number; signal: AbortSignal }> = [];
    api.loadBulletinMetrics.mockImplementation((id: number, signal: AbortSignal) => {
      requests.push({ id, signal });
      if (id === 8) return Promise.resolve({ name: 'Latest', content: [] });
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('abort', 'AbortError')), { once: true });
      });
    });
    const hook = renderHook(({ id }: { id: number }) => useBulletinMetrics(id), {
      initialProps: { id: 7 },
      wrapper: createWrapper()
    });
    await waitFor(() => expect(requests).toHaveLength(1));

    hook.rerender({ id: 8 });

    await waitFor(() => expect(hook.result.current).toEqual({ kind: 'empty' }));
    expect(requests[0]?.signal.aborted).toBe(true);
    expect(requests[1]).toMatchObject({ id: 8 });
  });

  it('aborts an in-flight manual reread when selection changes and cannot publish it over the new selection', async () => {
    api.loadBulletinMetrics.mockResolvedValueOnce({ name: 'Initial', content: [] });
    const requests: Array<{ id: number; signal: AbortSignal }> = [];
    const hook = renderHook(({ id }) => useBulletinMetricsController(id, true, 0), {
      initialProps: { id: 7 },
      wrapper: createWrapper()
    });
    await waitFor(() => expect(hook.result.current.state).toEqual({ kind: 'empty' }));
    api.loadBulletinMetrics.mockImplementation((id: number, signal: AbortSignal) => {
      requests.push({ id, signal });
      if (id === 8) return Promise.resolve({ name: 'Latest', content: [] });
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('abort', 'AbortError')), { once: true });
      });
    });

    act(() => {
      void hook.result.current.refresh();
    });
    await waitFor(() => expect(requests).toHaveLength(1));
    hook.rerender({ id: 8 });

    await waitFor(() => expect(hook.result.current.state).toEqual({ kind: 'empty' }));
    expect(requests[0]).toMatchObject({ id: 7 });
    expect(requests[0]?.signal.aborted).toBe(true);
    expect(requests[1]).toMatchObject({ id: 8 });
  });

  it('forwards cancellation into an authoritative metrics fetch', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let requestSignal: AbortSignal | undefined;
    api.loadBulletinMetrics.mockImplementation((_id: number, signal: AbortSignal) => {
      requestSignal = signal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('abort', 'AbortError')), { once: true });
      });
    });
    const refresh = refreshSavedBulletinMetrics(client, 7);
    const cancellation = expect(refresh).rejects.toMatchObject({ message: 'CancelledError' });
    await waitFor(() => expect(requestSignal).toBeInstanceOf(AbortSignal));

    await act(async () => client.cancelQueries());

    await cancellation;
    expect(requestSignal?.aborted).toBe(true);
  });
});

function createWrapper(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
