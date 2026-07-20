/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { useSharedTime } from './time-context';
import type { TimeOwnership } from './time-model';
import { GlobalTimeProvider, RouteTimeProvider } from './time-provider';

describe('RouteTimeProvider', () => {
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

  it('exposes a window only for global and route-owned time policies', () => {
    const global = renderTime(['/explore'], 0, 'global');
    expect(global.current().window).toEqual(
      expect.objectContaining({ from: expect.any(Number), to: expect.any(Number) })
    );
    global.unmount();

    const routeOwned = renderTime(['/explore?start=1000&end=2000'], 0, 'route_owned');
    expect(routeOwned.current().window).toEqual({ from: 1_000, to: 2_000 });
    routeOwned.unmount();

    const none = renderTime(['/explore'], 0, 'none');
    expect(none.current().window).toBeUndefined();
    none.unmount();

    const unknown = renderTime(['/explore'], 0, 'unknown');
    expect(unknown.current().window).toBeUndefined();
    unknown.unmount();
  });
});

function renderTime(entries: string[], initialIndex = 0, policy: TimeOwnership = 'route_owned') {
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
            <RouteTimeProvider policy={policy}>
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
