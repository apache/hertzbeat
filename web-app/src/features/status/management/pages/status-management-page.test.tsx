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
import { requireDomElement, requireHtmlElement } from '@/test/dom-element';

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
const access = vi.hoisted(() => ({ roles: ['ADMIN'] as string[] }));
vi.mock('../api/status-management-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/status-management-api')>()),
  ...api
}));
vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({ session: { roles: access.roles }, loading: false, retry: vi.fn() })
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
    access.roles = ['ADMIN'];
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

  it.each([
    ['GUEST', false, false],
    ['USER', true, false],
    ['ADMIN', true, true]
  ] as const)(
    'renders exact %s write and delete admission without affecting reads',
    async (role, canWrite, canDelete) => {
      access.roles = [role];
      api.loadStatusComponents.mockResolvedValue([statusComponent]);
      api.loadStatusIncidents.mockResolvedValue({
        content: [incidentSummary],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 8
      });
      renderPage();

      await openWorkspace('navComponents');
      const componentsPanel = activeWorkspacePanel();
      expect((await within(componentsPanel).findAllByText('API')).length).toBeGreaterThan(0);
      expect(within(componentsPanel).queryByRole('button', { name: 'New component' }) !== null).toBe(canWrite);
      expect(within(componentsPanel).queryAllByRole('button', { name: 'Edit' }).length > 0).toBe(canWrite);
      expect(within(componentsPanel).queryAllByRole('button', { name: 'Delete' }).length > 0).toBe(canDelete);

      await openWorkspace('navIncidents');
      const incidentsPanel = activeWorkspacePanel();
      expect(within(incidentsPanel).getByText('Outage')).toBeInTheDocument();
      expect(within(incidentsPanel).queryByRole('button', { name: 'New incident' }) !== null).toBe(canWrite);
      expect(within(incidentsPanel).queryAllByRole('button', { name: 'Update' }).length > 0).toBe(canWrite);
      expect(within(incidentsPanel).queryAllByRole('button', { name: 'Delete' }).length > 0).toBe(canDelete);
    }
  );

  afterEach(() => cleanup());

  it('opens the public status page through the explicit route policy', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: i18n.t('statusManagement.title') })).toBeInTheDocument();
    const page = requireDomElement(document.querySelector('[data-hb-operational-page]'), 'Operational page');
    const header = requireDomElement(
      document.querySelector('[data-hb-operational-page-header]'),
      'Operational page header'
    );
    const results = requireDomElement(
      document.querySelector('[data-hb-operational-result-region]'),
      'Operational result region'
    );
    expect(page).toContainElement(header);
    expect(page).toContainElement(results);
    expect(screen.getByText(i18n.t('statusManagement.description'))).toBeInTheDocument();
    const publicStatusLink = await screen.findByRole('link', { name: i18n.t('statusManagement.openPublicPage') });
    expect(publicStatusLink).toHaveAttribute('href', '/status');
    expect(publicStatusLink).toHaveAttribute('target', '_blank');
    expect(screen.getAllByRole('link', { name: i18n.t('statusManagement.openPublicPage') })).toHaveLength(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens settings first and keeps only settings, components, and incidents', async () => {
    api.loadStatusComponents.mockResolvedValue([statusComponent]);
    renderPage();

    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map(tab => tab.textContent)).toEqual([
      i18n.t('statusManagement.navSettings'),
      i18n.t('statusManagement.navComponents'),
      i18n.t('statusManagement.navIncidents')
    ]);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(i18n.t('statusManagement.name'))).not.toBeInTheDocument();
    const settingsPanel = activeWorkspacePanel();
    const settingsRegion = organizationRegion(settingsPanel);
    expect(within(settingsRegion).getByText(org.name)).toBeInTheDocument();
    expect(within(settingsPanel).getByRole('button', { name: i18n.t('common.edit') })).toBeInTheDocument();
  });

  it('renders explicit empty component and incident states after loading', async () => {
    renderPage();

    await openWorkspace('navComponents');
    expect(activeWorkspacePanel().querySelector('[data-state="empty"]')).toHaveAttribute('data-presentation', 'quiet');
    await openWorkspace('navIncidents');
    const emptyIncidents = within(activeWorkspacePanel()).getByRole('region', {
      name: i18n.t('status.noIncidents')
    });
    expect(emptyIncidents).toHaveAttribute('data-state', 'empty');
    expect(
      within(emptyIncidents).getByText(i18n.t('statusManagement.emptyIncidentsNeedsComponent'))
    ).toBeInTheDocument();
    expect(within(emptyIncidents).getByRole('button', { name: i18n.t('statusManagement.newIncident') })).toBeDisabled();
    expect(
      within(activeWorkspacePanel()).getAllByRole('button', { name: i18n.t('statusManagement.newIncident') })
    ).toHaveLength(1);
  });

  it('keeps incident search and query together while refresh stays in the action rail', async () => {
    const { container } = renderPage();

    await openWorkspace('navIncidents');
    await screen.findByRole('textbox', { name: i18n.t('statusManagement.searchIncidents') });
    const commandBar = requireHtmlElement(
      container.querySelector('[data-hb-operational-command-bar]'),
      'Operational command bar'
    );
    const primary = requireHtmlElement(commandBar.querySelector('[data-hb-operational-command-primary]'), 'Filters');
    const secondary = requireHtmlElement(
      commandBar.querySelector('[data-hb-operational-command-secondary]'),
      'Query actions'
    );

    expect(within(primary).getByRole('textbox')).toBeInTheDocument();
    expect(within(primary).getByRole('button', { name: i18n.t('common.query') })).toBeInTheDocument();
    expect(within(secondary).queryByRole('button', { name: i18n.t('common.query') })).not.toBeInTheDocument();
    expect(within(secondary).getByRole('button', { name: i18n.t('common.refresh') })).toBeInTheDocument();
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

    await openWorkspace('navIncidents');
    await waitFor(() =>
      expect(api.loadStatusIncidents).toHaveBeenCalledWith(
        {
          search: '',
          pageIndex: 3,
          pageSize: 8
        },
        expect.any(AbortSignal)
      )
    );
    await waitFor(() => expect(container.querySelector('.ant-pagination')).not.toBeNull());
    expect(within(activeWorkspacePanel()).queryByText('No incidents in the selected period.')).not.toBeInTheDocument();
    expect(activeWorkspacePanel().querySelector('.ant-table')).not.toBeNull();
  });

  it('focuses exact organization not-found on setup and defers operational workspaces', async () => {
    api.loadStatusOrg.mockRejectedValue(new StatusOrgNotFoundError());
    renderPage();

    expect(await screen.findByRole('heading', { name: i18n.t('statusManagement.setupTitle') })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeEnabled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: i18n.t('statusManagement.openPublicPage') })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('statusManagement.newComponent') })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('statusManagement.newIncident') })).not.toBeInTheDocument();
    expect(screen.queryByRole('search', { name: i18n.t('statusManagement.searchIncidents') })).not.toBeInTheDocument();
  });

  it('keeps the original unconfigured evidence for a read-only viewer', async () => {
    access.roles = ['GUEST'];
    api.loadStatusOrg.mockRejectedValue(new StatusOrgNotFoundError());
    renderPage();

    expect(await screen.findByText(i18n.t('statusManagement.notConfigured'))).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: i18n.t('statusManagement.setupTitle') })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: i18n.t('statusManagement.createPage') })).not.toBeInTheDocument();
  });

  it('reveals the public link and operational workspaces after initial setup succeeds', async () => {
    api.loadStatusOrg.mockRejectedValueOnce(new StatusOrgNotFoundError());
    api.saveStatusOrg.mockResolvedValueOnce({ ...org, feedback: '', color: '#5b6fd8' });
    renderPage();

    await screen.findByRole('heading', { name: i18n.t('statusManagement.setupTitle') });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: org.name } });
    fireEvent.change(screen.getByLabelText('Home URL'), { target: { value: org.home } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: org.description } });
    fireEvent.change(screen.getByLabelText('Logo URL'), { target: { value: org.logo } });
    fireEvent.click(screen.getByRole('button', { name: i18n.t('statusManagement.createPage') }));

    await waitFor(() => expect(api.saveStatusOrg).toHaveBeenCalledOnce());
    expect(await screen.findByRole('link', { name: i18n.t('statusManagement.openPublicPage') })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: i18n.t('statusManagement.navComponents') })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: i18n.t('statusManagement.navIncidents') })).toBeInTheDocument();
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
    await openWorkspace('navSettings');
    expect(within(organizationRegion()).getByText('HertzBeat')).toBeInTheDocument();
    fireEvent.click(within(activeWorkspacePanel()).getByRole('button', { name: 'Edit' }));
    await waitFor(() => expect(within(activeWorkspacePanel()).getByLabelText('Name')).toBeEnabled());
    fireEvent.change(within(activeWorkspacePanel()).getByLabelText('Name'), { target: { value: 'Changed' } });
    fireEvent.click(within(activeWorkspacePanel()).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(within(organizationRegion()).getByText('HertzBeat')).toBeInTheDocument());
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

    await openWorkspace('navSettings');
    expect(within(organizationRegion()).getByText('HertzBeat')).toBeInTheDocument();
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
    await waitFor(() => expect(within(organizationRegion()).getByText('Draft organization')).toBeInTheDocument());
  });

  it('shows component delete recovery with one explicit read-only Retry', async () => {
    api.loadStatusComponents.mockResolvedValue([statusComponent]);
    renderPage();

    await openWorkspace('navComponents');
    const row = within(
      within(activeWorkspacePanel()).getByRole('list', { name: i18n.t('statusManagement.componentCollection') })
    )
      .getByText('API')
      .closest('li');
    if (!(row instanceof HTMLElement)) throw new Error('Missing component row');
    fireEvent.click(within(row).getByRole('button', { name: 'Delete' }));
    fireEvent.click(await screen.findByRole('button', { name: 'OK' }));

    expect(await screen.findByText(i18n.t('statusManagement.unknown'))).toBeInTheDocument();
    const managementRefresh = screen
      .getAllByRole('button', { name: 'Refresh' })
      .filter(button => !button.closest('[inert]'));
    for (const refresh of managementRefresh) expect(refresh).toBeDisabled();
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

    await openWorkspace('navIncidents');
    const row = within(activeWorkspacePanel()).getByText('Outage').closest('tr');
    if (!(row instanceof HTMLElement)) throw new Error('Missing incident row');
    fireEvent.click(within(row).getByRole('button', { name: 'Delete' }));
    fireEvent.click(await screen.findByRole('button', { name: 'OK' }));

    expect(await screen.findByText(i18n.t('statusManagement.unknown'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
    expect(api.deleteStatusIncident).toHaveBeenCalledTimes(1);
  });

  it('does not replace an organization draft during a background refresh', async () => {
    const { client } = renderPage();

    await openWorkspace('navSettings');
    expect(within(organizationRegion()).getByText('HertzBeat')).toBeInTheDocument();
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

  it('keeps an unsaved settings draft when the operator checks another workspace', async () => {
    renderPage();

    await openWorkspace('navSettings');
    fireEvent.click(within(activeWorkspacePanel()).getByRole('button', { name: 'Edit' }));
    const name = await within(activeWorkspacePanel()).findByLabelText('Name');
    fireEvent.change(name, { target: { value: 'Unpublished status name' } });

    await openWorkspace('navComponents');
    await openWorkspace('navSettings');

    expect(within(activeWorkspacePanel()).getByLabelText('Name')).toHaveValue('Unpublished status name');
    expect(api.saveStatusOrg).not.toHaveBeenCalled();
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

    await openWorkspace('navIncidents');
    expect(within(activeWorkspacePanel()).getByText('Outage')).toBeInTheDocument();
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

    await openWorkspace('navIncidents');
    expect(within(activeWorkspacePanel()).getByText('Outage')).toBeInTheDocument();
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

async function openWorkspace(key: 'navComponents' | 'navIncidents' | 'navSettings') {
  fireEvent.click(await screen.findByRole('tab', { name: i18n.t(`statusManagement.${key}`) }));
}

function activeWorkspacePanel() {
  return screen.getByRole('tabpanel');
}

function organizationRegion(panel = activeWorkspacePanel()) {
  return within(panel).getByRole('region', { name: i18n.t('statusManagement.organization') });
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
