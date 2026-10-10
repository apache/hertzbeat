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
  loadAlertIntegrationGuide: vi.fn(),
  startAlertIntegrationVerification: vi.fn()
}));
const publicAccess = vi.hoisted(() => ({ load: vi.fn() }));
const auth = vi.hoisted(() => ({ roles: ['ADMIN'] as string[] }));
vi.mock('../api/alert-integration-api', () => api);
vi.mock('@/features/settings/system-config/api/public-access-config-api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/settings/system-config/api/public-access-config-api')>()),
  loadPublicAccessConfig: publicAccess.load
}));
vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({ session: { authenticated: true, roles: auth.roles } })
}));

import { AlertIntegrationRequestFailure, type AlertIntegrationCatalog } from '../model/alert-integration-model';
import { alertIntegrationQueryKeys } from './alert-integration-query-keys';
import {
  alertIntegrationCatalogRefreshInterval,
  useAlertIntegrationController
} from './use-alert-integration-controller';

describe('useAlertIntegrationController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.roles = ['ADMIN'];
    api.loadAlertIntegrationCatalog.mockResolvedValue(catalog);
    api.loadAlertIntegrationGuide.mockImplementation((source: string) =>
      Promise.resolve({ ...guide, source, displayNameKey: `alert.integration.source.${source}` })
    );
    api.startAlertIntegrationVerification.mockResolvedValue({ status: 'waiting', startedAt: 100, verifiedAt: null });
    publicAccess.load.mockResolvedValue({
      publicBaseUrl: null,
      serverOtlpHttpEndpoint: null,
      serverOtlpGrpcEndpoint: null
    });
  });

  it('fails closed for token management when the guide remains readable to a guest', async () => {
    auth.roles = ['GUEST'];
    const view = renderController('/alerts/integrations/webhook');

    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));

    expect(view.result.current.canManageTokens).toBe(false);
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
    const tokenPath = new URL(view.result.current.tokenSettingsPath, 'https://hertzbeat.local');
    expect(tokenPath.searchParams.get('scope')).toBe('api-admin');
    expect(tokenPath.searchParams.get('returnTo')).toBe('/alerts/integrations/webhook');
  });

  it('uses the persisted public access address to generate a full callback URL', async () => {
    publicAccess.load.mockResolvedValue({
      publicBaseUrl: 'https://hertzbeat.example.test/ops',
      serverOtlpHttpEndpoint: null,
      serverOtlpGrpcEndpoint: null
    });
    const view = renderController('/alerts/integrations/webhook');

    await waitFor(() =>
      expect(view.result.current.contract).toMatchObject({
        endpoint: 'https://hertzbeat.example.test/ops/api/alerts/report',
        ingressPath: '/api/alerts/report',
        publicBaseUrlConfigured: true
      })
    );

    expect(publicAccess.load).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it('replaces an unknown deep link with the first source owned by the backend catalog', async () => {
    const view = renderController('/alerts/integrations/unknown');

    await waitFor(() => expect(view.result.current.selectedSource).toBe('prometheus'));
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));

    expect(api.loadAlertIntegrationGuide).toHaveBeenCalledWith('prometheus', expect.any(AbortSignal));
  });

  it('settles an empty successful catalog as a recoverable not-found state', async () => {
    api.loadAlertIntegrationCatalog.mockResolvedValue({ items: [] });
    const view = renderController('/alerts/integrations/unknown');

    await waitFor(() => expect(view.result.current.state).toEqual({ kind: 'not-found', catalog: [] }));

    expect(view.result.current.selectedSource).toBe('unknown');
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
    await waitFor(() => expect(view.result.current.selectedSource).toBe('prometheus'));
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));

    expect(api.loadAlertIntegrationCatalog).toHaveBeenCalledTimes(2);
    expect(api.loadAlertIntegrationGuide).toHaveBeenCalledWith('prometheus', expect.any(AbortSignal));
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

  it('navigates between sources without inventing client-side guide state', async () => {
    const view = renderController('/alerts/integrations/webhook');
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));

    act(() => view.result.current.actions.selectSource('prometheus'));
    await waitFor(() => expect(view.result.current.selectedSource).toBe('prometheus'));
    expect(api.loadAlertIntegrationGuide).toHaveBeenCalledWith('prometheus', expect.any(AbortSignal));
  });

  it('starts verification and immediately replaces the selected catalog evidence', async () => {
    const view = renderController('/alerts/integrations/webhook');
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));

    await act(() => view.result.current.actions.startVerification());

    expect(api.startAlertIntegrationVerification).toHaveBeenCalledWith('webhook');
    await waitFor(() => {
      const state = view.result.current.state;
      expect(state.kind === 'ready' && state.catalog[1]?.verification.status).toBe('waiting');
    });
  });

  it('applies a completed verification to its requested source after navigation', async () => {
    let completeVerification: ((value: { status: 'waiting'; startedAt: number; verifiedAt: null }) => void) | undefined;
    api.startAlertIntegrationVerification.mockReturnValue(
      new Promise(resolve => {
        completeVerification = resolve;
      })
    );
    const view = renderController('/alerts/integrations/webhook');
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));

    let request: Promise<unknown> | undefined;
    act(() => {
      request = view.result.current.actions.startVerification();
    });
    act(() => view.result.current.actions.selectSource('prometheus'));
    await waitFor(() => expect(view.result.current.selectedSource).toBe('prometheus'));
    act(() => completeVerification?.({ status: 'waiting', startedAt: 100, verifiedAt: null }));
    await act(async () => request);
    await waitFor(() => expect(view.result.current.state.kind).toBe('ready'));

    const state = view.result.current.state;
    if (state.kind !== 'ready') throw new Error('Expected the integration guide to be ready');
    expect(state.catalog.find(item => item.source === 'webhook')?.verification.status).toBe('waiting');
    expect(state.catalog.find(item => item.source === 'prometheus')?.verification.status).toBe('unverified');
  });

  it('polls only while at least one real-event verification is waiting', () => {
    expect(alertIntegrationCatalogRefreshInterval(catalog)).toBe(false);
    expect(
      alertIntegrationCatalogRefreshInterval({
        items: [
          {
            ...catalog.items[0]!,
            verification: { status: 'waiting', startedAt: 100, verifiedAt: null }
          }
        ]
      })
    ).toBe(2_000);
  });
});

const catalog: AlertIntegrationCatalog = {
  items: [
    {
      source: 'prometheus',
      displayNameKey: 'alert.integration.source.prometheus',
      iconKey: 'prometheus',
      readiness: 'ready',
      limitations: [],
      verification: { status: 'unverified', startedAt: null, verifiedAt: null }
    },
    {
      source: 'webhook',
      displayNameKey: 'alert.integration.source.webhook',
      iconKey: 'hertzbeat',
      readiness: 'ready',
      limitations: [],
      verification: { status: 'unverified', startedAt: null, verifiedAt: null }
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
