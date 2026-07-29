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

// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  loadAlertIntegrationCatalog: vi.fn(),
  loadAlertIntegrationGuide: vi.fn()
}));
vi.mock('../api/alert-integration-api', () => api);

import { AlertIntegrationRequestFailure } from '../model/alert-integration-model';
import { alertIntegrationQueryKeys } from './alert-integration-query-keys';
import { useAlertIntegrationController } from './use-alert-integration-controller';

describe('useAlertIntegrationController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadAlertIntegrationCatalog.mockResolvedValue(catalog);
    api.loadAlertIntegrationGuide.mockImplementation((source: string) =>
      Promise.resolve({ ...guide, source, displayNameKey: `alert.integration.source.${source}` })
    );
  });

  it('preserves backend catalog order and loads detail only for a catalog hit', async () => {
    const client = queryClient();
    const view = renderController('/alerts/integrations/webhook', client);

    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));

    const state = view.result.current.state;
    if (state.kind !== 'ready') throw new Error('Expected the integration guide to be ready');
    expect(state.catalog.map(item => item.source)).toEqual(['prometheus', 'webhook']);
    expect(api.loadAlertIntegrationCatalog).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(api.loadAlertIntegrationGuide).toHaveBeenCalledWith('webhook', expect.any(AbortSignal));
    expect(client.getQueryState(alertIntegrationQueryKeys.catalog())).toBeDefined();
    expect(client.getQueryState(alertIntegrationQueryKeys.detail('webhook'))).toBeDefined();
  });

  it('treats an unknown deep link as local not-found without a detail request', async () => {
    const view = renderController('/alerts/integrations/unknown');

    await waitFor(() => expect(view.result.current.state.kind).toBe('not-found'));

    expect(api.loadAlertIntegrationGuide).not.toHaveBeenCalled();
  });

  it('does not request arbitrary detail while catalog ownership is unresolved', () => {
    api.loadAlertIntegrationCatalog.mockReturnValue(new Promise(() => undefined));
    const view = renderController('/alerts/integrations/webhook');

    expect(view.result.current.state).toEqual({ kind: 'loading' });
    expect(api.loadAlertIntegrationGuide).not.toHaveBeenCalled();
  });

  it('retries a failed catalog without forcing the disabled detail query for an unknown deep link', async () => {
    api.loadAlertIntegrationCatalog.mockRejectedValueOnce(new AlertIntegrationRequestFailure('unavailable'));
    const view = renderController('/alerts/integrations/unknown');
    await waitFor(() => expect(view.result.current.state.kind).toBe('unavailable'));
    api.loadAlertIntegrationCatalog.mockResolvedValue(catalog);

    await act(() => view.result.current.actions.retry());
    await waitFor(() => expect(view.result.current.state.kind).toBe('not-found'));

    expect(api.loadAlertIntegrationCatalog).toHaveBeenCalledTimes(2);
    expect(api.loadAlertIntegrationGuide).not.toHaveBeenCalled();
  });

  it('retries only the failed detail after the catalog has established source ownership', async () => {
    api.loadAlertIntegrationGuide.mockRejectedValueOnce(new AlertIntegrationRequestFailure('unavailable'));
    const view = renderController('/alerts/integrations/webhook');
    await waitFor(() => expect(view.result.current.state.kind).toBe('unavailable'));
    api.loadAlertIntegrationGuide.mockResolvedValue(guide);

    await act(() => view.result.current.actions.retry());
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));

    expect(api.loadAlertIntegrationCatalog).toHaveBeenCalledTimes(1);
    expect(api.loadAlertIntegrationGuide).toHaveBeenCalledTimes(2);
  });

  it('retires copy state when the selected source changes', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) }
    });
    const view = renderController('/alerts/integrations/webhook');
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));

    await act(() => view.result.current.actions.copyEndpoint());
    expect(view.result.current.copyState).toMatchObject({ source: 'webhook', outcome: 'copied' });

    act(() => view.result.current.actions.selectSource('prometheus'));
    await waitFor(() => expect(view.result.current.selectedSource).toBe('prometheus'));
    expect(view.result.current.copyState).toBeNull();
  });
});

const catalog = {
  items: [
    {
      source: 'prometheus',
      displayNameKey: 'alert.integration.source.prometheus',
      iconKey: 'prometheus',
      readiness: 'ready',
      limitations: []
    },
    {
      source: 'webhook',
      displayNameKey: 'alert.integration.source.webhook',
      iconKey: 'hertzbeat',
      readiness: 'ready',
      limitations: []
    }
  ]
};
const guide = {
  ...catalog.items[1],
  method: 'POST',
  ingressPath: '/api/alerts/report',
  payloadShape: 'single_alert',
  requiredHeaders: { Authorization: 'Bearer {token}' },
  requiredFields: ['labels'],
  steps: ['alert.integration.webhook.step.create_token'],
  snippets: ['{"status":"firing"}'],
  acknowledgement: 'alert.integration.ack.accepted_for_processing'
};

function renderController(path: string, client = queryClient()) {
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/alerts/integrations/:source" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return renderHook(() => useAlertIntegrationController(), { wrapper });
}

function queryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
}
