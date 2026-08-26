/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { StatusOrgNotFoundError } from '@/features/status/shared/status-error-model';

import type { StatusComponent, StatusIncident, StatusOrgRecord } from '../model/status-management-contract';

import {
  api,
  component,
  deferred,
  incident,
  notification,
  org,
  rejectedRequestFailure,
  renderController,
  resetStatusManagementControllerFixture,
  unavailableRequestFailure,
  uncertainRequestFailure
} from './use-status-management-controller-test-support';

describe('useStatusManagementController organization and resource commands', () => {
  beforeEach(resetStatusManagementControllerFixture);

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
    api.loadStatusOrg.mockRejectedValueOnce(new StatusOrgNotFoundError());
    api.saveStatusOrg.mockRejectedValueOnce(unavailableRequestFailure());
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
    api.saveStatusOrg.mockRejectedValueOnce(unavailableRequestFailure());
    api.loadStatusOrg
      .mockResolvedValueOnce(org)
      .mockResolvedValueOnce(org)
      .mockRejectedValueOnce(unavailableRequestFailure());
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
    api.loadStatusOrg.mockRejectedValueOnce(new StatusOrgNotFoundError());
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

  it('owns explicit component creation defaults before the presentation layer renders', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.org.kind).toBe('ready'));

    act(() => result.current.openNewComponent());

    expect(result.current.componentEditor).toEqual({
      orgId: 1,
      name: '',
      method: 0,
      configState: 0,
      state: 0
    });
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
    api.saveStatusComponent.mockRejectedValueOnce(unavailableRequestFailure());
    api.saveStatusIncident.mockRejectedValueOnce(uncertainRequestFailure());
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
    api.saveStatusComponent.mockRejectedValueOnce(rejectedRequestFailure()).mockResolvedValueOnce(undefined);
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
});
