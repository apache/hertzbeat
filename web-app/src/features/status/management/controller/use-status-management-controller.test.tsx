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
const notification = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), warning: vi.fn() }));

vi.mock('../api/status-management-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/status-management-api')>()),
  ...api
}));
vi.mock('antd', () => ({ App: { useApp: () => ({ message: notification }) } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { useStatusManagementController } from './use-status-management-controller';

const org: StatusOrgRecord = {
  id: 1,
  name: 'HertzBeat',
  description: 'Status',
  home: '/',
  logo: '/logo.svg',
  state: 0
};
const component: StatusComponent = {
  id: 4,
  orgId: 1,
  name: 'API',
  method: 0,
  configState: 0,
  state: 0
};
const incident: StatusIncident = {
  id: 7,
  orgId: 1,
  name: 'Outage',
  state: 0,
  components: [component],
  contents: []
};

describe('useStatusManagementController', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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

  it('accepts a matching canonical organization returned by POST and clears saving', async () => {
    const canonical = { ...org, name: 'Canonical' };
    api.saveStatusOrg.mockResolvedValue(canonical);
    const view = renderController();
    const { result } = view;
    await waitFor(() => expect(result.current.org.kind).toBe('ready'));

    await act(async () => result.current.saveOrg({ ...org, name: 'Canonical' }));

    await waitFor(() => expect(result.current.org).toEqual({ kind: 'ready', record: canonical }));
    expect(notification.success).toHaveBeenCalledWith('statusManagement.saveSuccess');
    expect(result.current.orgSaving).toBe(false);
  });

  it('retains an existing organization for proof-only recovery after an ambiguous POST', async () => {
    api.saveStatusOrg.mockRejectedValue(new Error('canonical write failed'));
    const { result } = renderController();
    await waitFor(() => expect(result.current.org.kind).toBe('ready'));

    await act(async () => {
      await expect(result.current.saveOrg({ ...org, name: 'Retryable draft' })).rejects.toThrow();
    });

    expect(result.current.org).toEqual({ kind: 'ready', record: org });
    expect(result.current.orgWriteRecovery).toBe('proof');
    expect(result.current.commandLocked).toBe(true);
    expect(notification.success).not.toHaveBeenCalled();
  });

  it('rejects a stale clean organization response and completes by read-only exact proof', async () => {
    const updated = { ...org, name: 'Updated' };
    api.saveStatusOrg.mockResolvedValueOnce(org);
    api.loadStatusOrg.mockResolvedValueOnce(org).mockResolvedValueOnce(org).mockResolvedValueOnce(updated);
    const { result } = renderController();
    await waitFor(() => expect(result.current.org.kind).toBe('ready'));

    await act(async () => expect(result.current.saveOrg(updated)).rejects.toThrow());
    expect(result.current.orgWriteRecovery).toBe('proof');
    expect(notification.success).not.toHaveBeenCalled();

    await act(async () => expect(result.current.retryOrgWrite()).resolves.toEqual(updated));
    expect(api.saveStatusOrg).toHaveBeenCalledTimes(1);
    expect(result.current.orgWriteRecovery).toBeUndefined();
    expect(result.current.orgSaving).toBe(false);
    expect(result.current.org).toEqual({ kind: 'ready', record: updated });
    expect(notification.success).toHaveBeenCalledWith('statusManagement.saveSuccess');
  });

  it('locks an ambiguous organization create without exposing a second POST', async () => {
    api.loadStatusOrg.mockRejectedValueOnce(
      new ApiMessageError('Status Page Organization Not Found', { code: 15, status: 200 })
    );
    api.saveStatusOrg.mockRejectedValueOnce(new ApiMessageError('Request failed', { status: 503 }));
    const { result } = renderController();
    await waitFor(() => expect(result.current.org.kind).toBe('missing'));

    await act(async () =>
      expect(
        result.current.saveOrg({
          name: org.name,
          description: org.description,
          home: org.home,
          logo: org.logo,
          state: org.state
        })
      ).rejects.toThrow()
    );
    expect(result.current.orgWriteRecovery).toBe('commit-uncertain');
    expect(result.current.commandLocked).toBe(true);
    expect(notification.warning).toHaveBeenCalledWith('statusManagement.unknown');
    expect(notification.error).not.toHaveBeenCalledWith('statusManagement.saveFailed');
    await act(async () => expect(result.current.retryOrgWrite()).resolves.toBeUndefined());
    expect(api.saveStatusOrg).toHaveBeenCalledTimes(1);
    expect(api.loadStatusOrg).toHaveBeenCalledTimes(1);
  });

  it('keeps a failed organization proof retry retained without an unhandled rejection', async () => {
    const updated = { ...org, name: 'Updated' };
    api.saveStatusOrg.mockRejectedValueOnce(new ApiMessageError('Request failed', { status: 503 }));
    api.loadStatusOrg
      .mockResolvedValueOnce(org)
      .mockResolvedValueOnce(org)
      .mockRejectedValueOnce(new ApiMessageError('Unavailable', { status: 503 }));
    const { result } = renderController();
    await waitFor(() => expect(result.current.org.kind).toBe('ready'));

    await act(async () => expect(result.current.saveOrg(updated)).rejects.toThrow());
    await act(async () => expect(result.current.retryOrgWrite()).resolves.toBeUndefined());
    expect(result.current.orgWriteRecovery).toBe('proof');
    expect(result.current.orgSaving).toBe(false);
    expect(result.current.commandLocked).toBe(true);
    expect(notification.success).not.toHaveBeenCalled();
    expect(api.saveStatusOrg).toHaveBeenCalledTimes(1);
  });

  it('admits only one resource command in the same tick and locks editor transitions', async () => {
    const write = deferred<void>();
    api.saveStatusComponent.mockReturnValueOnce(write.promise);
    const { result } = renderController();
    await waitFor(() => expect(result.current.components.kind).toBe('ready'));
    act(() => result.current.editComponent(component));

    act(() => {
      result.current.saveComponent({ ...component, name: 'First' });
      result.current.saveComponent({ ...component, name: 'Duplicate' });
      result.current.deleteIncident(7);
      result.current.closeComponent();
      result.current.openNewIncident();
    });

    expect(api.saveStatusComponent).toHaveBeenCalledTimes(1);
    expect(api.deleteStatusIncident).not.toHaveBeenCalled();
    expect(result.current.commandLocked).toBe(true);
    expect(result.current.componentEditor).toMatchObject({ id: 4 });
    expect(result.current.incidentEditor).toBeUndefined();

    api.loadStatusComponent.mockResolvedValueOnce({ ...component, name: 'First' });
    act(() => write.resolve());
    await waitFor(() => expect(result.current.commandLocked).toBe(false));
    expect(result.current.componentEditor).toBeUndefined();
  });

  it('does not open create editors until the organization has an exact ready identity', async () => {
    const assertClosed = (view: ReturnType<typeof renderController>) => {
      act(() => {
        view.result.current.openNewComponent();
        view.result.current.openNewIncident();
      });
      expect(view.result.current.componentEditor).toBeUndefined();
      expect(view.result.current.incidentEditor).toBeUndefined();
    };
    api.loadStatusOrg.mockRejectedValueOnce(
      new ApiMessageError('Status Page Organization Not Found', { code: 15, status: 200 })
    );
    const missing = renderController();
    await waitFor(() => expect(missing.result.current.org.kind).toBe('missing'));
    assertClosed(missing);
    missing.unmount();

    api.loadStatusOrg.mockRejectedValueOnce(new Error('invalid organization'));
    const failed = renderController();
    await waitFor(() => expect(failed.result.current.org.kind).toBe('error'));
    assertClosed(failed);
    failed.unmount();

    const pendingOrg = deferred<StatusOrgRecord>();
    api.loadStatusOrg.mockReturnValueOnce(pendingOrg.promise);
    const loading = renderController();
    expect(loading.result.current.org.kind).toBe('loading');
    assertClosed(loading);
    loading.unmount();
  });

  it('retires a resource command on unmount without stale projection or notification', async () => {
    const write = deferred<void>();
    api.saveStatusComponent.mockReturnValueOnce(write.promise);
    const view = renderController();
    await waitFor(() => expect(view.result.current.components.kind).toBe('ready'));
    act(() => view.result.current.editComponent(component));
    act(() => view.result.current.saveComponent(component));
    expect(api.saveStatusComponent).toHaveBeenCalledTimes(1);

    view.unmount();
    await act(async () => {
      write.resolve();
      await write.promise;
    });

    expect(api.loadStatusComponent).not.toHaveBeenCalled();
    expect(notification.success).not.toHaveBeenCalled();
    expect(notification.error).not.toHaveBeenCalled();
  });

  it('does not complete a create after unmount while its list projection is pending', async () => {
    const projection = deferred<StatusComponent[]>();
    const draft = { ...component };
    delete draft.id;
    const view = renderController();
    await waitFor(() => expect(view.result.current.components.kind).toBe('ready'));
    api.loadStatusComponents.mockReturnValueOnce(projection.promise);
    act(() => view.result.current.openNewComponent());
    act(() => view.result.current.saveComponent(draft));
    await waitFor(() => expect(api.saveStatusComponent).toHaveBeenCalledTimes(1));

    view.unmount();
    await act(async () => {
      projection.resolve([component]);
      await projection.promise;
    });

    expect(api.saveStatusComponent).toHaveBeenCalledTimes(1);
    expect(notification.success).not.toHaveBeenCalled();
    expect(notification.error).not.toHaveBeenCalled();
  });

  it('keeps a clean component create locked until list projection settles', async () => {
    const refresh = deferred<StatusComponent[]>();
    api.loadStatusComponents.mockResolvedValueOnce([component]).mockReturnValueOnce(refresh.promise);
    const { result } = renderController();
    await waitFor(() => expect(result.current.components.kind).toBe('ready'));
    act(() => result.current.openNewComponent());

    act(() =>
      result.current.saveComponent({
        orgId: component.orgId,
        name: component.name,
        method: component.method,
        configState: component.configState,
        state: component.state
      })
    );
    await waitFor(() =>
      expect(api.saveStatusComponent).toHaveBeenCalledWith(expect.objectContaining({ name: 'API' }), true)
    );
    expect(result.current.componentEditor).toBeDefined();
    expect(result.current.commandLocked).toBe(true);
    expect(notification.success).not.toHaveBeenCalled();

    act(() => refresh.resolve([{ ...component, id: 9 }]));
    await waitFor(() =>
      expect(result.current.components).toEqual({ kind: 'ready', records: [{ ...component, id: 9 }] })
    );
    expect(result.current.componentEditor).toBeUndefined();
    expect(notification.success).toHaveBeenCalledWith('statusManagement.saveSuccess');
  });

  it('locks ambiguous creates as commit-uncertain and never repeats either POST', async () => {
    const componentDraft: StatusComponent = {
      orgId: component.orgId,
      name: component.name,
      method: component.method,
      configState: component.configState,
      state: component.state
    };
    const incidentDraft: StatusIncident = {
      orgId: incident.orgId,
      name: incident.name,
      state: incident.state,
      components: incident.components ?? [],
      contents: incident.contents ?? []
    };
    api.saveStatusComponent.mockRejectedValueOnce(
      new ApiMessageError('Request failed with status 503', { status: 503 })
    );
    api.saveStatusIncident.mockRejectedValueOnce(new ApiMessageError('Invalid API response', { status: 200 }));
    const componentView = renderController();
    const { result } = componentView;
    await waitFor(() => expect(result.current.components.kind).toBe('ready'));

    act(() => result.current.openNewComponent());
    act(() => result.current.saveComponent(componentDraft));
    await waitFor(() => expect(result.current.componentWriteRecovery).toBe('commit-uncertain'));
    expect(notification.warning).toHaveBeenCalledWith('statusManagement.unknown');
    expect(notification.error).not.toHaveBeenCalledWith('statusManagement.saveFailed');
    expect(api.saveStatusComponent).toHaveBeenCalledTimes(1);
    expect(result.current.commandLocked).toBe(true);
    act(() => {
      result.current.closeComponent();
      result.current.openNewIncident();
      result.current.saveComponent({ ...componentDraft, name: 'Different' });
      result.current.deleteIncident(7);
      void result.current.saveOrg({ ...org, name: 'Blocked' }).catch(() => undefined);
      result.current.incidentQuery.setDraftSearch('blocked');
      result.current.incidentQuery.submit();
    });
    expect(result.current.componentEditor).toBeDefined();
    expect(result.current.incidentEditor).toBeUndefined();
    expect(api.saveStatusComponent).toHaveBeenCalledTimes(1);
    expect(api.deleteStatusIncident).not.toHaveBeenCalled();
    expect(api.saveStatusOrg).not.toHaveBeenCalled();
    expect(result.current.incidentQuery.draftSearch).toBe('');
    act(() => result.current.retryComponentWrite());
    expect(api.saveStatusComponent).toHaveBeenCalledTimes(1);
    expect(result.current.componentEditor).toBeDefined();
    expect(result.current.commandLocked).toBe(true);

    componentView.unmount();
    const incidentView = renderController();
    await waitFor(() => expect(incidentView.result.current.incidents.kind).toBe('ready'));

    act(() => incidentView.result.current.openNewIncident());
    act(() => incidentView.result.current.saveIncident(incidentDraft));
    await waitFor(() => expect(incidentView.result.current.incidentWriteRecovery).toBe('commit-uncertain'));
    expect(notification.warning).toHaveBeenCalledWith('statusManagement.unknown');
    expect(notification.error).not.toHaveBeenCalledWith('statusManagement.saveFailed');
    expect(api.saveStatusIncident).toHaveBeenCalledTimes(1);
    act(() => incidentView.result.current.retryIncidentWrite());
    expect(incidentView.result.current.incidentEditor).toBeDefined();
    expect(api.deleteStatusComponent).not.toHaveBeenCalled();
    expect(api.saveStatusIncident).toHaveBeenCalledTimes(1);
    expect(incidentView.result.current.commandLocked).toBe(true);
  });

  it('keeps a definite application rejection retryable as a new create', async () => {
    const draft: StatusComponent = {
      orgId: component.orgId,
      name: component.name,
      method: component.method,
      configState: component.configState,
      state: component.state
    };
    api.saveStatusComponent
      .mockRejectedValueOnce(new ApiMessageError('Validation rejected', { code: 12, status: 200 }))
      .mockResolvedValueOnce(undefined);
    const { result } = renderController();
    await waitFor(() => expect(result.current.components.kind).toBe('ready'));
    act(() => result.current.openNewComponent());

    act(() => result.current.saveComponent(draft));
    await waitFor(() => expect(notification.error).toHaveBeenCalledWith('statusManagement.saveFailed'));
    expect(result.current.componentWriteRecovery).toBeUndefined();
    expect(result.current.componentEditor).toBeDefined();
    act(() => result.current.saveComponent(draft));
    await waitFor(() => expect(api.saveStatusComponent).toHaveBeenCalledTimes(2));
  });

  it('requires exact component detail reread plus list refresh for update and missing proof for delete', async () => {
    const updated = { ...component, name: 'Updated' };
    api.loadStatusComponent.mockResolvedValueOnce(updated);
    const { result } = renderController();
    await waitFor(() => expect(result.current.components.kind).toBe('ready'));
    act(() => result.current.editComponent(component));
    act(() => result.current.saveComponent(updated));

    await waitFor(() => expect(api.loadStatusComponent).toHaveBeenCalledWith(4));
    expect(api.loadStatusComponents).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.componentEditor).toBeUndefined());

    api.loadStatusComponent.mockRejectedValueOnce(new StatusManagementMissingError('component'));
    api.loadStatusComponents.mockResolvedValueOnce([]);
    act(() => result.current.deleteComponent(4));
    await waitFor(() => expect(api.deleteStatusComponent).toHaveBeenCalledWith(4));
    await waitFor(() => expect(api.loadStatusComponents).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(notification.success).toHaveBeenCalledWith('statusManagement.deleteSuccess'));
  });

  it('retains a clean component save for proof-only Retry when list projection is unavailable', async () => {
    const updated = { ...component, name: 'Updated' };
    api.loadStatusComponent.mockResolvedValueOnce(updated).mockResolvedValueOnce(updated);
    api.loadStatusComponents
      .mockResolvedValueOnce([component])
      .mockRejectedValueOnce(new ApiMessageError('Request failed with status 503', { status: 503 }));
    const { result } = renderController();
    await waitFor(() => expect(result.current.components.kind).toBe('ready'));
    act(() => result.current.editComponent(component));
    act(() => result.current.saveComponent(updated));

    await waitFor(() => expect(result.current.components.kind).toBe('unavailable'));
    expect(result.current.componentEditor).toBeDefined();
    expect(result.current.componentWriteRecovery).toBe('proof');
    expect(notification.success).not.toHaveBeenCalled();
    expect(notification.error).not.toHaveBeenCalledWith('statusManagement.saveFailed');

    api.loadStatusComponents.mockResolvedValueOnce([component]);
    act(() => result.current.retryComponentWrite());
    await waitFor(() => expect(result.current.componentEditor).toBeUndefined());
    expect(notification.success).toHaveBeenCalledWith('statusManagement.saveSuccess');
    await waitFor(() => expect(result.current.components).toEqual({ kind: 'ready', records: [component] }));
  });

  it('returns honest component refresh outcomes and hides stale records after failure', async () => {
    api.loadStatusComponents
      .mockResolvedValueOnce([component])
      .mockRejectedValueOnce(new ApiMessageError('Request failed with status 503', { status: 503 }))
      .mockResolvedValueOnce([{ ...component, name: 'Recovered' }]);
    const { result } = renderController();
    await waitFor(() => expect(result.current.components.kind).toBe('ready'));

    let failed: boolean | undefined;
    await act(async () => {
      failed = await result.current.refreshComponents();
    });
    expect(failed).toBe(false);
    await waitFor(() => expect(result.current.components).toEqual({ kind: 'unavailable' }));

    let recovered: boolean | undefined;
    await act(async () => {
      recovered = await result.current.refreshComponents();
    });
    expect(recovered).toBe(true);
    await waitFor(() =>
      expect(result.current.components).toEqual({
        kind: 'ready',
        records: [{ ...component, name: 'Recovered' }]
      })
    );
  });

  it('retains editors when post-commit detail does not match the exact write', async () => {
    const view = renderController();
    const { result } = view;
    await waitFor(() => expect(result.current.components.kind).toBe('ready'));

    api.loadStatusComponent.mockResolvedValueOnce({ ...component, id: 99 });
    act(() => result.current.editComponent(component));
    act(() => result.current.saveComponent({ ...component, name: 'Updated' }));
    await waitFor(() => expect(result.current.components.kind).toBe('error'));
    expect(result.current.componentEditor).toBeDefined();
    expect(result.current.componentWriteRecovery).toBe('proof');
    expect(api.loadStatusComponents).toHaveBeenCalledTimes(1);
    expect(notification.success).not.toHaveBeenCalled();
    expect(notification.error).not.toHaveBeenCalledWith('statusManagement.saveFailed');

    view.unmount();
    const incidentView = renderController();
    await waitFor(() => expect(incidentView.result.current.incidents.kind).toBe('ready'));
    act(() => incidentView.result.current.openIncident(7));
    await waitFor(() => expect(incidentView.result.current.incidentEditor).toMatchObject({ id: 7 }));
    api.loadStatusIncident.mockResolvedValueOnce({ ...incident, id: 88 });
    act(() => incidentView.result.current.saveIncident({ ...incident, name: 'Updated' }));
    await waitFor(() => expect(incidentView.result.current.incidents.kind).toBe('error'));
    expect(incidentView.result.current.incidentEditor).toBeDefined();
    expect(incidentView.result.current.incidentWriteRecovery).toBe('proof');
    expect(api.loadStatusIncidents).toHaveBeenCalledTimes(2);
    expect(notification.success).not.toHaveBeenCalled();
    expect(notification.error).not.toHaveBeenCalledWith('statusManagement.saveFailed');
  });

  it('requires the exact writable payload, not only the id, before accepting update projection', async () => {
    const updatedComponent = { ...component, name: 'Updated component' };
    const updatedIncident = { ...incident, name: 'Updated incident' };
    const componentView = renderController();
    const { result } = componentView;
    await waitFor(() => expect(result.current.components.kind).toBe('ready'));

    api.loadStatusComponent.mockResolvedValueOnce({ ...component, name: 'Stale component' });
    act(() => result.current.editComponent(component));
    act(() => result.current.saveComponent(updatedComponent));
    await waitFor(() => expect(result.current.components.kind).toBe('error'));
    expect(api.loadStatusComponents).toHaveBeenCalledTimes(1);
    expect(result.current.componentWriteRecovery).toBe('proof');

    componentView.unmount();
    const incidentView = renderController();
    await waitFor(() => expect(incidentView.result.current.incidents.kind).toBe('ready'));
    act(() => incidentView.result.current.openIncident(7));
    await waitFor(() => expect(incidentView.result.current.incidentEditor).toMatchObject({ id: 7 }));
    api.loadStatusIncident.mockResolvedValueOnce({ ...incident, name: 'Stale incident' });
    act(() => incidentView.result.current.saveIncident(updatedIncident));
    await waitFor(() => expect(incidentView.result.current.incidents.kind).toBe('error'));
    expect(incidentView.result.current.incidentWriteRecovery).toBe('proof');
  });

  it('recovers ambiguous updates with exact proof and never repeats the PUT', async () => {
    const updated = { ...component, name: 'Updated' };
    api.saveStatusComponent.mockRejectedValueOnce(new ApiMessageError('Request failed', { status: 503 }));
    api.loadStatusComponent.mockResolvedValueOnce(component).mockResolvedValueOnce(updated);
    api.loadStatusComponents.mockResolvedValueOnce([component]).mockResolvedValueOnce([updated]);
    const { result } = renderController();
    await waitFor(() => expect(result.current.components.kind).toBe('ready'));
    act(() => result.current.editComponent(component));

    act(() => result.current.saveComponent(updated));
    await waitFor(() => expect(result.current.componentWriteRecovery).toBe('proof'));
    expect(result.current.componentEditor).toMatchObject({ id: 4 });
    expect(api.saveStatusComponent).toHaveBeenCalledTimes(1);

    act(() => result.current.retryComponentWrite());
    await waitFor(() => expect(result.current.componentEditor).toBeUndefined());
    expect(result.current.componentWriteRecovery).toBeUndefined();
    expect(result.current.commandLocked).toBe(false);
    expect(api.saveStatusComponent).toHaveBeenCalledTimes(1);
    expect(notification.success).toHaveBeenCalledWith('statusManagement.saveSuccess');
  });

  it('applies the same exact-proof update recovery to incidents', async () => {
    const updated = { ...incident, name: 'Updated' };
    const { result } = renderController();
    await waitFor(() => expect(result.current.incidents.kind).toBe('ready'));
    act(() => result.current.openIncident(7));
    await waitFor(() => expect(result.current.incidentEditor).toMatchObject({ id: 7 }));
    api.saveStatusIncident.mockRejectedValueOnce(new ApiMessageError('Request failed', { status: 503 }));
    api.loadStatusIncident.mockResolvedValueOnce(incident).mockResolvedValueOnce(updated);

    act(() => result.current.saveIncident(updated));
    await waitFor(() => expect(result.current.incidentWriteRecovery).toBe('proof'));
    expect(api.saveStatusIncident).toHaveBeenCalledTimes(1);

    act(() => result.current.retryIncidentWrite());
    await waitFor(() => expect(result.current.incidentEditor).toBeUndefined());
    expect(result.current.incidentWriteRecovery).toBeUndefined();
    expect(result.current.commandLocked).toBe(false);
    expect(api.saveStatusIncident).toHaveBeenCalledTimes(1);
  });

  it('unlocks definite write rejections so the operator can issue a corrected mutation', async () => {
    const updated = { ...component, name: 'Corrected' };
    api.saveStatusComponent
      .mockRejectedValueOnce(new ApiMessageError('Rejected', { status: 400 }))
      .mockResolvedValueOnce(undefined);
    const { result } = renderController();
    await waitFor(() => expect(result.current.components.kind).toBe('ready'));
    act(() => result.current.editComponent(component));

    act(() => result.current.saveComponent(updated));
    await waitFor(() => expect(notification.error).toHaveBeenCalledWith('statusManagement.saveFailed'));
    expect(result.current.commandLocked).toBe(false);
    expect(result.current.componentWriteRecovery).toBeUndefined();
    expect(result.current.componentEditor).toMatchObject({ id: 4 });

    api.loadStatusComponent.mockResolvedValueOnce(updated);
    api.loadStatusComponents.mockResolvedValueOnce([updated]);
    act(() => result.current.saveComponent(updated));
    await waitFor(() => expect(result.current.componentEditor).toBeUndefined());
    expect(api.saveStatusComponent).toHaveBeenCalledTimes(2);

    api.deleteStatusIncident
      .mockRejectedValueOnce(new ApiMessageError('Rejected', { status: 400 }))
      .mockResolvedValueOnce(undefined);
    act(() => result.current.deleteIncident(7));
    await waitFor(() => expect(notification.error).toHaveBeenCalledWith('statusManagement.deleteFailed'));
    expect(result.current.commandLocked).toBe(false);
    expect(result.current.incidentDeleteRecovery).toBe(false);

    api.loadStatusIncident.mockRejectedValueOnce(new StatusManagementMissingError('incident'));
    api.loadStatusIncidents.mockResolvedValueOnce(incidentPage([], 0));
    act(() => result.current.deleteIncident(7));
    await waitFor(() => expect(api.deleteStatusIncident).toHaveBeenCalledTimes(2));
  });

  it('keeps confirmed deletes complete and deduplicated when projection still shows the record', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.components.kind).toBe('ready'));

    act(() => result.current.deleteComponent(4));
    await waitFor(() => expect(result.current.components.kind).toBe('error'));
    expect(api.loadStatusComponents).toHaveBeenCalledTimes(1);
    expect(notification.success).not.toHaveBeenCalledWith('statusManagement.deleteSuccess');
    expect(notification.error).not.toHaveBeenCalledWith('statusManagement.deleteFailed');
    act(() => result.current.deleteComponent(4));
    expect(api.deleteStatusComponent).toHaveBeenCalledTimes(1);
    expect(result.current.componentDeleteRecovery).toBe(true);
    expect(result.current.commandLocked).toBe(true);

    api.loadStatusComponents.mockResolvedValueOnce([]);
    await act(async () => expect(result.current.refreshComponents()).resolves.toBe(false));
    expect(result.current.componentDeleteRecovery).toBe(true);
    expect(result.current.commandLocked).toBe(true);
    expect(api.loadStatusComponents).toHaveBeenCalledTimes(1);

    api.loadStatusComponent.mockRejectedValueOnce(new StatusManagementMissingError('component'));
    api.loadStatusComponents.mockResolvedValueOnce([]);
    await act(async () => expect(result.current.refreshComponents()).resolves.toBe(true));
    expect(result.current.componentDeleteRecovery).toBe(false);
    expect(result.current.commandLocked).toBe(false);
    expect(notification.success).toHaveBeenCalledWith('statusManagement.deleteSuccess');

    notification.success.mockClear();
    act(() => result.current.deleteIncident(7));
    await waitFor(() => expect(result.current.incidents.kind).toBe('error'));
    expect(api.loadStatusIncidents).toHaveBeenCalledTimes(1);
    expect(notification.success).not.toHaveBeenCalledWith('statusManagement.deleteSuccess');
    expect(notification.error).not.toHaveBeenCalledWith('statusManagement.deleteFailed');
    act(() => result.current.deleteIncident(7));
    expect(api.deleteStatusIncident).toHaveBeenCalledTimes(1);
    expect(result.current.incidentDeleteRecovery).toBe(true);
    api.loadStatusIncidents.mockResolvedValueOnce(incidentPage([], 0));
    await act(async () => expect(result.current.refreshIncidents()).resolves.toBe(false));
    expect(result.current.incidentDeleteRecovery).toBe(true);
    expect(api.loadStatusIncidents).toHaveBeenCalledTimes(1);

    api.loadStatusIncident.mockRejectedValueOnce(new StatusManagementMissingError('incident'));
    api.loadStatusIncidents.mockResolvedValueOnce(incidentPage([], 0));
    await act(async () => expect(result.current.refreshIncidents()).resolves.toBe(true));
    expect(result.current.incidentDeleteRecovery).toBe(false);
    expect(result.current.commandLocked).toBe(false);
    expect(notification.success).toHaveBeenCalledWith('statusManagement.deleteSuccess');
  });

  it('recovers an ambiguous delete by exact missing proof and never repeats DELETE', async () => {
    api.deleteStatusIncident.mockRejectedValueOnce(new ApiMessageError('Invalid response', { status: 200 }));
    api.loadStatusIncident
      .mockResolvedValueOnce(incident)
      .mockRejectedValueOnce(new StatusManagementMissingError('incident'));
    api.loadStatusIncidents
      .mockResolvedValueOnce(incidentPage([incident], 1))
      .mockResolvedValueOnce(incidentPage([], 0));
    const { result } = renderController();
    await waitFor(() => expect(result.current.incidents.kind).toBe('ready'));

    act(() => result.current.deleteIncident(7));
    await waitFor(() => expect(result.current.incidentDeleteRecovery).toBe(true));
    expect(result.current.commandLocked).toBe(true);
    expect(api.deleteStatusIncident).toHaveBeenCalledTimes(1);
    expect(notification.error).not.toHaveBeenCalledWith('statusManagement.deleteFailed');

    await act(async () => expect(result.current.refreshIncidents()).resolves.toBe(true));
    expect(api.deleteStatusIncident).toHaveBeenCalledTimes(1);
    expect(result.current.incidentDeleteRecovery).toBe(false);
    expect(result.current.commandLocked).toBe(false);
    expect(notification.success).toHaveBeenCalledWith('statusManagement.deleteSuccess');
  });

  it('applies the same exact-missing delete recovery to components', async () => {
    api.deleteStatusComponent.mockRejectedValueOnce(new ApiMessageError('Request failed', { status: 503 }));
    api.loadStatusComponent
      .mockResolvedValueOnce(component)
      .mockRejectedValueOnce(new StatusManagementMissingError('component'));
    api.loadStatusComponents.mockResolvedValueOnce([component]).mockResolvedValueOnce([]);
    const { result } = renderController();
    await waitFor(() => expect(result.current.components.kind).toBe('ready'));

    act(() => result.current.deleteComponent(4));
    await waitFor(() => expect(result.current.componentDeleteRecovery).toBe(true));
    expect(api.deleteStatusComponent).toHaveBeenCalledTimes(1);

    await act(async () => expect(result.current.refreshComponents()).resolves.toBe(true));
    expect(result.current.componentDeleteRecovery).toBe(false);
    expect(result.current.commandLocked).toBe(false);
    expect(api.deleteStatusComponent).toHaveBeenCalledTimes(1);
  });

  it('admits one clean-create projection Retry in the same tick and suppresses completion after unmount', async () => {
    const draft: StatusComponent = { ...component };
    delete draft.id;
    const pendingProof = deferred<StatusComponent[]>();
    api.loadStatusComponents
      .mockResolvedValueOnce([component])
      .mockRejectedValueOnce(new ApiMessageError('Projection unavailable', { status: 503 }))
      .mockReturnValueOnce(pendingProof.promise);
    const view = renderController();
    await waitFor(() => expect(view.result.current.components.kind).toBe('ready'));
    act(() => view.result.current.openNewComponent());
    act(() => view.result.current.saveComponent(draft));
    await waitFor(() => expect(view.result.current.componentWriteRecovery).toBe('proof'));
    notification.success.mockClear();

    act(() => {
      view.result.current.retryComponentWrite();
      view.result.current.retryComponentWrite();
    });
    await waitFor(() => expect(api.loadStatusComponents).toHaveBeenCalledTimes(3));
    view.unmount();
    await act(async () => {
      pendingProof.resolve([component, { ...draft, id: 9 }]);
      await pendingProof.promise;
    });
    expect(notification.success).not.toHaveBeenCalled();
  });

  it('admits only one delete-recovery Refresh proof in the same tick', async () => {
    const detailProof = deferred<StatusComponent>();
    const { result } = renderController();
    await waitFor(() => expect(result.current.components.kind).toBe('ready'));
    act(() => result.current.deleteComponent(4));
    await waitFor(() => expect(result.current.componentDeleteRecovery).toBe(true));
    api.loadStatusComponent.mockReturnValueOnce(detailProof.promise);

    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = result.current.refreshComponents();
      second = result.current.refreshComponents();
    });
    await expect(second).resolves.toBe(false);
    await waitFor(() => expect(api.loadStatusComponent).toHaveBeenCalledTimes(2));

    detailProof.reject(new Error('proof unavailable'));
    await expect(first).resolves.toBe(false);
    expect(api.loadStatusComponent).toHaveBeenCalledTimes(2);
    expect(result.current.componentDeleteRecovery).toBe(true);
    expect(result.current.commandLocked).toBe(true);
  });

  it('proves incident create, update, and delete through authoritative query evidence', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.incidents.kind).toBe('ready'));

    act(() => result.current.openNewIncident());
    act(() =>
      result.current.saveIncident({
        orgId: incident.orgId,
        name: incident.name,
        state: incident.state,
        components: incident.components ?? [],
        contents: incident.contents ?? []
      })
    );
    await waitFor(() => expect(api.loadStatusIncidents).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.incidentEditor).toBeUndefined());

    act(() => result.current.openIncident(7));
    await waitFor(() => expect(result.current.incidentEditor).toMatchObject({ id: 7 }));
    const updated = { ...incident, name: 'Updated' };
    api.loadStatusIncident.mockResolvedValueOnce(updated);
    act(() => result.current.saveIncident(updated));
    await waitFor(() => expect(api.loadStatusIncident).toHaveBeenCalledWith(7));
    await waitFor(() => expect(api.loadStatusIncidents).toHaveBeenCalledTimes(3));

    api.loadStatusIncident.mockRejectedValueOnce(new StatusManagementMissingError('incident'));
    act(() => result.current.deleteIncident(7));
    await waitFor(() => expect(api.deleteStatusIncident).toHaveBeenCalledWith(7));
    await waitFor(() => expect(api.loadStatusIncidents).toHaveBeenCalledTimes(4));
  });

  it('distinguishes unavailable, missing detail, and an out-of-range ready page', async () => {
    api.loadStatusComponents.mockRejectedValue(new ApiMessageError('Request failed with status 503', { status: 503 }));
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
      .mockResolvedValueOnce(incidentPage([incident], 1))
      .mockResolvedValueOnce(incidentPage([], 0));
    const { result } = renderController('/settings/status-page?search=old&pageIndex=0&pageSize=8');
    await waitFor(() => expect(result.current.incidents.kind).toBe('ready'));

    act(() => result.current.openIncident(7));
    await waitFor(() => expect(result.current.incidentEditor).toMatchObject({ id: 7 }));
    act(() => result.current.saveIncident(incident));
    await waitFor(() => expect(result.current.incidents.kind).toBe('unavailable'));
    expect(result.current.incidentEditor).toBeDefined();
    expect(result.current.incidentWriteRecovery).toBe('proof');
    expect(notification.success).not.toHaveBeenCalled();
    expect(notification.error).not.toHaveBeenCalledWith('statusManagement.saveFailed');

    act(() => result.current.retryIncidentWrite());
    await waitFor(() => expect(result.current.incidentEditor).toBeUndefined());
    act(() => result.current.incidentQuery.setDraftSearch('new'));
    act(() => result.current.incidentQuery.submit());
    await waitFor(() => expect(result.current.incidents.kind).toBe('empty'));
  });

  it('returns honest incident refresh outcomes and recovers with current-query evidence', async () => {
    api.loadStatusIncidents
      .mockResolvedValueOnce(incidentPage([incident], 1))
      .mockRejectedValueOnce(new ApiMessageError('Request failed with status 503', { status: 503 }))
      .mockResolvedValueOnce(incidentPage([], 0));
    const { result } = renderController('/settings/status-page?search=current&pageIndex=0&pageSize=8');
    await waitFor(() => expect(result.current.incidents.kind).toBe('ready'));

    let failed: boolean | undefined;
    await act(async () => {
      failed = await result.current.refreshIncidents();
    });
    expect(failed).toBe(false);
    await waitFor(() => expect(result.current.incidents).toEqual({ kind: 'unavailable' }));

    let recovered: boolean | undefined;
    await act(async () => {
      recovered = await result.current.refreshIncidents();
    });
    expect(recovered).toBe(true);
    await waitFor(() => expect(result.current.incidents).toEqual({ kind: 'empty' }));
    expect(api.loadStatusIncidents).toHaveBeenLastCalledWith({
      search: 'current',
      pageIndex: 0,
      pageSize: 8
    });
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
