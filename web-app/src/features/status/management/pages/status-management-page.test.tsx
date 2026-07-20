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
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { StatusOrgNotFoundError, StatusRequestFailure } from '@/features/status/shared/status-error-model';

import { statusManagementQueryKeys } from '../controller/status-management-query-keys';
import { StatusManagementMissingError, type StatusIncident, type StatusOrg } from '../model/status-management-contract';

const api = vi.hoisted(() => ({
  deleteStatusComponent: vi.fn(),
  deleteStatusIncident: vi.fn(),
  loadStatusComponent: vi.fn(),
  loadStatusComponents: vi.fn(),
  loadStatusIncident: vi.fn(),
  loadStatusIncidents: vi.fn(),
  loadStatusOrg: vi.fn(),
  saveStatusComponent: vi.fn(),
  saveStatusIncident: vi.fn(),
  saveStatusOrg: vi.fn()
}));
vi.mock('../api/status-management-api', async importOriginal => ({
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
    api.loadStatusComponent.mockResolvedValue(statusComponent);
  });

  afterEach(() => cleanup());

  it('opens the public status page through the explicit route policy', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: i18n.t('statusManagement.title') })).toBeInTheDocument();
    expect(screen.getByText(i18n.t('statusManagement.description'))).toBeInTheDocument();
    const publicStatusLink = screen.getByRole('link', { name: i18n.t('statusManagement.openPublicPage') });
    expect(publicStatusLink).toHaveAttribute('href', '/status');
    expect(publicStatusLink).toHaveAttribute('target', '_blank');
  });

  it('renders explicit empty component and incident states after loading', async () => {
    renderPage();

    expect(await screen.findByDisplayValue('HertzBeat')).toBeDisabled();
    expect(screen.getByText('No public components are configured.')).toBeInTheDocument();
    expect(screen.getByText('No incidents in the selected period.')).toBeInTheDocument();
  });

  it('keeps an out-of-range empty incident page ready with pagination evidence', async () => {
    api.loadStatusIncidents.mockResolvedValue({
      content: [],
      totalElements: 17,
      totalPages: 3,
      number: 3,
      size: 8
    });
    const { container } = renderPage('/settings/status-page?pageIndex=3&pageSize=8');

    await waitFor(() =>
      expect(api.loadStatusIncidents).toHaveBeenCalledWith({
        search: '',
        pageIndex: 3,
        pageSize: 8
      })
    );
    await waitFor(() => expect(container.querySelector('.ant-pagination')).not.toBeNull());
    expect(screen.queryByText('No incidents in the selected period.')).not.toBeInTheDocument();
    expect(container.querySelector('.ant-table')).not.toBeNull();
  });

  it('allows initial configuration only for exact organization not-found', async () => {
    api.loadStatusOrg.mockRejectedValue(new StatusOrgNotFoundError());
    renderPage();

    expect(await screen.findByText('Configure the page identity before adding components.')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeEnabled();
  });

  it('keeps organization authoring unavailable on transport failure', async () => {
    api.loadStatusOrg.mockRejectedValue(new StatusRequestFailure('unavailable', 'uncertain'));
    renderPage();

    expect(
      await screen.findByText('The service is unavailable. Check the backend connection and try again.')
    ).toBeInTheDocument();
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
    api.saveStatusOrg.mockResolvedValueOnce({ ...org, name: 'Updated' });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.saveStatusOrg).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated' })));
  });

  it('keeps an ambiguous organization draft locked and retries with read-only proof', async () => {
    const firstSave = deferred<StatusOrg>();
    api.saveStatusOrg.mockReturnValueOnce(firstSave.promise);
    renderPage();

    expect(await screen.findByDisplayValue('HertzBeat')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const name = await screen.findByLabelText('Name');
    fireEvent.change(name, { target: { value: 'Draft organization' } });
    const save = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(save);
    fireEvent.click(save);
    await waitFor(() => expect(api.saveStatusOrg).toHaveBeenCalledTimes(1));

    expect(name).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(save).toBeDisabled();

    await act(async () => {
      firstSave.reject(new StatusRequestFailure('unavailable', 'uncertain'));
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByRole('button', { name: /Retry$/ })).toBeEnabled());
    expect(name).toBeDisabled();
    expect(name).toHaveValue('Draft organization');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    api.loadStatusOrg.mockResolvedValueOnce({ ...org, name: 'Draft organization' });
    fireEvent.click(screen.getByRole('button', { name: /Retry$/ }));
    await waitFor(() => expect(api.loadStatusOrg).toHaveBeenCalledTimes(3));
    expect(api.saveStatusOrg).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(name).toBeDisabled());
  });

  it('shows component delete recovery with one explicit read-only Retry', async () => {
    api.loadStatusComponents.mockResolvedValue([statusComponent]);
    renderPage();

    const row = (await screen.findByText('API')).closest('tr');
    if (!(row instanceof HTMLElement)) throw new Error('Missing component row');
    fireEvent.click(within(row).getByRole('button', { name: 'Delete' }));
    fireEvent.click(await screen.findByRole('button', { name: 'OK' }));

    expect(await screen.findByText(i18n.t('statusManagement.unknown'))).toBeInTheDocument();
    for (const refresh of screen.getAllByRole('button', { name: 'Refresh' })) expect(refresh).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
    expect(api.deleteStatusComponent).toHaveBeenCalledTimes(1);
  });

  it('shows incident delete recovery with one explicit read-only Retry', async () => {
    api.loadStatusComponents.mockResolvedValue([statusComponent]);
    api.loadStatusIncidents.mockResolvedValue({
      content: [incidentSummary],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 8
    });
    api.loadStatusIncident.mockResolvedValue(incidentSummary);
    renderPage();

    const row = (await screen.findByText('Outage')).closest('tr');
    if (!(row instanceof HTMLElement)) throw new Error('Missing incident row');
    fireEvent.click(within(row).getByRole('button', { name: 'Delete' }));
    fireEvent.click(await screen.findByRole('button', { name: 'OK' }));

    expect(await screen.findByText(i18n.t('statusManagement.unknown'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
    expect(api.deleteStatusIncident).toHaveBeenCalledTimes(1);
  });

  it('does not replace an organization draft during a background refresh', async () => {
    const { client } = renderPage();

    expect(await screen.findByDisplayValue('HertzBeat')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const name = await screen.findByLabelText('Name');
    fireEvent.change(name, { target: { value: 'Local draft' } });

    api.loadStatusOrg.mockResolvedValueOnce({ ...org, name: 'Server refresh' });
    await act(async () => {
      await client.invalidateQueries({ queryKey: statusManagementQueryKeys.org() });
    });

    await waitFor(() => expect(api.loadStatusOrg).toHaveBeenCalledTimes(2));
    expect(name).toHaveValue('Local draft');
    expect(name).toBeEnabled();
  });

  it('keeps a new incident open when an obsolete detail request finishes', async () => {
    const detail = deferred<StatusIncident>();
    api.loadStatusComponents.mockResolvedValue([statusComponent]);
    api.loadStatusIncidents.mockResolvedValue({
      content: [incidentSummary],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 8
    });
    api.loadStatusIncident.mockReturnValue(detail.promise);
    renderPage();

    expect(await screen.findByText('Outage')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    await waitFor(() => expect(api.loadStatusIncident).toHaveBeenCalledWith(7, expect.any(AbortSignal)));
    fireEvent.click(screen.getByRole('button', { name: 'New incident' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('New incident')).toBeInTheDocument();
    expect(dialog.querySelector('input[type="text"]')).toHaveValue('');

    await act(async () => {
      detail.resolve({ ...incidentSummary, name: 'Loaded outage' });
      await Promise.resolve();
    });

    expect(within(dialog).getByText('New incident')).toBeInTheDocument();
    expect(dialog.querySelector('input[type="text"]')).toHaveValue('');
    expect(screen.queryByDisplayValue('Loaded outage')).not.toBeInTheDocument();
  });

  it('shows a distinct missing-detail state without presenting an editor', async () => {
    api.loadStatusComponents.mockResolvedValue([statusComponent]);
    api.loadStatusIncidents.mockResolvedValue({
      content: [incidentSummary],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 8
    });
    api.loadStatusIncident.mockRejectedValue(new StatusManagementMissingError('incident'));
    renderPage();

    expect(await screen.findByText('Outage')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    expect(await screen.findByText(i18n.t('statusManagement.loadIncidentFailed'))).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

const statusComponent = {
  id: 3,
  orgId: 1,
  name: 'API',
  method: 1,
  configState: 0,
  state: 0
};
const incidentSummary = {
  id: 7,
  orgId: 1,
  name: 'Outage',
  state: 0,
  components: [statusComponent],
  contents: []
};

function renderPage(entry = '/settings/status-page') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  const view = render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[entry]}>
          <App>
            <StatusManagementPage />
          </App>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
  return { ...view, client };
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}
