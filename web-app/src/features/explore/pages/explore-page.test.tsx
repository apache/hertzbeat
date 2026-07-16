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
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';
import en from '@/assets/i18n/en-us.json';

const api = vi.hoisted(() => ({
  loadMetricSignal: vi.fn(),
  loadLogSignal: vi.fn(),
  loadTraceSignal: vi.fn(),
  openLogStream: vi.fn()
}));

vi.mock('../api/explore-api', async importOriginal => ({
  ...await importOriginal<typeof import('../api/explore-api')>(),
  ...api
}));

import { ExplorePage } from './explore-page';

describe('ExplorePage instrumentation context boundary', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    const pending = () => new Promise<never>(() => undefined);
    api.loadMetricSignal.mockImplementation(pending);
    api.loadLogSignal.mockImplementation(pending);
    api.loadTraceSignal.mockImplementation(pending);
    api.openLogStream.mockReturnValue({
      close: vi.fn(),
      addEventListener: vi.fn(),
      onopen: null,
      onerror: null
    });
  });

  afterEach(() => cleanup());

  it('does not widen partial or reversed instrumentation scope into any signal query or SSE stream', async () => {
    const invalidEntries = [
      '/explore?signal=metrics&serviceNamespace=commerce',
      '/explore?signal=logs&serviceName=checkout&serviceNamespace=commerce&environment=prod&collectorId=east&start=2000&end=1000',
      '/explore?signal=traces&collectorId=east',
      '/explore?signal=logs&live=true&collectorId=east'
    ];

    for (const entry of invalidEntries) {
      renderPage(entry);
      expect(await screen.findByText(en.explore.handoffInvalid))
        .toBeInTheDocument();
      cleanup();
    }

    expect(api.loadMetricSignal).not.toHaveBeenCalled();
    expect(api.loadLogSignal).not.toHaveBeenCalled();
    expect(api.loadTraceSignal).not.toHaveBeenCalled();
    expect(api.openLogStream).not.toHaveBeenCalled();
  });

  it('continues to query ordinary Explore scope', async () => {
    renderPage('/explore?signal=metrics&serviceName=checkout&environment=prod');

    await waitFor(() => expect(api.loadMetricSignal).toHaveBeenCalledWith(
      expect.objectContaining({ signal: 'metrics', serviceName: 'checkout', environment: 'prod' }),
      expect.any(AbortSignal)
    ));
  });

  it('preserves a complete scoped instrumentation handoff', async () => {
    renderPage('/explore?signal=logs&serviceName=checkout&serviceNamespace=commerce&environment=prod'
      + '&collectorId=east&start=1710000000000&end=1710000005000');

    await waitFor(() => expect(api.loadLogSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        signal: 'logs', serviceName: 'checkout', serviceNamespace: 'commerce', environment: 'prod',
        collectorId: 'east', start: 1_710_000_000_000, end: 1_710_000_005_000
      }),
      expect.any(AbortSignal)
    ));
  });
});

function renderPage(initialEntry: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <App><ExplorePage /></App>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
