/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import { draftFromQuery } from '../model/explore-submission-model';
import { ExploreQueryBody } from './explore-query-body';
const t = ((key: string) => key) as TFunction;
afterEach(cleanup);
it('places trace basics before facets while retaining other signal and structure order', () => {
  const query = { signal: 'traces' as const, timeRange: 'last-30m' as const };
  const props = {
    t,
    submit: vi.fn(),
    facets: <div>facet-content</div>,
    results: <div>result-content</div>,
    children: <div>basic-content</div>
  };
  const view = render(<ExploreQueryBody {...props} query={query} draft={draftFromQuery(query)} />);
  const basics = screen.getByRole('region', { name: 'exploreTrace.layout.basicFilters' });
  expect(basics).toContainElement(screen.getByText('basic-content'));
  expect(
    basics.compareDocumentPosition(screen.getByText('facet-content')) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
  const metrics = { signal: 'metrics' as const, timeRange: 'last-30m' as const };
  view.rerender(<ExploreQueryBody {...props} query={metrics} draft={draftFromQuery(metrics)} />);
  expect(screen.queryByRole('region', { name: 'exploreTrace.layout.basicFilters' })).not.toBeInTheDocument();
  expect(
    screen.getByText('facet-content').compareDocumentPosition(screen.getByText('basic-content')) &
      Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
  const draft = draftFromQuery(query);
  if (draft.signal !== 'traces') throw Error('Expected trace draft');
  view.rerender(<ExploreQueryBody {...props} query={query} draft={{ ...draft, traceStructure: '{}' }} />);
  expect(screen.queryByRole('region', { name: 'exploreTrace.layout.basicFilters' })).not.toBeInTheDocument();
});
