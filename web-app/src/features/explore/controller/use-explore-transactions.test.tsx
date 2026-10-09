/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { QueryContextProvider } from '@/shared/query-context';
import { GlobalTimeProvider, RouteTimeProvider } from '@/shared/time';
import { useExplorePageController } from './use-explore-page-controller';
import { loadLogHistoryEvidence } from '../api/explore-api';
import { loadLogTransactions } from '../api/explore-log-transactions-api';
vi.mock('../api/explore-api', async original => ({
  ...(await original<typeof import('../api/explore-api')>()),
  loadLogHistoryEvidence: vi.fn()
}));
vi.mock('../api/explore-log-transactions-api', async original => ({
  ...(await original<typeof import('../api/explore-log-transactions-api')>()),
  loadLogTransactions: vi.fn()
}));
const config = JSON.stringify({ version: 1, field: 'attribute:requestId', limit: 20, order: 'related-count-desc' });
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('routes applied Transactions exclusively, stages mode without fetching, and refreshes the shared relative window', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(2_000_000);
  vi.mocked(loadLogTransactions).mockImplementation((_path, window) =>
    Promise.resolve({
      window: { start: window.from, end: window.to },
      request: {
        version: 1,
        field: { id: 'attribute:requestId', source: 'attribute', key: 'requestId' },
        limit: 20,
        order: 'related-count-desc'
      },
      seedLogCount: 0,
      usableSeedLogCount: 0,
      oversizedSeedLogCount: 0,
      otherExcludedSeedLogCount: 0,
      transactionCount: 0,
      relatedLogCount: 0,
      truncated: false,
      items: []
    })
  );
  let current: ReturnType<typeof useExplorePageController> | undefined;
  function Probe() {
    current = useExplorePageController();
    return null;
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      {
        path: '/explore',
        element: (
          <QueryClientProvider client={client}>
            <QueryContextProvider>
              <GlobalTimeProvider>
                <RouteTimeProvider policy="route_owned" canonicalizeInvalidExact={false}>
                  <Probe />
                </RouteTimeProvider>
              </GlobalTimeProvider>
            </QueryContextProvider>
          </QueryClientProvider>
        )
      }
    ],
    {
      initialEntries: [
        '/explore?signal=logs&timeRange=last-30m&logAggregation=transactions&logTransactions=' +
          encodeURIComponent(config)
      ]
    }
  );
  render(<RouterProvider router={router} />);
  await waitFor(() => expect(current?.transactions.state).toBe('ready'));
  expect(loadLogHistoryEvidence).not.toHaveBeenCalled();
  const original = vi.mocked(loadLogTransactions).mock.calls[0]?.[1];
  act(() => current?.submission.updateField({ field: 'logAggregation', value: 'fields' }));
  expect(loadLogHistoryEvidence).not.toHaveBeenCalled();
  expect(loadLogTransactions).toHaveBeenCalledTimes(1);
  clock.mockReturnValue(2_010_000);
  await act(async () => {
    await current?.refresh();
  });
  await waitFor(() => expect(loadLogTransactions).toHaveBeenCalledTimes(2));
  expect(vi.mocked(loadLogTransactions).mock.calls[1]?.[1].to).toBeGreaterThan(original!.to);
  expect(loadLogHistoryEvidence).not.toHaveBeenCalled();
  expect(current?.transactions.window?.to).toBe(2_010_000);
});
