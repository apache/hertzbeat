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
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionContext } from '@/core/auth/session-context';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

const { importMonitorConfig, loadMonitorImportTask, loadMonitorApps, loadMonitors, mutateMonitors } = vi.hoisted(
  () => ({
    importMonitorConfig: vi.fn(),
    loadMonitorImportTask: vi.fn(),
    loadMonitorApps: vi.fn(),
    loadMonitors: vi.fn(),
    mutateMonitors: vi.fn()
  })
);

vi.mock('../api/monitor-import-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/monitor-import-api')>()),
  importMonitorConfig,
  loadMonitorImportTask
}));

vi.mock('../api/monitor-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/monitor-api')>()),
  loadMonitorApps,
  loadMonitors,
  mutateMonitors
}));

import { MonitorListPage } from './monitor-list-page';
import { monitorQueryKeys } from '../controller/monitor-query-keys';

const acceptedTask = monitorImportTask('IN_PROGRESS', 25);
const completedTask = monitorImportTask('COMPLETED', 100);

describe('MonitorListPage label query', () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });

  beforeEach(() => {
    loadMonitorApps.mockReset();
    loadMonitors.mockReset();
    mutateMonitors.mockReset();
    importMonitorConfig.mockReset();
    loadMonitorImportTask.mockReset();
    loadMonitorApps.mockResolvedValue([]);
    loadMonitors.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
    mutateMonitors.mockResolvedValue(undefined);
    importMonitorConfig.mockResolvedValue(acceptedTask);
    loadMonitorImportTask.mockResolvedValue(completedTask);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('hydrates labels from the URL and forwards them to the backend query', async () => {
    renderPage('/monitors?search=checkout&labels=env%3Aprod');

    const [searchInput, labelInput] = filterInputs();
    expect(searchInput).toHaveValue('checkout');
    expect(labelInput).toHaveValue('env:prod');
    expect(labelInput).toHaveAttribute('placeholder', 'Labels, for example env:prod');
    await waitFor(() =>
      expect(loadMonitors).toHaveBeenCalledWith(
        expect.objectContaining({ labels: 'env:prod' }),
        expect.any(AbortSignal)
      )
    );
  });

  it('submits search and labels together from the Query button and omits cleared values', async () => {
    renderPage('/monitors?search=old&labels=env%3Aprod');
    const [searchInput, labelInput] = filterInputs();

    fireEvent.change(searchInput, { target: { value: ' checkout ' } });
    fireEvent.change(labelInput, { target: { value: ' team:core ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Query' }));

    await waitFor(() => {
      const search = screen.getByTestId('location-search').textContent ?? '';
      expect(search).toContain('search=checkout');
      expect(search).toContain('labels=team%3Acore');
    });
    await waitFor(() =>
      expect(loadMonitors).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'checkout',
          labels: 'team:core'
        }),
        expect.any(AbortSignal)
      )
    );

    fireEvent.change(searchInput, { target: { value: '' } });
    fireEvent.change(labelInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Query' }));

    await waitFor(() => {
      const search = screen.getByTestId('location-search').textContent ?? '';
      expect(search).not.toContain('search=');
      expect(search).not.toContain('labels=');
    });
  });

  it('submits search alone from its Enter and both filters from label Enter', async () => {
    renderPage('/monitors');
    const [searchInput, labelInput] = filterInputs();

    fireEvent.change(searchInput, { target: { value: 'payments' } });
    fireEvent.change(labelInput, { target: { value: 'env:staging' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      const search = screen.getByTestId('location-search').textContent ?? '';
      expect(search).toContain('search=payments');
      expect(search).not.toContain('labels=env%3Astaging');
    });

    fireEvent.change(searchInput, { target: { value: 'orders' } });
    fireEvent.change(labelInput, { target: { value: 'team:checkout' } });
    fireEvent.keyDown(labelInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      const search = screen.getByTestId('location-search').textContent ?? '';
      expect(search).toContain('search=orders');
      expect(search).toContain('labels=team%3Acheckout');
    });
  });

  it('keeps import explicit and refreshes the list after canonical task completion', async () => {
    const page = renderPage('/monitors');
    await waitFor(() => expect(loadMonitors).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    const file = new File(['[]'], 'monitors.json', { type: 'application/json' });
    fireEvent.change(fileInput!, { target: { files: [file] } });

    expect(screen.getByText('Configuration file selected.')).toBeInTheDocument();
    expect(screen.queryByText('monitors.json')).not.toBeInTheDocument();
    expect(importMonitorConfig).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Import configuration' }));

    await waitFor(() => expect(importMonitorConfig).toHaveBeenCalledWith(file, expect.any(AbortSignal)));
    expect(await screen.findByText('Import in progress')).toBeInTheDocument();
    expect(loadMonitors).toHaveBeenCalledOnce();
    expect(loadMonitorImportTask).not.toHaveBeenCalled();

    await page.client.refetchQueries({ queryKey: monitorQueryKeys.importTask(acceptedTask.taskId), exact: true });
    expect(loadMonitorImportTask).toHaveBeenCalledWith(acceptedTask.taskId, expect.any(AbortSignal));
    expect(await screen.findByText('Import completed')).toBeInTheDocument();
    await waitFor(() => expect(loadMonitors).toHaveBeenCalledTimes(2));
  });
});

function renderPage(initialEntry: string) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  const page = render(
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
              <LocationSearch />
            </App>
          </SessionContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
  return { ...page, client };
}

function monitorImportTask(status: 'IN_PROGRESS' | 'COMPLETED', progress: number) {
  return {
    schemaVersion: 1 as const,
    taskId: '123e4567-e89b-42d3-a456-426614174000',
    taskType: 'MONITOR_IMPORT' as const,
    status,
    progress,
    createdAt: '2026-07-31T12:00:00Z',
    startedAt: '2026-07-31T12:00:00Z',
    completedAt: status === 'COMPLETED' ? '2026-07-31T12:00:10Z' : null,
    errorCode: null
  };
}

function filterInputs() {
  const inputs = screen.getAllByRole('textbox');
  expect(inputs).toHaveLength(2);
  return inputs as [HTMLElement, HTMLElement];
}

function LocationSearch() {
  return <output data-testid="location-search">{useLocation().search}</output>;
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
