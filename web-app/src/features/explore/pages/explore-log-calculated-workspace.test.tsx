/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { TFunction } from 'i18next';
import { afterEach, expect, it, vi } from 'vitest';
import { loadLogPatternSample } from '../api/explore-log-patterns-api';
import type { LogRow } from '../model/explore-signal-contract';
import { ExploreLogCalculatedWorkspace } from './explore-log-calculated-workspace';

vi.mock('../api/explore-log-patterns-api', () => ({
  buildLogPatternSamplePath: () => '/api/logs/list?proof=1',
  loadLogPatternSample: vi.fn()
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const raw = JSON.stringify({
  version: 1,
  name: 'attempt',
  kind: 'extract',
  source: 'body',
  before: 'attempt ',
  after: ' failed'
});
const t = ((key: string) => key) as TFunction;
function show(calculated = raw) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ExploreLogCalculatedWorkspace
        query={{ signal: 'logs', timeRange: 'last-30m', logAggregation: 'calculated', logCalculated: calculated }}
        window={{ from: 1000, to: 2000 }}
        revision={0}
        t={t}
      />
    </QueryClientProvider>
  );
}
it('shows the derived value alongside the unmodified source log', async () => {
  vi.mocked(loadLogPatternSample).mockResolvedValueOnce({
    content: [{ body: 'payment attempt 202 failed', timeUnixNano: '1000000000' } as LogRow],
    totalElements: 3,
    totalPages: 1,
    number: 0,
    size: 1000
  });
  show();
  expect(await screen.findByRole('columnheader', { name: 'attempt' })).toBeVisible();
  expect(screen.getByRole('cell', { name: '202' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'payment attempt 202 failed' })).toBeVisible();
  expect(screen.getByText('explore.logCalculated.truncated')).toBeVisible();
});
it('shows sample failure and retries the same query', async () => {
  vi.mocked(loadLogPatternSample)
    .mockRejectedValueOnce(new Error('store unavailable'))
    .mockResolvedValueOnce({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 1000 });
  show();
  expect(await screen.findByText('explore.logCalculated.error')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
  expect(await screen.findByText('explore.logCalculated.empty')).toBeVisible();
  expect(loadLogPatternSample).toHaveBeenCalledTimes(2);
});
it('rejects invalid descriptors without requesting a widened query', () => {
  show('broken');
  expect(screen.getByRole('alert')).toHaveTextContent('explore.logCalculated.invalid');
  expect(loadLogPatternSample).not.toHaveBeenCalled();
});
