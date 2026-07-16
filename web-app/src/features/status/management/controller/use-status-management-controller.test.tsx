/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import {
  StatusManagementMissingError,
  type StatusComponent,
  type StatusIncident,
  type StatusOrgRecord
} from '../model/status-management-contract';

const api = vi.hoisted(() => ({
  deleteStatusComponent: vi.fn(),
  deleteStatusIncident: vi.fn(),
  loadStatusComponent: vi.fn(),
  loadStatusComponents: vi.fn(),
  loadStatusIncident: vi.fn(),
  loadStatusIncidents: vi.fn(),
  loadStatusOrg: vi.fn(),
  saveStatusComponent: vi.fn(),
  saveStatusIncident: vi.fn(),
  saveStatusOrg: vi.fn()
}));
const notification = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock('../api/status-management-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/status-management-api')>()),
  ...api
}));
vi.mock('antd', () => ({ App: { useApp: () => ({ message: notification }) } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { useStatusManagementController } from './use-status-management-controller';

const org: StatusOrgRecord = {
  id: 1, name: 'HertzBeat', description: 'Status', home: '/', logo: '/logo.svg', state: 0
};
const component: StatusComponent = {
  id: 4, orgId: 1, name: 'API', method: 0, configState: 0, state: 0
};
const incident: StatusIncident = {
  id: 7, orgId: 1, name: 'Outage', state: 0, components: [component], contents: []
};

describe('useStatusManagementController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.loadStatusOrg.mockResolvedValue(org);
    api.loadStatusComponents.mockResolvedValue([component]);
    api.loadStatusIncidents.mockResolvedValue(incidentPage([incident], 1));
    api.loadStatusComponent.mockResolvedValue(component);
    api.loadStatusIncident.mockResolvedValue(incident);
    api.saveStatusOrg.mockResolvedValue(org);
    api.saveStatusComponent.mockResolvedValue(undefined);
    api.saveStatusIncident.mockResolvedValue(undefined);
    api.deleteStatusComponent.mockResolvedValue(undefined);
    api.deleteStatusIncident.mockResolvedValue(undefined);
  });

  it('accepts only the canonical organization returned by POST', async () => {
    const canonical = { ...org, name: 'Canonical' };
    api.saveStatusOrg.mockResolvedValue(canonical);
    const { result } = renderController();
    await waitFor(() => expect(result.current.org.kind).toBe('ready'));

    await act(async () => result.current.saveOrg({ ...org, name: 'Draft' }));

    await waitFor(() => expect(result.current.org).toEqual({ kind: 'ready', record: canonical }));
    expect(notification.success).toHaveBeenCalledWith('statusManagement.saveSuccess');
  });

  it('rejects a failed canonical organization POST without replacing local server state', async () => {
    api.saveStatusOrg.mockRejectedValue(new Error('canonical write failed'));
    const { result } = renderController();
    await waitFor(() => expect(result.current.org.kind).toBe('ready'));

    await act(async () => {
      await expect(result.current.saveOrg({ ...org, name: 'Retryable draft' })).rejects.toThrow();
    });

    expect(result.current.org).toEqual({ kind: 'ready', record: org });
    expect(notification.error).toHaveBeenCalledWith('statusManagement.saveFailed');
    expect(notification.success).not.toHaveBeenCalled();
  });

  it('keeps component create open until the authoritative all-list refresh succeeds', async () => {
    const refresh = deferred<StatusComponent[]>();
    api.loadStatusComponents.mockResolvedValueOnce([component]).mockReturnValueOnce(refresh.promise);
    const { result } = renderController();
    await waitFor(() => expect(result.current.components.kind).toBe('ready'));
    act(() => result.current.openNewComponent());

    act(() => result.current.saveComponent({
      orgId: component.orgId,
      name: component.name,
      method: component.method,
      configState: component.configState,
      state: component.state
    }));
    await waitFor(() => expect(api.saveStatusComponent).toHaveBeenCalledWith(expect.objectContaining({ name: 'API' }), true));
    expect(result.current.componentEditor).toBeDefined();
    expect(notification.success).not.toHaveBeenCalled();

    act(() => refresh.resolve([{ ...component, id: 9 }]));
    await waitFor(() => expect(result.current.componentEditor).toBeUndefined());
    expect(result.current.components).toEqual({ kind: 'ready', records: [{ ...component, id: 9 }] });
  });

  it('requires exact component detail reread plus list refresh for update and missing proof for delete', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.components.kind).toBe('ready'));
    act(() => result.current.editComponent(component));
    act(() => result.current.saveComponent({ ...component, name: 'Updated' }));

    await waitFor(() => expect(api.loadStatusComponent).toHaveBeenCalledWith(4));
    expect(api.loadStatusComponents).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.componentEditor).toBeUndefined());

    api.loadStatusComponent.mockRejectedValueOnce(new StatusManagementMissingError('component'));
    act(() => result.current.deleteComponent(4));
    await waitFor(() => expect(api.deleteStatusComponent).toHaveBeenCalledWith(4));
    await waitFor(() => expect(api.loadStatusComponents).toHaveBeenCalledTimes(3));
    expect(notification.success).toHaveBeenCalledWith('statusManagement.deleteSuccess');
  });

  it('keeps a component editor and exposes unavailable when canonical refresh fails', async () => {
    api.loadStatusComponents.mockResolvedValueOnce([component]).mockRejectedValueOnce(
      new ApiMessageError('Request failed with status 503', { status: 503 })
    );
    const { result } = renderController();
    await waitFor(() => expect(result.current.components.kind).toBe('ready'));
    act(() => result.current.editComponent(component));
    act(() => result.current.saveComponent({ ...component, name: 'Updated' }));

    await waitFor(() => expect(result.current.components.kind).toBe('unavailable'));
    expect(result.current.componentEditor).toMatchObject({ id: 4, name: 'API' });
    expect(notification.success).not.toHaveBeenCalled();

    api.loadStatusComponents.mockResolvedValueOnce([component]);
    act(() => result.current.refreshComponents());
    await waitFor(() => expect(result.current.components).toEqual({ kind: 'ready', records: [component] }));
  });

  it('rejects mismatched canonical detail ids and keeps both editors open', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.components.kind).toBe('ready'));

    api.loadStatusComponent.mockResolvedValueOnce({ ...component, id: 99 });
    act(() => result.current.editComponent(component));
    act(() => result.current.saveComponent({ ...component, name: 'Updated' }));
    await waitFor(() => expect(notification.error).toHaveBeenCalledWith('statusManagement.saveFailed'));
    expect(result.current.componentEditor).toMatchObject({ id: 4 });
    expect(api.loadStatusComponents).toHaveBeenCalledTimes(1);

    notification.error.mockClear();
    act(() => result.current.openIncident(7));
    await waitFor(() => expect(result.current.incidentEditor).toMatchObject({ id: 7 }));
    api.loadStatusIncident.mockResolvedValueOnce({ ...incident, id: 88 });
    act(() => result.current.saveIncident({ ...incident, name: 'Updated' }));
    await waitFor(() => expect(notification.error).toHaveBeenCalledWith('statusManagement.saveFailed'));
    expect(result.current.incidentEditor).toMatchObject({ id: 7 });
    expect(api.loadStatusIncidents).toHaveBeenCalledTimes(1);
    expect(notification.success).not.toHaveBeenCalled();
  });

  it('rejects delete when authoritative detail still exists', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.components.kind).toBe('ready'));

    act(() => result.current.deleteComponent(4));
    await waitFor(() => expect(notification.error).toHaveBeenCalledWith('statusManagement.deleteFailed'));
    expect(api.loadStatusComponents).toHaveBeenCalledTimes(1);

    notification.error.mockClear();
    act(() => result.current.deleteIncident(7));
    await waitFor(() => expect(notification.error).toHaveBeenCalledWith('statusManagement.deleteFailed'));
    expect(api.loadStatusIncidents).toHaveBeenCalledTimes(1);
    expect(notification.success).not.toHaveBeenCalled();
  });

  it('proves incident create, update, and delete through authoritative query evidence', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.incidents.kind).toBe('ready'));

    act(() => result.current.openNewIncident());
    act(() => result.current.saveIncident({
      orgId: incident.orgId,
      name: incident.name,
      state: incident.state,
      components: incident.components ?? [],
      contents: incident.contents ?? []
    }));
    await waitFor(() => expect(api.loadStatusIncidents).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.incidentEditor).toBeUndefined());

    act(() => result.current.openIncident(7));
    await waitFor(() => expect(result.current.incidentEditor).toMatchObject({ id: 7 }));
    act(() => result.current.saveIncident({ ...incident, name: 'Updated' }));
    await waitFor(() => expect(api.loadStatusIncident).toHaveBeenCalledWith(7));
    await waitFor(() => expect(api.loadStatusIncidents).toHaveBeenCalledTimes(3));

    api.loadStatusIncident.mockRejectedValueOnce(new StatusManagementMissingError('incident'));
    act(() => result.current.deleteIncident(7));
    await waitFor(() => expect(api.deleteStatusIncident).toHaveBeenCalledWith(7));
    await waitFor(() => expect(api.loadStatusIncidents).toHaveBeenCalledTimes(4));
  });

  it('distinguishes unavailable, missing detail, and an out-of-range ready page', async () => {
    api.loadStatusComponents.mockRejectedValue(
      new ApiMessageError('Request failed with status 503', { status: 503 })
    );
    api.loadStatusIncidents.mockResolvedValue(incidentPage([], 5));
    api.loadStatusIncident.mockRejectedValue(new StatusManagementMissingError('incident'));
    const { result } = renderController('/settings/status-page?pageIndex=3&pageSize=8');

    await waitFor(() => expect(result.current.components.kind).toBe('unavailable'));
    await waitFor(() => expect(result.current.incidents).toEqual({ kind: 'ready', records: [], total: 5 }));
    act(() => result.current.openIncident(7));
    await waitFor(() => expect(result.current.incidentDetailState).toBe('missing'));
  });

  it('does not leak an authoritative incident refresh failure into a new URL query', async () => {
    api.loadStatusIncidents
      .mockResolvedValueOnce(incidentPage([incident], 1))
      .mockRejectedValueOnce(new ApiMessageError('Request failed with status 503', { status: 503 }))
      .mockResolvedValueOnce(incidentPage([], 0));
    const { result } = renderController('/settings/status-page?search=old&pageIndex=0&pageSize=8');
    await waitFor(() => expect(result.current.incidents.kind).toBe('ready'));

    act(() => result.current.openIncident(7));
    await waitFor(() => expect(result.current.incidentEditor).toMatchObject({ id: 7 }));
    act(() => result.current.saveIncident(incident));
    await waitFor(() => expect(result.current.incidents.kind).toBe('unavailable'));
    expect(result.current.incidentEditor).toMatchObject({ id: 7 });

    act(() => result.current.incidentQuery.setDraftSearch('new'));
    act(() => result.current.incidentQuery.submit());
    await waitFor(() => expect(result.current.incidents.kind).toBe('empty'));
  });
});

function renderController(entry = '/settings/status-page') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return renderHook(() => useStatusManagementController(), { wrapper });
}

function incidentPage(content: StatusIncident[], totalElements: number) {
  return { content, totalElements, totalPages: Math.ceil(totalElements / 8), number: 0, size: 8 };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}
