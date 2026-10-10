/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
const i18n = { t: ((key: string) => key) as TFunction };
import { loadLogTransactionDetail } from '../api/explore-log-transactions-api';
import { ExploreLogTransactionInspection } from './explore-log-transaction-inspection';
vi.mock('../api/explore-log-transactions-api', async original => ({
  ...(await original<typeof import('../api/explore-log-transactions-api')>()),
  loadLogTransactionDetail: vi.fn()
}));
const config = { version: 1 as const, field: 'attribute:requestId', limit: 20, order: 'related-count-desc' as const };
const query = {
  signal: 'logs' as const,
  timeRange: 'last-30m' as const,
  query: 'status:ERROR',
  searchSyntax: 'structured-v1' as const,
  serviceName: 'checkout'
};
const item = {
  identity: 'req-a',
  seedCount: 1,
  relatedCount: 21,
  firstTimeUnixNano: '1000000000',
  lastTimeUnixNano: '2000000000',
  durationNanos: '1000000000',
  maximumSeverity: 'ERROR' as const
};
const response = {
  window: { start: 1000, end: 2000 },
  field: { id: config.field, source: 'attribute' as const, key: 'requestId' },
  identity: 'req-a',
  qualified: true,
  total: 21,
  rows: [],
  offset: 0,
  limit: 20,
  sort: 'oldest' as const
};
function setup(timeZone?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const close = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <ExploreLogTransactionInspection
        query={{ ...query, ...(timeZone ? { timeZone } : {}) }}
        window={{ from: 1000, to: 2000 }}
        config={config}
        item={item}
        t={i18n.t}
        onClose={close}
      />
    </QueryClientProvider>
  );
  return close;
}
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('keeps local draft off wire until Apply, resets paging and never changes fixed identity or seed', async () => {
  vi.mocked(loadLogTransactionDetail).mockResolvedValue(response);
  setup();
  await waitFor(() => expect(loadLogTransactionDetail).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByLabelText(i18n.t('explore.logTransactions.search')), { target: { value: 'payment' } });
  expect(loadLogTransactionDetail).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.logTransactions.apply') }));
  await waitFor(() => expect(loadLogTransactionDetail).toHaveBeenCalledTimes(2));
  expect(vi.mocked(loadLogTransactionDetail).mock.calls[1]?.[3]).toMatchObject({
    identity: 'req-a',
    search: 'payment',
    pageIndex: 0,
    sort: 'oldest'
  });
  expect(vi.mocked(loadLogTransactionDetail).mock.calls[1]?.[0]).toContain('search=status%3AERROR');
  await waitFor(() =>
    expect(screen.getByRole('button', { name: i18n.t('explore.logTransactions.next') })).not.toBeDisabled()
  );
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.logTransactions.next') }));
  await waitFor(() => expect(loadLogTransactionDetail).toHaveBeenCalledTimes(3));
  expect(vi.mocked(loadLogTransactionDetail).mock.calls[2]?.[3].pageIndex).toBe(1);
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.logTransactions.reset') }));
  await waitFor(() => expect(loadLogTransactionDetail).toHaveBeenCalledTimes(4));
  expect(vi.mocked(loadLogTransactionDetail).mock.calls[3]?.[3]).toMatchObject({ search: '', pageIndex: 0 });
});
it('aborts old local search and displays only the current failure/qualification state', async () => {
  let signal: AbortSignal | undefined;
  vi.mocked(loadLogTransactionDetail)
    .mockImplementationOnce((_p, _w, _c, _d, s) => {
      signal = s;
      return new Promise(() => {});
    })
    .mockResolvedValue({ ...response, qualified: false, total: null });
  const close = setup();
  await waitFor(() => expect(loadLogTransactionDetail).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByLabelText(i18n.t('explore.logTransactions.search')), { target: { value: 'next' } });
  fireEvent.click(screen.getByRole('button', { name: i18n.t('explore.logTransactions.apply') }));
  await screen.findByText(i18n.t('explore.logTransactions.unqualified'));
  expect(signal?.aborted).toBe(true);
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', keyCode: 27 });
  expect(close).toHaveBeenCalledOnce();
});

it('falls back safely for an invalid URL timezone instead of crashing detail rendering', async () => {
  vi.mocked(loadLogTransactionDetail).mockResolvedValue(response);
  expect(() => setup('invalid-zone')).not.toThrow();
  await waitFor(() => expect(loadLogTransactionDetail).toHaveBeenCalledOnce());
  expect(screen.getByRole('dialog')).toBeVisible();
});
