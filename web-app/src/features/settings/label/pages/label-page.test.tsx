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

import { App } from 'antd';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

import { LabelPage } from './label-page';

type TestListState = { kind: string; records?: unknown[]; total?: number };

const resource = vi.hoisted(() => {
  const listState: TestListState = { kind: 'loading' };
  return {
    copyLabel: vi.fn(),
    createLabel: vi.fn(),
    deleteLabel: vi.fn(),
    inspectLabel: vi.fn(),
    isLocked: vi.fn(),
    isSaving: false,
    listState,
    refresh: vi.fn(),
    refreshing: false,
    updateLabel: vi.fn()
  };
});

vi.mock('../controller/label-resource-controller', () => ({
  useLabelResourceController: () => resource
}));

const serverLabel = {
  id: 7,
  name: 'env',
  tagValue: 'prod',
  description: 'Production',
  type: 1
};

describe('LabelPage', () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });
  beforeEach(() => {
    vi.clearAllMocks();
    resource.listState = { kind: 'ready', records: [serverLabel], total: 1 };
    resource.isSaving = false;
    resource.isLocked.mockImplementation(() => resource.isSaving);
    resource.createLabel.mockImplementation((_value, onSuccess: () => void) => onSuccess());
    resource.updateLabel.mockImplementation((_record, _value, onSuccess: () => void) => onSuccess());
  });
  afterEach(cleanup);

  it('validates input and closes create only after the resource success callback', async () => {
    renderLabelPage();
    expect(await screen.findByText('env:prod')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New label' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'OK' }));
    expect(await within(dialog).findByText('Enter a label name.')).toBeInTheDocument();
    expect(resource.createLabel).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: ' team ' } });
    fireEvent.change(within(dialog).getByLabelText('Value'), { target: { value: ' platform ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'OK' }));
    await waitFor(() =>
      expect(resource.createLabel).toHaveBeenCalledWith(
        { name: ' team ', tagValue: ' platform ' },
        expect.any(Function)
      )
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps the editor open when the backend does not complete canonical reread', async () => {
    resource.createLabel.mockImplementation(() => undefined);
    renderLabelPage();
    fireEvent.click(await screen.findByRole('button', { name: 'New label' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'team' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'OK' }));

    await waitFor(() => expect(resource.createLabel).toHaveBeenCalled());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not let an old create completion close a newly opened edit dialog', async () => {
    let completeCreate: (() => void) | undefined;
    resource.createLabel.mockImplementation((_value, onSuccess: () => void) => {
      completeCreate = onSuccess;
    });
    renderLabelPage();
    fireEvent.click(await screen.findByRole('button', { name: 'New label' }));
    let dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'team' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'OK' }));
    await waitFor(() => expect(resource.createLabel).toHaveBeenCalled());

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Name')).toHaveValue('env');
    act(() => completeCreate?.());

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByLabelText('Name')).toHaveValue('env');
  });

  it('locks the editor and every write entry while a save is pending', async () => {
    renderLabelPage();
    fireEvent.click(await screen.findByRole('button', { name: 'New label' }));
    resource.isSaving = true;
    fireEvent.change(screen.getByPlaceholderText('Search labels'), { target: { value: 'rerender' } });

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Name')).toBeDisabled();
    expect(within(dialog).getByLabelText('Value')).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: /OK$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'New label' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });

  it('updates, deletes, copies, inspects, and refreshes through the resource controller', async () => {
    renderLabelPage();
    await screen.findByText('env:prod');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Description'), { target: { value: 'Updated' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'OK' }));
    await waitFor(() =>
      expect(resource.updateLabel).toHaveBeenCalledWith(
        serverLabel,
        expect.objectContaining({ description: 'Updated' }),
        expect.any(Function)
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    fireEvent.click(screen.getByRole('button', { name: 'env:prod' }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(await screen.findByRole('button', { name: 'OK' }));

    expect(resource.copyLabel).toHaveBeenCalledWith(serverLabel);
    expect(resource.inspectLabel).toHaveBeenCalledWith(serverLabel);
    expect(resource.refresh).toHaveBeenCalledTimes(1);
    expect(resource.deleteLabel).toHaveBeenCalledWith(serverLabel);
  });

  it.each([
    [{ kind: 'loading' }, 'label-loading'],
    [{ kind: 'empty' }, 'No labels match the current query.'],
    [{ kind: 'unavailable' }, 'Label data is unavailable.'],
    [{ kind: 'error' }, 'This page could not be loaded. Retry or return to it later.']
  ])('renders the distinct resource state %#', async (state, evidence) => {
    resource.listState = state;
    renderLabelPage();

    if (evidence === 'label-loading') expect(screen.getByTestId(evidence)).toBeInTheDocument();
    else expect(await screen.findByText(evidence)).toBeInTheDocument();
    expect(screen.queryByText('env:prod')).not.toBeInTheDocument();
  });

  it('synchronizes the search draft when Back and Forward restore URL state', async () => {
    renderLabelPage('/settings/labels?pageIndex=2&pageSize=50&search=env');
    const search = await screen.findByPlaceholderText('Search labels');
    expect(search).toHaveValue('env');

    fireEvent.change(search, { target: { value: 'production' } });
    fireEvent.click(screen.getByRole('button', { name: 'Query' }));
    await waitFor(() =>
      expect(screen.getByTestId('route')).toHaveTextContent(
        '/settings/labels?pageIndex=0&pageSize=50&search=production'
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'History back' }));
    await waitFor(() => expect(search).toHaveValue('env'));
    fireEvent.click(screen.getByRole('button', { name: 'History forward' }));
    await waitFor(() => expect(search).toHaveValue('production'));
  });
});

function renderLabelPage(initialEntry = '/settings/labels') {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App>
          <LabelPage />
          <LocationProbe />
        </App>
      </MemoryRouter>
    </I18nextProvider>
  );
}

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="route">{`${location.pathname}${location.search}`}</output>
      <button type="button" onClick={() => void navigate(-1)}>
        History back
      </button>
      <button type="button" onClick={() => void navigate(1)}>
        History forward
      </button>
    </>
  );
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
