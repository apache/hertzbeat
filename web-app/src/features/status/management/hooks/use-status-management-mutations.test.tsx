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
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { i18n, initializeI18n, loadLocale } from '@/core/i18n/i18n';

const api = vi.hoisted(() => ({
  deleteStatusComponent: vi.fn(),
  deleteStatusIncident: vi.fn(),
  saveStatusComponent: vi.fn(),
  saveStatusIncident: vi.fn(),
  saveStatusOrg: vi.fn()
}));
vi.mock('../api/status-management-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/status-management-api')>()),
  ...api
}));

import { useStatusManagementMutations } from './use-status-management-mutations';

describe('useStatusManagementMutations', () => {
  beforeAll(async () => {
    await initializeI18n();
    await loadLocale('en-US');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(api).forEach(mock => mock.mockResolvedValue(undefined));
  });

  it('saves the organization and refreshes only its query', async () => {
    const context = renderMutations();
    act(() => context.result.current.orgSave.mutate({
      name: 'Updated', description: 'Status', home: '/', logo: '/logo.svg', state: 0
    }));

    await waitFor(() => expect(api.saveStatusOrg).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated' })));
    expect(context.invalidate).toHaveBeenCalledWith({ queryKey: ['status-page-org'] });
  });

  it('orchestrates component create, update, delete, and refresh', async () => {
    const close = vi.fn();
    const context = renderMutations(close);
    const component = { orgId: 1, name: 'API', method: 0, configState: 0, state: 0 };

    act(() => context.result.current.componentSave.mutate(component));
    await waitFor(() => expect(api.saveStatusComponent).toHaveBeenCalledWith(component, true));
    act(() => context.result.current.componentSave.mutate({ ...component, id: 4 }));
    await waitFor(() => expect(api.saveStatusComponent).toHaveBeenCalledWith({ ...component, id: 4 }, false));
    act(() => context.result.current.componentRemove.mutate(4));
    await waitFor(() => expect(api.deleteStatusComponent).toHaveBeenCalledWith(4));

    expect(close).toHaveBeenCalledTimes(2);
    expect(context.invalidate).toHaveBeenCalledWith({ queryKey: ['status-page-components'] });
  });

  it('keeps incident detail loading out of the general mutation controller', () => {
    const context = renderMutations();

    expect(context.result.current).not.toHaveProperty('incidentDetail');
  });

  it('orchestrates incident create, update, delete, and refresh', async () => {
    const closeIncident = vi.fn();
    const context = renderMutations(undefined, closeIncident);
    const incident = { orgId: 1, name: 'Outage', state: 0, components: [], contents: [] };

    act(() => context.result.current.incidentSave.mutate(incident));
    await waitFor(() => expect(api.saveStatusIncident).toHaveBeenCalledWith(incident, true));
    act(() => context.result.current.incidentSave.mutate({ ...incident, id: 7 }));
    await waitFor(() => expect(api.saveStatusIncident).toHaveBeenCalledWith({ ...incident, id: 7 }, false));
    act(() => context.result.current.incidentRemove.mutate(7));
    await waitFor(() => expect(api.deleteStatusIncident).toHaveBeenCalledWith(7));

    expect(closeIncident).toHaveBeenCalledTimes(2);
    expect(context.invalidate).toHaveBeenCalledWith({ queryKey: ['status-page-incidents'] });
  });
});

function renderMutations(closeComponent = vi.fn(), closeIncident = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <App>{children}</App>
      </QueryClientProvider>
    </I18nextProvider>
  );
  const result = renderHook(() => useStatusManagementMutations(undefined, closeComponent, closeIncident), { wrapper });
  return { ...result, invalidate };
}
