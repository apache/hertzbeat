/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { useQueryContext } from './query-context-context';
import { QueryContextProvider } from './query-context-provider';

describe('QueryContextProvider', () => {
  it('converges on Router POP and removes sensitive inbound URL fields', async () => {
    const routed = renderProvider(
      [
        '/explore?signal=logs&collectorId=east&serviceName=checkout',
        '/explore?signal=logs&collectorId=west&serviceName=payments&token=leak'
      ],
      1
    );

    await waitFor(() =>
      expect(routed.current().context).toMatchObject({ collectorId: 'west', serviceName: 'payments' })
    );
    await waitFor(() => expect(routed.router.state.location.search).not.toContain('token'));
    await act(async () => routed.router.navigate(-1));
    await waitFor(() =>
      expect(routed.current().context).toMatchObject({ collectorId: 'east', serviceName: 'checkout' })
    );
    await act(async () => routed.router.navigate(1));
    await waitFor(() =>
      expect(routed.current().context).toMatchObject({ collectorId: 'west', serviceName: 'payments' })
    );
    expect(routed.router.state.location.search).not.toContain('token');
  });

  it('pushes canonical hierarchy changes through Router without persisting secrets', async () => {
    const routed = renderProvider(['/explore?signal=metrics&collectorId=east&serviceName=checkout&environment=prod']);
    act(() => routed.current().update({ collectorId: 'west' }));
    await waitFor(() => expect(routed.router.state.location.search).toBe('?signal=metrics&collectorId=west'));
    expect(JSON.stringify(routed.current())).not.toContain('localStorage');
  });
});

function renderProvider(entries: string[], initialIndex = 0) {
  let value: ReturnType<typeof useQueryContext> | undefined;
  function Probe() {
    value = useQueryContext();
    return null;
  }
  const router = createMemoryRouter(
    [
      {
        path: '/explore',
        element: (
          <QueryContextProvider>
            <Probe />
          </QueryContextProvider>
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
      if (!value) throw new Error('query context not mounted');
      return value;
    }
  };
}
