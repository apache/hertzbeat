/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseHertzBeatDashboardDocument, DEFAULT_LOG_ANALYSIS, encodeLogAnalysis } from '@/platform/perses';
import type { DashboardPanelHandoff } from '@/shared/navigation/signal-dashboard-paths';

import { ExploreDashboardAction } from './explore-dashboard-action';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const query = {
  signal: 'metrics' as const,
  timeRange: 'last-30m' as const,
  query: 'jvm_memory_used_bytes',
  serviceName: 'checkout'
};
const timeWindow = { from: 1000, to: 2000 };
function setup(overrides: Partial<React.ComponentProps<typeof ExploreDashboardAction>> = {}) {
  const router = createMemoryRouter(
    [
      {
        path: '/explore',
        element: (
          <ExploreDashboardAction
            query={query}
            timeWindow={timeWindow}
            timeZone="UTC"
            canWrite
            blocked={false}
            dirty={false}
            {...overrides}
          />
        )
      },
      { path: '/observability/dashboards', element: <div>Destination</div> }
    ],
    { initialEntries: ['/explore'] }
  );
  render(<RouterProvider router={router} />);
  return router;
}
describe('Explore add to Dashboard', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  it('hands off a validated local draft and exact investigation window without a persistence call', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const router = setup();
    fireEvent.click(screen.getByRole('button', { name: 'signalDashboard.addFromExplore' }));
    await screen.findByText('Destination');
    const { dashboardPanelHandoff: handoff } = router.state.location.state as {
      dashboardPanelHandoff: DashboardPanelHandoff;
    };
    const document = parseHertzBeatDashboardDocument(handoff.document);
    expect(handoff).toMatchObject({ version: 1, timeWindow, document: { kind: 'Dashboard' } });
    expect(Object.keys(document.spec.panels)).toHaveLength(1);
    expect(new URL(handoff.returnTo, 'https://local.test').searchParams.get('serviceName')).toBe('checkout');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
  it.each([
    { dirty: true },
    { blocked: true },
    { timeWindow: undefined },
    { query: { ...query, metricPlan: '{invalid' } }
  ])('blocks unsafe or unapplied context %j', props => {
    const router = setup(props);
    expect(screen.getByRole('button', { name: 'signalDashboard.addFromExplore' })).toBeDisabled();
    expect(router.state.location.pathname).toBe('/explore');
  });
  it.each(['broken'])('blocks unsupported applied log analysis without navigation', logAnalysis => {
    const router = setup({ query: { signal: 'logs', timeRange: 'last-30m', logAnalysis } });
    const button = screen.getByRole('button', { name: 'signalDashboard.addFromExplore' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(router.state.location.pathname).toBe('/explore');
  });
  it('hands off applied analytical logs without writing a dashboard', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const router = setup({
      query: {
        signal: 'logs',
        timeRange: 'last-30m',
        logAnalysis: encodeLogAnalysis({ ...DEFAULT_LOG_ANALYSIS, representation: 'toplist' })
      }
    });
    fireEvent.click(screen.getByRole('button', { name: 'signalDashboard.addFromExplore' }));
    await screen.findByText('Destination');
    const { dashboardPanelHandoff } = router.state.location.state as { dashboardPanelHandoff: DashboardPanelHandoff };
    const document = parseHertzBeatDashboardDocument(dashboardPanelHandoff.document);
    expect(document.spec.panels.explore?.spec.queries[0].spec.plugin.spec.query).toMatchObject({
      signal: 'logs',
      queryKind: 'analysis',
      analysis: { representation: 'toplist' }
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('does not expose an authoring action to read-only users', () => {
    setup({ canWrite: false });
    expect(screen.queryByRole('button', { name: 'signalDashboard.addFromExplore' })).not.toBeInTheDocument();
  });
});
