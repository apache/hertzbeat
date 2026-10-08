/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { TFunction } from 'i18next';
import { afterEach, expect, it, vi } from 'vitest';
import { loadLogPatternSample } from '../api/explore-log-patterns-api';
import { ExploreLogPatternWorkspace } from './explore-log-pattern-workspace';

vi.mock('../api/explore-log-patterns-api', () => ({
  buildLogPatternSamplePath: () => '/api/logs/list?proof=1',
  loadLogPatternSample: vi.fn()
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('shows sample failure and recovers the same query through Retry', async () => {
  vi.mocked(loadLogPatternSample)
    .mockRejectedValueOnce(new Error('store unavailable'))
    .mockResolvedValueOnce({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 1000 });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ExploreLogPatternWorkspace
        query={{ signal: 'logs', timeRange: 'last-30m', logAggregation: 'patterns' }}
        window={{ from: 1000, to: 2000 }}
        revision={0}
        t={((key: string) => key) as TFunction}
      />
    </QueryClientProvider>
  );
  expect(await screen.findByText('explore.logPatterns.error')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
  expect(await screen.findByText('explore.logPatterns.empty')).toBeVisible();
  expect(loadLogPatternSample).toHaveBeenCalledTimes(2);
});
