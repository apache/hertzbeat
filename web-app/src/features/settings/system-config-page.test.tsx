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
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

const { loadSystemConfig, loadTimezones, saveSystemConfig } = vi.hoisted(() => ({
  loadSystemConfig: vi.fn(),
  loadTimezones: vi.fn(),
  saveSystemConfig: vi.fn()
}));

vi.mock('./system-config-api', () => ({ loadSystemConfig, loadTimezones, saveSystemConfig }));

import { SystemConfigPage } from './system-config-page';

describe('SystemConfigPage', () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale('en-US');
  });

  beforeEach(() => {
    loadSystemConfig.mockResolvedValue({ locale: 'en_US', timeZoneId: 'UTC', theme: 'default' });
    loadTimezones.mockResolvedValue([{ zoneId: 'UTC', offset: 'UTC+00:00', displayName: 'Coordinated Universal Time' }]);
    saveSystemConfig.mockResolvedValue('success');
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows the persisted language, timezone, and theme without creating a dirty form', async () => {
    renderSystemConfigPage();
    expect(await screen.findByText('UTC (UTC+00:00) Coordinated Universal Time')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeDisabled();
  });

  it('keeps configuration failure distinct from an empty form', async () => {
    loadSystemConfig.mockRejectedValue(new Error('unavailable'));
    renderSystemConfigPage();
    expect(await screen.findByText('System settings are unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('No unsaved changes.')).not.toBeInTheDocument();
  });
});

function renderSystemConfigPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/settings/system']}>
          <App><SystemConfigPage /></App>
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
