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
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { requireDomElement } from '@/test/dom-element';

const controller = vi.hoisted(() => ({
  discard: vi.fn(),
  retryRead: vi.fn(),
  retrySave: vi.fn(),
  retryTimezones: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
  useSystemConfigResourceController: vi.fn()
}));
vi.mock('../controller/system-config-resource-controller', () => ({
  useSystemConfigResourceController: controller.useSystemConfigResourceController
}));

import { SystemConfigPage } from './system-config-page';

describe('SystemConfigPage', () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    controller.useSystemConfigResourceController.mockReturnValue(buildController());
  });
  afterEach(cleanup);

  it('owns title and description in a shared header without actions', () => {
    renderPage();

    const page = requireDomElement(document.querySelector('[data-hb-operational-page]'), 'Operational page');
    const header = requireDomElement(
      document.querySelector('[data-hb-operational-page-header]'),
      'Operational page header'
    );
    expect(page).toContainElement(header);
    expect(header).toContainElement(screen.getByRole('heading', { name: 'System settings' }));
    expect(header.querySelector('[data-hb-operational-page-actions]')).not.toBeInTheDocument();
  });

  it('renders the ready controller state without owning server queries', async () => {
    renderPage();
    expect(await screen.findByText('UTC (UTC+00:00) UTC')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
  });

  it.each([
    ['missing', 'System settings have not been configured.'],
    ['permission', 'Your account does not have permission to read system settings.'],
    ['unavailable', 'System settings are unavailable.'],
    ['invalid', 'System settings returned an invalid response.'],
    ['error', 'This page could not be loaded. Retry or return to it later.']
  ])('renders %s distinctly and delegates retry', async (kind, message) => {
    controller.useSystemConfigResourceController.mockReturnValue(buildController({ kind }));
    renderPage();
    expect(await screen.findByText(message)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(controller.retryRead).toHaveBeenCalledTimes(1);
  });

  it('keeps auxiliary timezone failure inside the ready editor', async () => {
    controller.useSystemConfigResourceController.mockReturnValue(buildController({ timezonesFailed: true }));
    renderPage();
    expect(
      await screen.findByText('The time zone catalog is unavailable. The current value is still preserved.')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(controller.retryTimezones).toHaveBeenCalledTimes(1);
  });

  it('locks every editor action and auxiliary retry while a save is pending', async () => {
    controller.useSystemConfigResourceController.mockReturnValue(
      buildController({
        dirty: true,
        locked: true,
        saving: true,
        timezonesFailed: true
      })
    );
    renderPage();

    const selects = await screen.findAllByRole('combobox');
    expect(selects).toHaveLength(3);
    selects.forEach(select => expect(select).toBeDisabled());
    expect(screen.getByRole('button', { name: /Save$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled();
  });

  it('keeps ambiguous-write proof visible, locked, and GET-retryable', async () => {
    controller.useSystemConfigResourceController.mockReturnValue(
      buildController({ dirty: true, locked: true, recovery: { phase: 'proof' } })
    );
    renderPage();

    expect(await screen.findByText('System settings are unavailable.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(controller.retrySave).toHaveBeenCalledTimes(1);
    const selects = screen.getAllByRole('combobox');
    selects.forEach(select => expect(select).toBeDisabled());
    expect(screen.getByRole('button', { name: /Save$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeDisabled();
  });

  it.each([['USER'], ['GUEST']] as const)('keeps settings readable but hides every write action for %s', async () => {
    controller.useSystemConfigResourceController.mockReturnValue(buildController({ canConfigure: false }));
    renderPage();

    const selects = await screen.findAllByRole('combobox');
    expect(selects).toHaveLength(3);
    selects.forEach(select => expect(select).toBeDisabled());
    expect(screen.queryByRole('button', { name: /Save$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Discard changes' })).not.toBeInTheDocument();
  });

  it('hides retained proof retry synchronously after ADMIN role loss', async () => {
    controller.useSystemConfigResourceController.mockReturnValue(
      buildController({ canConfigure: false, dirty: false, locked: false, recovery: null })
    );
    renderPage();

    await screen.findByText('English');
    expect(screen.queryByText('System settings are unavailable.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save$/ })).not.toBeInTheDocument();
  });
});

function buildController(state: Record<string, unknown> = {}) {
  return {
    discard: controller.discard,
    retryRead: controller.retryRead,
    retrySave: controller.retrySave,
    retryTimezones: controller.retryTimezones,
    save: controller.save,
    state: {
      kind: 'ready',
      canConfigure: true,
      current: { locale: 'en_US', timeZoneId: 'UTC', theme: 'dark-ops' },
      dirty: false,
      locked: false,
      proving: false,
      recovery: null,
      saving: false,
      timezoneOptions: [{ value: 'UTC', label: 'UTC (UTC+00:00) UTC' }],
      timezonesFailed: false,
      timezonesPending: false,
      valid: true,
      ...state
    },
    update: controller.update
  };
}

function renderPage() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/settings/system']}>
        <App>
          <SystemConfigPage />
        </App>
      </MemoryRouter>
    </I18nextProvider>
  );
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
