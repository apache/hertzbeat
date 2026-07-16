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
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';
import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

const api = vi.hoisted(() => ({
  deleteStatusComponent: vi.fn(),
  deleteStatusIncident: vi.fn(),
  loadStatusComponents: vi.fn(),
  loadStatusIncident: vi.fn(),
  loadStatusIncidents: vi.fn(),
  loadStatusOrg: vi.fn(),
  saveStatusComponent: vi.fn(),
  saveStatusIncident: vi.fn(),
  saveStatusOrg: vi.fn()
}));
vi.mock('../api/status-management-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/status-management-api')>()),
  ...api
}));

import { StatusManagementPage } from './status-management-page';

const org = { id: 1, name: 'HertzBeat', description: 'Status', home: '/', logo: '/logo.svg', state: 0 };

describe('StatusManagementPage', () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    api.loadStatusOrg.mockResolvedValue(org);
    api.loadStatusComponents.mockResolvedValue([]);
    api.loadStatusIncidents.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 8 });
    api.saveStatusOrg.mockResolvedValue(org);
    api.saveStatusComponent.mockResolvedValue(undefined);
    api.saveStatusIncident.mockResolvedValue(undefined);
    api.deleteStatusComponent.mockResolvedValue(undefined);
    api.deleteStatusIncident.mockResolvedValue(undefined);
  });

  afterEach(() => cleanup());

  it('renders explicit empty component and incident states after loading', async () => {
    renderPage();

    expect(await screen.findByDisplayValue('HertzBeat')).toBeDisabled();
    expect(screen.getByText('No public components are configured.')).toBeInTheDocument();
    expect(screen.getByText('No incidents in the selected period.')).toBeInTheDocument();
  });

  it('allows initial configuration only for exact organization not-found', async () => {
    api.loadStatusOrg.mockRejectedValue(
      new ApiMessageError('Status Page Organization Not Found', { code: 15, status: 200 })
    );
    renderPage();

    expect(await screen.findByText('Configure the page identity before adding components.')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeEnabled();
  });

  it('keeps organization authoring unavailable on transport failure', async () => {
    api.loadStatusOrg.mockRejectedValue(new ApiMessageError('Request failed with status 503', { status: 503 }));
    renderPage();

    expect(await screen.findByText('The service is unavailable. Check the backend connection and try again.'))
      .toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });

  it('cancels organization edits without writing and saves explicit edits', async () => {
    renderPage();
    expect(await screen.findByDisplayValue('HertzBeat')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await waitFor(() => expect(screen.getByLabelText('Name')).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Changed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.getByDisplayValue('HertzBeat')).toBeDisabled());
    expect(api.saveStatusOrg).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await waitFor(() => expect(screen.getByLabelText('Name')).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Updated' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.saveStatusOrg).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated' })));
  });
});

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/settings/status-page']}>
          <App><StatusManagementPage /></App>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
