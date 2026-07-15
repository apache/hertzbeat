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
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

const { generateToken, loadTokens, revokeToken } = vi.hoisted(() => ({
  generateToken: vi.fn(),
  loadTokens: vi.fn(),
  revokeToken: vi.fn()
}));

vi.mock('./token-api', () => ({ generateToken, loadTokens, revokeToken }));

import { TokenPage } from './token-page';

describe('TokenPage', () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });

  beforeEach(() => {
    loadTokens.mockResolvedValue([{ id: 7, name: 'Collector', tokenMask: 'hb_****_once', tokenScope: 'otlp-ingest', creator: 'admin' }]);
    generateToken.mockResolvedValue('hb_generated_once');
    revokeToken.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('lists tokens and generates a scoped token that is shown once', async () => {
    const client = renderTokenPage('/settings/tokens?scope=otlp-ingest');

    expect(await screen.findByText('hb_****_once')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Generate token' }));
    const dialog = screen.getByRole('dialog', { name: 'Generate API token' });
    fireEvent.change(within(dialog).getByPlaceholderText('For example, production Collector'), { target: { value: 'Production Collector' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Generate token' }));

    await waitFor(() => expect(generateToken.mock.calls[0]?.[0]).toEqual({ name: 'Production Collector', expireSeconds: -1, scope: 'otlp-ingest' }));
    expect(await screen.findByText('hb_generated_once')).toBeInTheDocument();
    expect(screen.getByText('Copy this token now. It will not be shown again.')).toBeInTheDocument();
    expect(client.getMutationCache().getAll().some(mutation => mutation.state.data === 'hb_generated_once')).toBe(false);
  });

  it('requires confirmation before revoking a token', async () => {
    renderTokenPage('/settings/tokens');
    await screen.findByText('hb_****_once');
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    const dialog = screen.getByRole('dialog', { name: 'Revoke this token?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Revoke' }));
    await waitFor(() => expect(revokeToken.mock.calls[0]?.[0]).toBe(7));
  });
});

function renderTokenPage(initialEntry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <App><TokenPage /></App>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
  return client;
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
