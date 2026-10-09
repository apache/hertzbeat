/* Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements. */
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { ExploreActions } from './explore-actions';
vi.mock('../components/explore-share-action', () => ({ ExploreShareAction: () => <button>Share</button> }));
vi.mock('../components/explore-dashboard-action', () => ({ ExploreDashboardAction: () => <button>Dashboard</button> }));
vi.mock('../components/explore-saved-query-actions', () => ({
  ExploreSavedQueryActions: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));
it('keeps removed utilities absent in focused log investigations too', () => {
  const props = {
    controller: { query: { signal: 'logs', logRecordUid: 'record' }, result: {}, transactions: {} },
    savedQueries: {}
  } as unknown as ComponentProps<typeof ExploreActions>;
  render(<ExploreActions {...props} />);
  expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Dashboard' })).not.toBeInTheDocument();
});
