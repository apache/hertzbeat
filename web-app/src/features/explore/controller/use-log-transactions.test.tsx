/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { loadLogTransactions } from '../api/explore-log-transactions-api';
import { useLogTransactions } from './use-log-transactions';
vi.mock('../api/explore-log-transactions-api', async original => ({
  ...(await original<typeof import('../api/explore-log-transactions-api')>()),
  loadLogTransactions: vi.fn()
}));
const window = { from: 1000, to: 2000 };
const config = JSON.stringify({ version: 1, field: 'attribute:requestId', limit: 20, order: 'related-count-desc' });
const query = {
  signal: 'logs' as const,
  timeRange: 'last-30m' as const,
  logAggregation: 'transactions',
  logTransactions: config
};
const response = {
  window: { start: 1000, end: 2000 },
  request: {
    version: 1 as const,
    field: { id: 'attribute:requestId', source: 'attribute' as const, key: 'requestId' },
    limit: 20,
    order: 'related-count-desc' as const
  },
  seedLogCount: 0,
  usableSeedLogCount: 0,
  oversizedSeedLogCount: 0,
  otherExcludedSeedLogCount: 0,
  transactionCount: 0,
  relatedLogCount: 0,
  truncated: false,
  items: []
};
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('only fetches valid active applied transactions and never falls back from invalid configuration', async () => {
  vi.mocked(loadLogTransactions).mockResolvedValue(response);
  const hook = renderHook(
    ({ mode, raw }) => useLogTransactions({ ...query, logAggregation: mode, logTransactions: raw }, window, 0, true),
    { initialProps: { mode: 'fields', raw: config }, wrapper: wrapper() }
  );
  expect(loadLogTransactions).not.toHaveBeenCalled();
  hook.rerender({ mode: 'transactions', raw: '{' });
  expect(hook.result.current.state).toBe('invalid');
  expect(loadLogTransactions).not.toHaveBeenCalled();
  hook.rerender({ mode: 'transactions', raw: config });
  await waitFor(() => expect(hook.result.current.state).toBe('ready'));
  expect(hook.result.current.data).toEqual(response);
});
it('aborts old identity-field requests and never exposes their result after mode or scope changes', async () => {
  let signal: AbortSignal | undefined;
  vi.mocked(loadLogTransactions)
    .mockImplementationOnce((_p, _w, _s, abort) => {
      signal = abort;
      return new Promise(() => {});
    })
    .mockResolvedValue(response);
  const hook = renderHook(
    ({ service, mode }) =>
      useLogTransactions({ ...query, serviceName: service, logAggregation: mode }, window, 0, true),
    { initialProps: { service: 'old', mode: 'transactions' }, wrapper: wrapper() }
  );
  await waitFor(() => expect(loadLogTransactions).toHaveBeenCalledTimes(1));
  hook.rerender({ service: 'new', mode: 'transactions' });
  await waitFor(() => expect(hook.result.current.state).toBe('ready'));
  expect(signal?.aborted).toBe(true);
  hook.rerender({ service: 'new', mode: 'fields' });
  expect(hook.result.current.data).toBeUndefined();
});
