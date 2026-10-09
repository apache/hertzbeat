/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import type { TFunction } from 'i18next';
import { afterEach, expect, it, vi } from 'vitest';
import { ExploreLogsPanel } from './explore-logs-panel';

vi.mock('./explore-logs-query-authoring', () => ({ LogsQueryAuthoring: () => null }));
vi.mock('./explore-log-trend-region', () => ({ ExploreLogTrendRegion: () => null }));
vi.mock('./explore-workspace-log-facets', () => ({ ExploreWorkspaceLogFacets: () => null }));
vi.mock('../components/explore-logs-comparison-drawer', () => ({ ExploreLogsComparisonDrawer: () => null }));
vi.mock('../components/explore-logs-forms', () => ({
  ExploreLogsFacetRail: ({ hidden }: { hidden: boolean }) => <aside hidden={hidden} aria-label="Facets" />
}));
vi.mock('../components/explore-log-facet-visibility', () => ({
  LogFacetVisibilityButton: () => <button>Toggle facets</button>
}));
vi.mock('./explore-log-result-header', () => ({ hasLogResultHeader: () => false }));
afterEach(cleanup);

it('gives Live Tail the full result width and restores historical facets on mode changes', () => {
  const props = {
    controller: { query: { signal: 'logs', live: true }, submission: { draft: { signal: 'logs' } } },
    t: ((key: string) => key) as TFunction,
    results: <p>Received logs</p>
  } as unknown as ComponentProps<typeof ExploreLogsPanel>;
  const view = render(<ExploreLogsPanel {...props} />);
  expect(screen.queryByRole('complementary', { hidden: true })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Toggle facets' })).not.toBeInTheDocument();
  expect(view.container.querySelector('[data-explore-logs-region="body"]')).toHaveAttribute(
    'data-facets-visible',
    'false'
  );
  expect(screen.getByText('Received logs')).toBeVisible();
  view.rerender(
    <ExploreLogsPanel
      {...props}
      controller={{ ...props.controller, query: { signal: 'logs', timeRange: 'last-24h' } }}
    />
  );
  expect(screen.getByRole('complementary', { name: 'Facets' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Toggle facets' })).toBeVisible();
  expect(view.container.querySelector('[data-explore-logs-region="body"]')).toHaveAttribute(
    'data-facets-visible',
    'true'
  );
});
