/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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
import { App } from 'antd';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionContext } from '@/core/auth/session-context';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import type { Monitor, MonitorQuery } from '../model/monitor-contract';

const { loadMonitorApps, loadMonitors, mutateMonitors } = vi.hoisted(() => ({
  loadMonitorApps: vi.fn(),
  loadMonitors: vi.fn(),
  mutateMonitors: vi.fn()
}));

vi.mock('../api/monitor-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/monitor-api')>()),
  loadMonitorApps,
  loadMonitors,
  mutateMonitors
}));

import { MonitorListPage } from './monitor-list-page';

describe('MonitorListPage scoped bulk selection', () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });

  beforeEach(() => {
    loadMonitorApps.mockReset();
    loadMonitors.mockReset();
    mutateMonitors.mockReset();
    loadMonitorApps.mockResolvedValue([]);
    mutateMonitors.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('persists invalidation when browser history returns to a previously selected scope', async () => {
    loadMonitorRowsByScope();
    renderPage('/monitors?search=checkout&pageIndex=0&pageSize=10');

    fireEvent.click(await rowCheckbox('checkout-monitor'));
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('search-scope'));
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    await screen.findByText('orders-monitor');

    fireEvent.click(screen.getByTestId('history-back'));
    await screen.findByText('checkout-monitor');
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
  });

  it('preserves and can clear selection across pages in the same filter scope', async () => {
    loadMonitorRowsByScope();
    renderPage('/monitors?search=checkout&pageIndex=0&pageSize=10');

    fireEvent.click(await rowCheckbox('checkout-monitor'));
    fireEvent.click(screen.getByTestId('page-scope'));
    await screen.findByText('checkout-page-two');
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    fireEvent.click(await rowCheckbox('checkout-page-two'));
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.queryByText('2 selected')).not.toBeInTheDocument();
    expect(mutateMonitors).not.toHaveBeenCalled();
  });

  it('invalidates selection when a same-scope refresh removes the row', async () => {
    loadMonitors
      .mockResolvedValueOnce(page([checkoutMonitor]))
      .mockResolvedValueOnce(page([]))
      .mockResolvedValue(page([checkoutMonitor]));
    renderPage('/monitors?search=checkout&pageIndex=0&pageSize=10');

    fireEvent.click(await rowCheckbox('checkout-monitor'));
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await screen.findByText('No monitors match the current query.');
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await screen.findByText('checkout-monitor');
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    expect(mutateMonitors).not.toHaveBeenCalled();
  });

  it('sends only the currently visible selected ids', async () => {
    loadMonitors.mockResolvedValue(page([checkoutMonitor, secondCheckoutMonitor]));
    renderPage('/monitors?search=checkout&pageIndex=0&pageSize=10');

    fireEvent.click(await rowCheckbox('second-checkout-monitor'));
    const bulk = screen.getByText('1 selected').parentElement;
    expect(bulk).not.toBeNull();
    fireEvent.click(within(bulk!).getByRole('button', { name: 'Enable' }));
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => expect(mutateMonitors).toHaveBeenCalledWith('enable', [8], expect.any(AbortSignal)));
  });
});

function loadMonitorRowsByScope() {
  loadMonitors.mockImplementation((query: MonitorQuery) => {
    if (query.search === 'orders') return Promise.resolve(page([ordersMonitor]));
    if (query.pageIndex === 1) return Promise.resolve(page([checkoutPageTwo]));
    return Promise.resolve(page([checkoutMonitor]));
  });
}

function renderPage(initialEntry: string) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <SessionContext.Provider
            value={{
              session: {
                authenticated: true,
                username: 'admin',
                workspaceId: null,
                roles: ['ADMIN'],
                expiresAt: null
              },
              loading: false,
              retry: () => undefined
            }}
          >
            <App>
              <MonitorListPage />
              <ScopeControls />
            </App>
          </SessionContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

async function rowCheckbox(name: string) {
  const row = (await screen.findByText(name)).closest('tr');
  expect(row).not.toBeNull();
  return within(row!).getByRole('checkbox');
}

function ScopeControls() {
  const navigate = useNavigate();
  return (
    <>
      <button
        type="button"
        data-testid="search-scope"
        onClick={() => void navigate('/monitors?search=orders&pageIndex=0&pageSize=10')}
      >
        Search scope
      </button>
      <button
        type="button"
        data-testid="page-scope"
        onClick={() => void navigate('/monitors?search=checkout&pageIndex=1&pageSize=10')}
      >
        Page scope
      </button>
      <button type="button" data-testid="history-back" onClick={() => void navigate(-1)}>
        Back
      </button>
    </>
  );
}

function page(content: Monitor[]) {
  return { content, totalElements: content.length, totalPages: content.length === 0 ? 0 : 1, number: 0, size: 10 };
}

const checkoutMonitor: Monitor = { id: 7, name: 'checkout-monitor', app: 'website', instance: 'checkout', status: 1 };
const secondCheckoutMonitor: Monitor = {
  id: 8,
  name: 'second-checkout-monitor',
  app: 'website',
  instance: 'checkout-2',
  status: 0
};
const ordersMonitor: Monitor = { id: 9, name: 'orders-monitor', app: 'website', instance: 'orders', status: 1 };
const checkoutPageTwo: Monitor = {
  id: 10,
  name: 'checkout-page-two',
  app: 'website',
  instance: 'checkout-page-2',
  status: 1
};

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
