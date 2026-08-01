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
  retry: vi.fn(),
  submit: vi.fn(),
  updateDraft: vi.fn(),
  useObjectStoreResourceController: vi.fn()
}));

vi.mock('../controller/object-store-resource-controller', () => ({
  useObjectStoreResourceController: controller.useObjectStoreResourceController
}));

import { ObjectStorePage } from './object-store-page';

const configuredObs = {
  type: 'OBS' as const,
  configuredSecrets: ['accessKey', 'secretKey'] as const,
  config: {
    accessKey: '',
    secretKey: '',
    bucketName: 'bucket',
    endpoint: 'https://obs.cn-north-4.myhuaweicloud.com',
    savePath: 'hertzbeat'
  }
};

describe('ObjectStorePage', () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    controller.useObjectStoreResourceController.mockReturnValue(buildController());
  });

  afterEach(cleanup);

  it('owns title and description in a shared header without actions', () => {
    renderObjectStorePage();

    const page = requireDomElement(document.querySelector('[data-hb-operational-page]'), 'Operational page');
    const header = requireDomElement(
      document.querySelector('[data-hb-operational-page-header]'),
      'Operational page header'
    );
    expect(page).toContainElement(header);
    expect(header).toContainElement(screen.getByRole('heading', { name: 'Object storage' }));
    expect(header.querySelector('[data-hb-operational-page-actions]')).not.toBeInTheDocument();
  });

  it('renders the ready controller state and forwards editor actions', async () => {
    renderObjectStorePage();

    expect(await screen.findByPlaceholderText('OBS secret key')).toHaveValue('');
    expect(screen.getByPlaceholderText('OBS access key')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByPlaceholderText('OBS secret key')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getAllByText('A credential is already configured. Leave this field blank to keep it.')).toHaveLength(
      2
    );

    fireEvent.change(screen.getByPlaceholderText('OBS access key'), {
      target: { value: 'changed-ak' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));

    expect(controller.updateDraft).toHaveBeenCalledWith({
      ...configuredObs,
      config: { ...configuredObs.config, accessKey: 'changed-ak' }
    });
    expect(controller.submit).toHaveBeenCalledTimes(1);
    expect(controller.discard).toHaveBeenCalledTimes(1);
  });

  it('renders unavailable evidence and delegates retry', async () => {
    controller.useObjectStoreResourceController.mockReturnValue(buildController({ kind: 'unavailable' }));
    renderObjectStorePage();

    expect(await screen.findByText('Object storage configuration is unavailable.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(controller.retry).toHaveBeenCalledTimes(1);
    expect(screen.queryByPlaceholderText('OBS access key')).not.toBeInTheDocument();
  });

  it('renders non-availability failures as a distinct retryable error', async () => {
    controller.useObjectStoreResourceController.mockReturnValue(buildController({ kind: 'error' }));
    renderObjectStorePage();

    expect(await screen.findByText('This page could not be loaded. Retry or return to it later.')).toBeInTheDocument();
    expect(screen.queryByText('Object storage configuration is unavailable.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(controller.retry).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['invalid', 'The object storage response is invalid.'],
    ['permission', 'Your account does not have permission to open this page.']
  ] as const)('renders %s evidence with fixed local copy', async (kind, message) => {
    controller.useObjectStoreResourceController.mockReturnValue(buildController({ kind }));
    renderObjectStorePage();

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('OBS access key')).not.toBeInTheDocument();
  });

  it('renders an editable DATABASE baseline for an administrator when configuration is missing', async () => {
    controller.useObjectStoreResourceController.mockReturnValue(
      buildController({
        unconfigured: true,
        current: { type: 'DATABASE', config: {}, configuredSecrets: [] },
        dirty: false,
        canSubmit: true
      })
    );
    renderObjectStorePage();

    expect(await screen.findByText('Object storage has not been configured.')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(controller.submit).toHaveBeenCalledTimes(1);
  });

  it('keeps missing configuration non-editable for a read-only role', async () => {
    controller.useObjectStoreResourceController.mockReturnValue(buildController({ kind: 'missing' }, false));
    renderObjectStorePage();

    expect(await screen.findByText('Object storage has not been configured.')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('renders loading without exposing stale editor values', () => {
    controller.useObjectStoreResourceController.mockReturnValue(buildController({ kind: 'loading' }));
    const { container } = renderObjectStorePage();

    expect(container.querySelector('.ant-skeleton')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('OBS access key')).not.toBeInTheDocument();
  });

  it('locks every editor action while a save is pending', async () => {
    controller.useObjectStoreResourceController.mockReturnValue(buildController({ locked: true, saving: true }));
    renderObjectStorePage();

    expect(await screen.findByPlaceholderText('OBS access key')).toBeDisabled();
    expect(screen.getByPlaceholderText('OBS secret key')).toBeDisabled();
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Save$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeDisabled();
  });

  it('keeps the redacted configuration readable without write affordances for a non-writer', async () => {
    controller.useObjectStoreResourceController.mockReturnValue(buildController({}, false));
    renderObjectStorePage();

    expect(await screen.findByText('Only administrators can change object storage configuration.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('OBS access key')).toBeDisabled();
    expect(screen.getByPlaceholderText('OBS secret key')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Discard changes' })).not.toBeInTheDocument();
  });

  it('keeps proof recovery visible, locked, and GET-retryable', async () => {
    controller.useObjectStoreResourceController.mockReturnValue(
      buildController({ locked: true, recovery: { phase: 'proof' } })
    );
    renderObjectStorePage();

    expect(await screen.findByText('Object storage configuration is unavailable.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(controller.retry).toHaveBeenCalledTimes(1);
    expect(screen.getByPlaceholderText('OBS access key')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Save$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeDisabled();
  });

  it('shows commit uncertainty without offering an unsafe retry', async () => {
    controller.useObjectStoreResourceController.mockReturnValue(
      buildController({ locked: true, recovery: { phase: 'commit-uncertain' } })
    );
    renderObjectStorePage();

    expect(await screen.findByText('Object storage configuration is unavailable.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('OBS secret key')).toBeDisabled();
  });
});

function buildController(state: Record<string, unknown> = {}, canWrite = true) {
  return {
    canWrite,
    discard: controller.discard,
    retry: controller.retry,
    state: {
      kind: 'ready',
      canSubmit: true,
      current: configuredObs,
      dirty: true,
      locked: false,
      missingFields: [],
      recovery: null,
      saving: false,
      showValidation: false,
      ...state
    },
    submit: controller.submit,
    updateDraft: controller.updateDraft
  };
}

function renderObjectStorePage() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/settings/storage/object-store']}>
        <App>
          <ObjectStorePage />
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
