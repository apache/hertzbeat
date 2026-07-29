/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, cleanup, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useSharedTime } from './time-context';
import type { TimeOwnership } from './time-model';
import { GlobalTimeProvider, RouteTimeProvider } from './time-provider';

describe('RouteTimeProvider', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('derives route-owned exact time from canonical URL and converges on POP and refresh', async () => {
    const routed = renderTime(
      ['/explore?signal=logs&start=1000&end=2000', '/explore?signal=traces&start=3000&end=4000'],
      1
    );
    expect(routed.current().window).toEqual({ from: 3_000, to: 4_000 });
    const revision = routed.current().refreshRevision;
    act(() => routed.current().requestRefresh());
    expect(routed.current()).toMatchObject({ window: { from: 3_000, to: 4_000 }, refreshRevision: revision + 1 });
    await act(async () => routed.router.navigate(-1));
    await waitFor(() => expect(routed.current().window).toEqual({ from: 1_000, to: 2_000 }));
    await act(async () => routed.router.navigate(1));
    await waitFor(() => expect(routed.current().window).toEqual({ from: 3_000, to: 4_000 }));
  });

  it('uses Router push for commit and fail-closed replace for invalid exact pairs', async () => {
    const routed = renderTime(['/explore?signal=metrics&start=2000&end=1000']);
    await waitFor(() => expect(routed.router.state.location.search).toBe('?signal=metrics'));
    act(() => routed.current().commitWindow({ from: 5_000, to: 6_000 }));
    await waitFor(() => expect(routed.router.state.location.search).toBe('?signal=metrics&start=5000&end=6000'));
    expect(routed.current().window).toEqual({ from: 5_000, to: 6_000 });
    await act(async () => routed.router.navigate(-1));
    await waitFor(() => expect(routed.router.state.location.search).toBe('?signal=metrics'));
  });

  it('lets a route-owned canonical model preserve invalid exact evidence until it replaces the location', () => {
    const routed = renderTime(['/explore?signal=traces&windowMode=preset&start=1000'], 0, 'route_owned', false);
    expect(routed.router.state.location.search).toBe('?signal=traces&windowMode=preset&start=1000');
    expect(routed.current().headerMode).toBe('hidden');
  });

  it('exposes a window only for global and route-owned time policies', () => {
    const global = renderTime(['/explore'], 0, 'global');
    expect(global.current().window).toEqual(
      expect.objectContaining({ from: expect.any(Number), to: expect.any(Number) })
    );
    global.unmount();

    const routeOwned = renderTime(['/explore?start=1000&end=2000'], 0, 'route_owned');
    expect(routeOwned.current()).toMatchObject({
      window: { from: 1_000, to: 2_000 },
      headerMode: 'exact_window'
    });
    routeOwned.unmount();

    const none = renderTime(['/explore'], 0, 'none');
    expect(none.current().window).toBeUndefined();
    none.unmount();

    const unknown = renderTime(['/explore'], 0, 'unknown');
    expect(unknown.current().window).toBeUndefined();
    unknown.unmount();
  });

  it('shares global auto-refresh for a relative route-owned window without writing exact URL fields', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(2_000_000);
    const routed = renderTime(['/explore?signal=metrics']);
    const initial = routed.current().window;

    act(() => routed.current().setAutoRefresh(30_000));
    expect(routed.current()).toMatchObject({
      headerMode: 'hidden',
      autoRefreshMs: 30_000,
      refreshRevision: 0
    });
    await act(async () => vi.advanceTimersByTimeAsync(30_000));

    expect(routed.current()).toMatchObject({
      window: { from: initial!.from + 30_000, to: initial!.to + 30_000 },
      autoRefreshMs: 30_000,
      refreshRevision: 1
    });
    expect(routed.router.state.location.search).toBe('?signal=metrics');
  });

  it('keeps an exact route-owned window fixed and rejects auto-refresh activation', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(2_000_000);
    const routed = renderTime(['/explore?signal=traces&start=1000&end=2000']);

    act(() => routed.current().setAutoRefresh(30_000));
    await act(async () => vi.advanceTimersByTimeAsync(60_000));

    expect(routed.current()).toMatchObject({
      window: { from: 1_000, to: 2_000 },
      autoRefreshMs: 0,
      remainingMs: null,
      refreshRevision: 0
    });
    expect(routed.router.state.location.search).toContain('start=1000&end=2000');
  });
});

function renderTime(
  entries: string[],
  initialIndex = 0,
  policy: TimeOwnership = 'route_owned',
  canonicalizeInvalidExact = true
) {
  let value: ReturnType<typeof useSharedTime> | undefined;
  function Probe() {
    value = useSharedTime();
    return null;
  }
  const router = createMemoryRouter(
    [
      {
        path: '/explore',
        element: (
          <GlobalTimeProvider>
            <RouteTimeProvider policy={policy} canonicalizeInvalidExact={canonicalizeInvalidExact}>
              <Probe />
            </RouteTimeProvider>
          </GlobalTimeProvider>
        )
      }
    ],
    { initialEntries: entries, initialIndex }
  );
  const view = render(<RouterProvider router={router} />);
  return {
    router,
    unmount: view.unmount,
    current: () => {
      if (!value) throw new Error('shared time not mounted');
      return value;
    }
  };
}
