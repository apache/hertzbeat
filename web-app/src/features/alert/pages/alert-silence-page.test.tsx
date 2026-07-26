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
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

const api = vi.hoisted(() => ({
  deleteAlertSilence: vi.fn(),
  loadAlertSilence: vi.fn(),
  loadAlertSilences: vi.fn(),
  loadMatchedAlertSilences: vi.fn(),
  saveAlertSilence: vi.fn(),
  updateAlertSilenceEnabled: vi.fn()
}));
vi.mock('../api/alert-silence-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/alert-silence-api')>()),
  ...api
}));

import { AlertSilencePage } from './alert-silence-page';
import {
  AlertSilenceMissingError,
  AlertSilenceRequestFailure,
  buildAlertSilencePayload,
  type AlertSilenceDraft
} from '../model/alert-silence-model';

const record = {
  id: 7,
  name: 'Database maintenance',
  enable: undefined,
  matchAll: true,
  type: 0 as const,
  times: undefined,
  periodStart: '2026-07-16T10:00:00Z',
  periodEnd: '2026-07-16T12:00:00Z'
};
const detailRecord = { ...record, enable: true, times: 2, labels: null, days: null };

describe('AlertSilencePage', () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    api.loadAlertSilences.mockResolvedValue({ content: [record], totalElements: 1 });
    api.loadMatchedAlertSilences.mockResolvedValue({ records: [], missingCount: 0 });
    api.loadAlertSilence.mockResolvedValue(detailRecord);
    api.saveAlertSilence.mockResolvedValue(undefined);
    api.deleteAlertSilence.mockResolvedValue(undefined);
    api.updateAlertSilenceEnabled.mockResolvedValue(undefined);
  });

  afterEach(() => cleanup());

  it('reads and writes the URL-backed search and pagination context', async () => {
    renderPage('/alerts/silences?search=prod&pageIndex=1&pageSize=15');

    await waitFor(() =>
      expect(api.loadAlertSilences).toHaveBeenCalledWith(
        { search: 'prod', pageIndex: 1, pageSize: 15 },
        expect.any(AbortSignal)
      )
    );
    fireEvent.change(screen.getByPlaceholderText('Search silences'), { target: { value: ' database ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Query' }));

    expect(await screen.findByTestId('location')).toHaveTextContent(
      '/alerts/silences?pageIndex=0&pageSize=15&search=database'
    );
  });

  it('renders the entity-matched silence context with honest empty evidence', async () => {
    renderPage(
      '/alerts/silences?entityId=7&entityName=Checkout&matchMode=entity-noise-controls&matchingRuleType=silence&pageIndex=0&pageSize=8'
    );

    expect(await screen.findByRole('region', { name: 'Entity silence context' })).toHaveTextContent('Checkout');
    expect(screen.getByText('No current silence policies match this entity.')).toBeInTheDocument();
    expect(api.loadAlertSilences).not.toHaveBeenCalled();
  });

  it('distinguishes unavailable and empty list states', async () => {
    api.loadAlertSilences.mockRejectedValueOnce(new AlertSilenceRequestFailure('unavailable', 'uncertain'));
    const unavailable = renderPage();
    expect(
      await screen.findByText('The service is unavailable. Check the backend connection and try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText('No silence policies match the current query.')).not.toBeInTheDocument();

    unavailable.unmount();
    api.loadAlertSilences.mockResolvedValueOnce({ content: [], totalElements: 0 });
    renderPage();
    expect(await screen.findByText('No silence policies match the current query.')).toBeInTheDocument();
  });

  it('normalizes nonzero out-of-range content without presenting an empty result', async () => {
    api.loadAlertSilences.mockImplementation(query =>
      Promise.resolve(
        query.pageIndex === 2
          ? { content: [], totalElements: 9, totalPages: 2, number: 2, size: 8 }
          : { content: [record], totalElements: 9, totalPages: 2, number: 1, size: 8 }
      )
    );
    renderPage('/alerts/silences?pageIndex=2&pageSize=8');

    expect(screen.queryByText('No silence policies match the current query.')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/alerts/silences?pageIndex=1&pageSize=8')
    );
    expect(await screen.findByText('Database maintenance')).toBeInTheDocument();
  });

  it('creates explicitly and cancels without writing', async () => {
    api.loadAlertSilences.mockImplementation(() => Promise.resolve(createdPageFromLastWrite()));
    renderPage();
    await screen.findByText('Database maintenance');

    fireEvent.click(screen.getByRole('button', { name: 'New silence' }));
    let dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(api.saveAlertSilence).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'New silence' }));
    dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Policy'), { target: { value: 'Planned maintenance' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(api.saveAlertSilence).toHaveBeenCalledWith(expect.objectContaining({ name: 'Planned maintenance' }))
    );
  });

  it('disables New silence while a save is in flight', async () => {
    let resolveSave!: () => void;
    api.saveAlertSilence.mockReturnValue(
      new Promise<void>(resolve => {
        resolveSave = resolve;
      })
    );
    api.loadAlertSilences.mockImplementation(() => Promise.resolve(createdPageFromLastWrite()));
    renderPage();
    await screen.findByText('Database maintenance');
    const create = screen.getByRole('button', { name: 'New silence' });
    fireEvent.click(create);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Policy'), { target: { value: 'Planned maintenance' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.saveAlertSilence).toHaveBeenCalled());
    expect(create).toBeDisabled();
    resolveSave();
    await waitFor(() => expect(create).toBeEnabled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders commit uncertainty without permanent loading and allows safe cancel and refresh', async () => {
    api.loadAlertSilences.mockResolvedValue({ content: [{ ...record, enable: true }], totalElements: 1 });
    api.saveAlertSilence.mockRejectedValue(new AlertSilenceRequestFailure('unavailable', 'uncertain'));
    renderPage();
    await screen.findByText('Database maintenance');

    fireEvent.click(screen.getByRole('button', { name: 'New silence' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Policy'), { target: { value: 'Planned maintenance' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText('Silence policy could not be saved.')).toBeInTheDocument();
    const save = within(dialog).getByText('Save').closest('button');
    expect(save).toBeDisabled();
    expect(save).not.toHaveClass('ant-btn-loading');
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeEnabled();
    const create = screen.getByRole('button', { name: 'New silence' });
    expect(create).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Silence policy could not be saved.')).toBeInTheDocument();
    const row = screen.getByRole('row', { name: /Database maintenance/ });
    const edit = within(row).getByRole('button', { name: 'Edit' });
    expect(create).toBeDisabled();
    expect(edit).toBeDisabled();
    expect(within(row).getByRole('button', { name: 'Delete' })).toBeDisabled();
    fireEvent.click(create);
    fireEvent.click(edit);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(api.loadAlertSilences).toHaveBeenCalledTimes(2));
    expect(api.saveAlertSilence).toHaveBeenCalledTimes(1);
    expect(create).toBeDisabled();
    expect(edit).toBeDisabled();
  });

  it('renders an explicit proof retry without repeating the update', async () => {
    api.saveAlertSilence.mockRejectedValueOnce(new AlertSilenceRequestFailure('unavailable', 'uncertain'));
    renderPage();
    const row = await screen.findByRole('row', { name: /Database maintenance/ });
    fireEvent.click(within(row).getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Policy'), { target: { value: 'Updated maintenance' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    const retry = await within(dialog).findByRole('button', { name: 'Retry' });
    expect(retry).toBeEnabled();
    expect(within(dialog).getByText('Save').closest('button')).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeEnabled();

    api.loadAlertSilence.mockResolvedValueOnce({ ...detailRecord, name: 'Updated maintenance' });
    fireEvent.click(retry);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.saveAlertSilence).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Silence policy could not be saved.')).not.toBeInTheDocument();
  });

  it('loads an edit before saving and deletes through the batch endpoint', async () => {
    renderPage();
    const row = await screen.findByRole('row', { name: /Database maintenance/ });

    fireEvent.click(within(row).getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(api.loadAlertSilence).toHaveBeenCalledWith(7, expect.any(AbortSignal)));
    fireEvent.change(within(dialog).getByLabelText('Policy'), { target: { value: 'Updated maintenance' } });
    api.loadAlertSilence
      .mockResolvedValueOnce({ ...detailRecord, name: 'Updated maintenance' })
      .mockRejectedValueOnce(new AlertSilenceMissingError());
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(api.saveAlertSilence).toHaveBeenCalledWith(expect.objectContaining({ id: 7, name: 'Updated maintenance' }))
    );

    fireEvent.click(within(row).getByRole('button', { name: 'Delete' }));
    fireEvent.click(await screen.findByRole('button', { name: 'OK' }));
    await waitFor(() => expect(api.deleteAlertSilence).toHaveBeenCalledWith(7));
  });

  it('does not present missing match counts or enabled state as zero or healthy', async () => {
    renderPage();
    const row = await screen.findByRole('row', { name: /Database maintenance/ });
    expect(within(row).getAllByText('—')).toHaveLength(2);
    expect(within(row).queryByText('0')).not.toBeInTheDocument();
    expect(within(row).getByRole('switch')).not.toBeChecked();
    expect(within(row).getByRole('switch')).toBeDisabled();
  });

  it('renders server LocalDateTime audit evidence verbatim without browser parsing', async () => {
    api.loadAlertSilences.mockResolvedValueOnce({
      content: [{ ...record, gmtCreate: '2026-07-19T10:11:12', gmtUpdate: null }],
      totalElements: 1
    });
    renderPage();

    const row = await screen.findByRole('row', { name: /Database maintenance/ });
    expect(within(row).getByText('2026-07-19T10:11:12')).toBeInTheDocument();
  });
});

function createdPageFromLastWrite() {
  const draft = api.saveAlertSilence.mock.calls[0]?.[0] as AlertSilenceDraft | undefined;
  if (!draft) return { content: [record], totalElements: 1 };
  return {
    content: [{ id: 8, times: null, ...buildAlertSilencePayload(draft) }],
    totalElements: 1
  };
}

function renderPage(entry = '/alerts/silences') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[entry]}>
          <App>
            <AlertSilencePage />
            <LocationProbe />
          </App>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
