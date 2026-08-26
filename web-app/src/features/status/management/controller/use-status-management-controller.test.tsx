/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StatusComponent, StatusOrgRecord } from '../model/status-management-contract';
import { statusManagementQueryKeys } from './status-management-query-keys';

import {
  access,
  api,
  component,
  componentWithoutId,
  deferred,
  incident,
  incidentPage,
  notification,
  org,
  projection,
  renderController,
  resetStatusManagementControllerFixture,
  unavailableRequestFailure
} from './use-status-management-controller-test-support';

describe('useStatusManagementController authority and retirement', () => {
  beforeEach(resetStatusManagementControllerFixture);

  it('keeps GUEST reads active but rejects every create, update, incident-write, and delete admission', async () => {
    access.roles = ['GUEST'];
    const { result } = renderController();
    await waitFor(() => expect(result.current.components.kind).toBe('ready'));

    act(() => {
      result.current.openNewComponent();
      result.current.editComponent(component);
      result.current.openNewIncident();
      result.current.openIncident(incident.id!);
      result.current.saveComponent(component);
      result.current.saveIncident(incident);
      result.current.deleteComponent(component.id!);
      result.current.deleteIncident(incident.id!);
    });
    await expect(result.current.saveOrg(org)).rejects.toMatchObject({ kind: 'permission', writeOutcome: 'rejected' });

    expect(result.current.capabilities).toEqual({
      canRead: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false
    });
    expect(result.current.componentEditor).toBeUndefined();
    expect(result.current.incidentEditor).toBeUndefined();
    expect(api.saveStatusOrg).not.toHaveBeenCalled();
    expect(api.saveStatusComponent).not.toHaveBeenCalled();
    expect(api.saveStatusIncident).not.toHaveBeenCalled();
    expect(api.deleteStatusComponent).not.toHaveBeenCalled();
    expect(api.deleteStatusIncident).not.toHaveBeenCalled();
    expect(api.loadStatusOrg).toHaveBeenCalled();
    expect(api.loadStatusComponents).toHaveBeenCalled();
    expect(api.loadStatusIncidents).toHaveBeenCalled();
  });

  it.each(['create', 'update'] as const)(
    'retires an in-flight USER component %s after downgrade without proof or publication',
    async kind => {
      access.roles = ['USER'];
      const write = deferred<void>();
      api.saveStatusComponent.mockReturnValueOnce(write.promise);
      const view = renderController();
      await waitFor(() => expect(view.result.current.components.kind).toBe('ready'));
      act(() => {
        if (kind === 'create') view.result.current.openNewComponent();
        else view.result.current.editComponent(component);
      });
      const value =
        kind === 'create' ? { ...componentWithoutId(component), name: 'Created' } : { ...component, name: 'Updated' };
      act(() => view.result.current.saveComponent(value));
      await waitFor(() => expect(api.saveStatusComponent).toHaveBeenCalledOnce());

      access.roles = ['GUEST'];
      view.rerender();
      act(() => write.reject(unavailableRequestFailure()));

      await waitFor(() => expect(view.result.current.commandLocked).toBe(false));
      expect(api.loadStatusComponent).not.toHaveBeenCalled();
      expect(api.loadStatusComponents).toHaveBeenCalledOnce();
      expect(view.client.getQueryData(statusManagementQueryKeys.components())).toEqual([component]);
      expect(view.result.current.componentEditor).toBeUndefined();
      expect(view.result.current.componentWriteRecovery).toBeUndefined();
      expect(view.result.current.componentSaving).toBe(false);
      expect(notification.success).not.toHaveBeenCalled();
      expect(notification.error).not.toHaveBeenCalled();
      expect(notification.warning).not.toHaveBeenCalled();
    }
  );

  it.each(['component', 'incident'] as const)(
    'retires an in-flight ADMIN %s delete after downgrade to USER',
    async kind => {
      const removal = deferred<void>();
      if (kind === 'component') api.deleteStatusComponent.mockReturnValueOnce(removal.promise);
      else api.deleteStatusIncident.mockReturnValueOnce(removal.promise);
      const view = renderController();
      await waitFor(() => expect(view.result.current.components.kind).toBe('ready'));

      act(() => {
        if (kind === 'component') view.result.current.deleteComponent(component.id!);
        else view.result.current.deleteIncident(incident.id!);
      });
      await waitFor(() =>
        expect(kind === 'component' ? api.deleteStatusComponent : api.deleteStatusIncident).toHaveBeenCalledOnce()
      );
      access.roles = ['USER'];
      view.rerender();
      act(() => removal.resolve());

      await waitFor(() => expect(view.result.current.commandLocked).toBe(false));
      expect(api.loadStatusComponent).not.toHaveBeenCalled();
      expect(api.loadStatusIncident).not.toHaveBeenCalled();
      expect(api.loadStatusComponents).toHaveBeenCalledOnce();
      expect(api.loadStatusIncidents).toHaveBeenCalledOnce();
      expect(view.result.current.componentDeleteRecovery).toBe(false);
      expect(view.result.current.incidentDeleteRecovery).toBe(false);
      expect(notification.success).not.toHaveBeenCalled();
      expect(notification.error).not.toHaveBeenCalled();
    }
  );

  it('clears retained write and delete recovery when their capabilities are lost', async () => {
    api.saveStatusComponent.mockRejectedValueOnce(unavailableRequestFailure());
    api.loadStatusComponent.mockRejectedValueOnce(unavailableRequestFailure());
    const writeView = renderController();
    await waitFor(() => expect(writeView.result.current.components.kind).toBe('ready'));
    act(() => writeView.result.current.editComponent(component));
    act(() => writeView.result.current.saveComponent({ ...component, name: 'Needs proof' }));
    await waitFor(() => expect(writeView.result.current.componentWriteRecovery).toBe('proof'));

    access.roles = ['GUEST'];
    writeView.rerender();
    expect(writeView.result.current.componentWriteRecovery).toBeUndefined();
    expect(writeView.result.current.commandLocked).toBe(false);
    writeView.unmount();

    access.roles = ['ADMIN'];
    api.loadStatusComponent.mockRejectedValueOnce(unavailableRequestFailure());
    const deleteView = renderController();
    await waitFor(() => expect(deleteView.result.current.components.kind).toBe('ready'));
    act(() => deleteView.result.current.deleteComponent(component.id!));
    await waitFor(() => expect(deleteView.result.current.componentDeleteRecovery).toBe(true));

    access.roles = ['USER'];
    deleteView.rerender();
    expect(deleteView.result.current.componentDeleteRecovery).toBe(false);
    expect(deleteView.result.current.componentDeleteRecoveryPending).toBe(false);
    expect(deleteView.result.current.commandLocked).toBe(false);
  });

  it('keeps an in-flight write current when ADMIN loses delete but retains update', async () => {
    const write = deferred<void>();
    api.saveStatusComponent.mockReturnValueOnce(write.promise);
    const view = renderController();
    await waitFor(() => expect(view.result.current.components.kind).toBe('ready'));
    act(() => view.result.current.editComponent(component));
    act(() => view.result.current.saveComponent(component));
    await waitFor(() => expect(api.saveStatusComponent).toHaveBeenCalledOnce());

    access.roles = ['USER'];
    view.rerender();
    act(() => write.resolve());

    await waitFor(() => expect(view.result.current.commandLocked).toBe(false));
    expect(api.loadStatusComponent).toHaveBeenCalledOnce();
    expect(notification.success).toHaveBeenCalledWith('statusManagement.saveSuccess');
  });

  it.each(['component', 'incident'] as const)(
    'keeps one %s write proof owner across ADMIN to USER delete retirement',
    async kind => {
      const updatedComponent = { ...component, name: 'Proof update' };
      const updatedIncident = { ...incident, name: 'Proof update' };
      if (kind === 'component') {
        api.saveStatusComponent.mockRejectedValueOnce(unavailableRequestFailure());
        api.loadStatusComponent.mockRejectedValueOnce(unavailableRequestFailure());
      } else {
        api.saveStatusIncident.mockRejectedValueOnce(unavailableRequestFailure());
        api.loadStatusIncident.mockResolvedValueOnce(incident).mockRejectedValueOnce(unavailableRequestFailure());
      }
      const view = renderController();
      await waitFor(() => expect(view.result.current.components.kind).toBe('ready'));
      act(() => {
        if (kind === 'component') view.result.current.editComponent(component);
        else view.result.current.openIncident(incident.id!);
      });
      if (kind === 'incident') {
        await waitFor(() => expect(view.result.current.incidentEditor).toMatchObject({ id: incident.id }));
      }
      act(() => {
        if (kind === 'component') view.result.current.saveComponent(updatedComponent);
        else view.result.current.saveIncident(updatedIncident);
      });
      await waitFor(() =>
        expect(
          kind === 'component' ? view.result.current.componentWriteRecovery : view.result.current.incidentWriteRecovery
        ).toBe('proof')
      );

      const componentProjection = deferred<StatusComponent[]>();
      const incidentProjection = deferred<ReturnType<typeof incidentPage>>();
      if (kind === 'component') {
        api.loadStatusComponent.mockResolvedValueOnce(updatedComponent);
        api.loadStatusComponents.mockReturnValueOnce(componentProjection.promise);
        act(() => view.result.current.retryComponentWrite());
        await waitFor(() => expect(projection.componentUpdate).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(api.loadStatusComponents).toHaveBeenCalledTimes(2));
      } else {
        api.loadStatusIncident.mockResolvedValueOnce(updatedIncident);
        api.loadStatusIncidents.mockReturnValueOnce(incidentProjection.promise);
        act(() => view.result.current.retryIncidentWrite());
        await waitFor(() => expect(projection.incidentUpdate).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(api.loadStatusIncidents).toHaveBeenCalledTimes(2));
      }

      access.roles = ['USER'];
      view.rerender();
      act(() => {
        if (kind === 'component') view.result.current.retryComponentWrite();
        else view.result.current.retryIncidentWrite();
      });
      expect(kind === 'component' ? projection.componentUpdate : projection.incidentUpdate).toHaveBeenCalledTimes(2);

      act(() => {
        if (kind === 'component') componentProjection.resolve([updatedComponent]);
        else incidentProjection.resolve(incidentPage([updatedIncident], 1));
      });
      await waitFor(() => expect(view.result.current.commandLocked).toBe(false));
      expect(notification.success).toHaveBeenCalledOnce();
      expect(notification.success).toHaveBeenCalledWith('statusManagement.saveSuccess');
      expect(
        kind === 'component' ? view.result.current.componentWriteRecovery : view.result.current.incidentWriteRecovery
      ).toBeUndefined();
    }
  );

  it('retires and removes all reads synchronously when canRead is lost', async () => {
    const orgRead = deferred<StatusOrgRecord>();
    const componentRead = deferred<StatusComponent[]>();
    const incidentRead = deferred<ReturnType<typeof incidentPage>>();
    let orgSignal: AbortSignal | undefined;
    let componentSignal: AbortSignal | undefined;
    let incidentSignal: AbortSignal | undefined;
    api.loadStatusOrg.mockImplementationOnce((signal: AbortSignal) => {
      orgSignal = signal;
      return orgRead.promise;
    });
    api.loadStatusComponents.mockImplementationOnce((signal: AbortSignal) => {
      componentSignal = signal;
      return componentRead.promise;
    });
    api.loadStatusIncidents.mockImplementationOnce((_query, signal: AbortSignal) => {
      incidentSignal = signal;
      return incidentRead.promise;
    });
    const view = renderController();
    await waitFor(() => expect(api.loadStatusIncidents).toHaveBeenCalledOnce());
    const retainedComponentRefresh = view.result.current.refreshComponents;
    const retainedIncidentRefresh = view.result.current.refreshIncidents;

    access.roles = [];
    view.rerender();

    expect(view.result.current.org.kind).toBe('permission');
    expect(view.result.current.components.kind).toBe('permission');
    expect(view.result.current.incidents.kind).toBe('permission');
    expect(orgSignal?.aborted).toBe(true);
    expect(componentSignal?.aborted).toBe(true);
    expect(incidentSignal?.aborted).toBe(true);
    expect(view.client.getQueryData(statusManagementQueryKeys.org())).toBeUndefined();
    expect(view.client.getQueryData(statusManagementQueryKeys.components())).toBeUndefined();
    expect(
      view.client.getQueryData(statusManagementQueryKeys.incidents({ search: '', pageIndex: 0, pageSize: 8 }))
    ).toBeUndefined();

    vi.clearAllMocks();
    await expect(view.result.current.refreshComponents()).resolves.toBe(false);
    await expect(view.result.current.refreshIncidents()).resolves.toBe(false);
    await expect(retainedComponentRefresh()).resolves.toBe(false);
    await expect(retainedIncidentRefresh()).resolves.toBe(false);
    expect(api.loadStatusComponents).not.toHaveBeenCalled();
    expect(api.loadStatusIncidents).not.toHaveBeenCalled();
  });

  it('allows USER writes but rejects administrator-only deletes before transport', async () => {
    access.roles = ['USER'];
    const { result } = renderController();
    await waitFor(() => expect(result.current.components.kind).toBe('ready'));

    act(() => {
      result.current.editComponent(component);
      result.current.deleteComponent(component.id!);
      result.current.deleteIncident(incident.id!);
    });
    act(() => result.current.saveComponent({ ...component, name: 'User update' }));

    await waitFor(() => expect(api.saveStatusComponent).toHaveBeenCalledOnce());
    expect(api.deleteStatusComponent).not.toHaveBeenCalled();
    expect(api.deleteStatusIncident).not.toHaveBeenCalled();
  });
});
