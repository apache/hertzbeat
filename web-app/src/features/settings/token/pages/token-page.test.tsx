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
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import { requireDomElement } from '@/test/dom-element';

const controller = vi.hoisted(() => ({
  closeGeneratedToken: vi.fn(),
  closeGenerator: vi.fn(),
  copyGeneratedToken: vi.fn(),
  generate: vi.fn(),
  openGenerator: vi.fn(),
  retry: vi.fn(),
  revoke: vi.fn(),
  updateDraft: vi.fn(),
  useTokenResourceController: vi.fn()
}));

vi.mock('../controller/token-resource-controller', () => ({
  useTokenResourceController: controller.useTokenResourceController
}));

import { TokenPage } from './token-page';

const record = {
  id: 7,
  name: 'Collector',
  tokenMask: 'eyJh****once',
  tokenScope: 'otlp-ingest' as const,
  workspaceId: 'default',
  creator: 'admin',
  gmtCreate: null,
  expireTime: null,
  lastUsedTime: null
};

describe('TokenPage', () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });

  beforeEach(() => controller.useTokenResourceController.mockReturnValue(buildController()));

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders authoritative metadata and does not relabel an unknown scope', () => {
    controller.useTokenResourceController.mockReturnValue(
      buildController({
        list: { kind: 'ready', records: [record, { ...record, id: 8, tokenMask: 'eyJh****ture', tokenScope: null }] }
      })
    );

    renderTokenPage();

    expect(screen.getByText('eyJh****once')).toBeInTheDocument();
    expect(screen.getByText('OTLP ingestion')).toBeInTheDocument();
    const futureRow = screen.getByText('eyJh****ture').closest('tr');
    expect(futureRow).not.toBeNull();
    expect(within(futureRow as HTMLElement).getAllByText('—').length).toBeGreaterThan(0);
  });

  it('renders the page identity and delegates token generation from the header', () => {
    renderTokenPage();

    const page = requireDomElement(document.querySelector('[data-hb-operational-page]'), 'Operational page');
    const header = requireDomElement(
      document.querySelector('[data-hb-operational-page-header]'),
      'Operational page header'
    );
    const headerActions = requireDomElement(
      header.querySelector('[data-hb-operational-page-actions]'),
      'Operational page actions'
    );
    const generate = screen.getByRole('button', { name: i18n.t('token.generate') });
    expect(page).toContainElement(header);
    expect(header).toContainElement(screen.getByRole('heading', { name: i18n.t('token.title') }));
    expect(headerActions).toContainElement(generate);
    fireEvent.click(generate);

    expect(controller.openGenerator).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['unavailable', 'Token data is unavailable.'],
    ['invalid', 'The token response is invalid.'],
    ['permission', 'Your account does not have permission to open this page.'],
    ['error', 'This page could not be loaded. Retry or return to it later.']
  ] as const)('keeps the %s list state distinct and retryable', (kind, message) => {
    controller.useTokenResourceController.mockReturnValue(buildController({ list: { kind } }));

    renderTokenPage();

    expect(screen.getByText(message)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(controller.retry).toHaveBeenCalledTimes(1);
  });

  it('delegates draft, one-time copy, and close actions to the controller', () => {
    controller.useTokenResourceController.mockReturnValue(
      buildController({
        draft: { name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest' },
        generatedToken: 'hb_generated_once'
      })
    );

    renderTokenPage();
    const nameInputs = screen.getAllByPlaceholderText('For example, production Collector');
    const nameInput = nameInputs.at(-1);
    if (!nameInput) throw new Error('Token name input was not rendered.');
    const generator = nameInput.closest('[role="dialog"]');
    if (!(generator instanceof HTMLElement)) throw new Error('Token generator dialog was not rendered.');
    fireEvent.change(nameInput, {
      target: { value: 'Production Collector' }
    });
    expect(controller.updateDraft).toHaveBeenCalledWith({
      name: 'Production Collector',
      expireSeconds: -1,
      scope: 'otlp-ingest'
    });
    fireEvent.click(within(generator).getByRole('button', { name: 'Generate token' }));
    expect(controller.generate).toHaveBeenCalledTimes(1);

    const generated = screen.getByText('hb_generated_once').closest('[role="dialog"]');
    if (!(generated instanceof HTMLElement)) throw new Error('Generated Token dialog was not rendered.');
    expect(within(generated).getByText('hb_generated_once')).toBeInTheDocument();
    fireEvent.click(within(generated).getByRole('button', { name: 'Copy token' }));
    fireEvent.click(within(generated).getByRole('button', { name: 'Done' }));
    expect(controller.copyGeneratedToken).toHaveBeenCalledTimes(1);
    expect(controller.closeGeneratedToken).toHaveBeenCalledTimes(1);
  });

  it('locks generator dismissal and fields while generation is pending', () => {
    controller.useTokenResourceController.mockReturnValue(
      buildController({
        draft: { name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest' },
        generating: true
      })
    );

    renderTokenPage();

    const headerActions = document.querySelector('[data-hb-operational-page-actions]');
    if (!(headerActions instanceof HTMLElement)) throw new Error('Token header actions were not rendered.');
    const headerGenerate = within(headerActions).getByRole('button', { name: i18n.t('token.generate') });
    expect(headerGenerate).toHaveClass('ant-btn-loading');
    const nameInput = screen.getByPlaceholderText('For example, production Collector');
    const generator = nameInput.closest('[role="dialog"]');
    if (!(generator instanceof HTMLElement)) throw new Error('Token generator dialog was not rendered.');

    expect(nameInput).toBeDisabled();
    for (const selector of within(generator).getAllByRole('combobox')) expect(selector).toBeDisabled();
    expect(within(generator).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(within(generator).queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });

  it('keeps an uncertain generation visible and locked without inventing a secret', () => {
    const draft = { name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest' as const };
    controller.useTokenResourceController.mockReturnValue(
      buildController({
        draft,
        generationRecovery: { phase: 'commit-uncertain', draft }
      })
    );

    renderTokenPage();

    const headerActions = document.querySelector('[data-hb-operational-page-actions]');
    if (!(headerActions instanceof HTMLElement)) throw new Error('Token header actions were not rendered.');
    const headerGenerate = within(headerActions).getByRole('button', { name: i18n.t('token.generate') });
    expect(headerGenerate).toBeDisabled();
    expect(screen.getByText('Token data is unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('Token generated')).not.toBeInTheDocument();
    const generator = screen.getByPlaceholderText('For example, production Collector').closest('[role="dialog"]');
    if (!(generator instanceof HTMLElement)) throw new Error('Token generator dialog was not rendered.');
    expect(within(generator).getByPlaceholderText('For example, production Collector')).toBeDisabled();
    expect(within(generator).getByRole('button', { name: 'Generate token' })).toBeDisabled();
    expect(within(generator).getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('requires UI confirmation before delegating revocation', () => {
    renderTokenPage();

    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    const dialog = screen.getByRole('dialog', { name: 'Revoke this token?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Revoke' }));
    expect(controller.revoke).toHaveBeenCalledWith(7);
  });

  it('locks every revoke action while the exclusive revoke command is pending', () => {
    controller.useTokenResourceController.mockReturnValue(
      buildController({
        list: { kind: 'ready', records: [record, { ...record, id: 8, name: 'Query client' }] },
        revokingId: 7
      })
    );

    renderTokenPage();

    for (const revoke of screen.getAllByRole('button', { name: 'Revoke' })) expect(revoke).toBeDisabled();
  });

  it('does not render stale rows while revocation proof is unavailable', () => {
    controller.useTokenResourceController.mockReturnValue(
      buildController({
        list: { kind: 'unavailable' }
      })
    );

    renderTokenPage();

    expect(screen.getByText('Token data is unavailable.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(controller.retry).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument();
  });
});

function buildController(state: Record<string, unknown> = {}) {
  return {
    closeGeneratedToken: controller.closeGeneratedToken,
    closeGenerator: controller.closeGenerator,
    copyGeneratedToken: controller.copyGeneratedToken,
    generate: controller.generate,
    openGenerator: controller.openGenerator,
    retry: controller.retry,
    revoke: controller.revoke,
    state: {
      draft: null,
      generatedToken: null,
      generationRecovery: null,
      generating: false,
      list: { kind: 'ready', records: [record] },
      refreshing: false,
      revokingId: null,
      ...state
    },
    updateDraft: controller.updateDraft
  };
}

function renderTokenPage() {
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/settings/tokens?scope=otlp-ingest']}>
        <App>
          <TokenPage />
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
