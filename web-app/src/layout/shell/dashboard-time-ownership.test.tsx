/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { HertzBeatShell } from './hertzbeat-shell';

vi.mock('@refinedev/core', () => ({
  useResourceParams: () => ({
    resource: {
      meta: {
        shell: {
          capability: 'supported',
          labelKey: 'signalDashboard.title',
          navigation: true,
          order: 25,
          timePolicy: 'route_owned'
        }
      }
    }
  })
}));
vi.mock('./shell-header', () => ({ ShellHeader: () => null }));
vi.mock('./shell-navigation', () => ({ ShellNavigation: () => null }));
vi.mock('@/shared/investigation', () => ({
  ShellInvestigationProvider: ({ children }: PropsWithChildren) => children
}));

function LocationProbe() {
  return <output aria-label="Current search">{useLocation().search}</output>;
}

describe('Dashboard route time ownership', () => {
  it('preserves malformed explicit time for the feature to block instead of widening it', () => {
    const search = '?dashboard=ops&start=1000&end=invalid';
    const router = createMemoryRouter(
      [{ element: <HertzBeatShell />, children: [{ path: '/observability/dashboards', element: <LocationProbe /> }] }],
      { initialEntries: ['/observability/dashboards' + search] }
    );
    const view = render(<RouterProvider router={router} />);
    expect(screen.getByLabelText('Current search')).toHaveTextContent(search);
    expect(router.state.location.search).toBe(search);
    view.unmount();
    router.dispose();
  });
});
