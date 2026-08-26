/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { StatusManagementMissingError, type StatusComponent } from '../model/status-management-contract';

import {
  api,
  component,
  deferred,
  incident,
  incidentPage,
  notification,
  rejectedRequestFailure,
  renderController,
  resetStatusManagementControllerFixture,
  unavailableRequestFailure,
  uncertainRequestFailure
} from './use-status-management-controller-test-support';

describe('useStatusManagementController component proof', () => {
  beforeEach(resetStatusManagementControllerFixture);

  it('requires exact component detail reread plus list refresh for update and missing proof for delete', async () => {
    const updated = { ...component, name: 'Updated' };
    api.loadStatusComponent.mockResolvedValueOnce(updated);
    const { result } = renderController();
    await waitFor(() => expect(result.current.components.kind).toBe('ready'));
    act(() => result.current.editComponent(component));
    act(() => result.current.saveComponent(updated));

    await waitFor(() => expect(api.loadStatusComponent).toHaveBeenCalledWith(4, expect.any(AbortSignal)));
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
    api.loadStatusComponents.mockResolvedValueOnce([component]).mockRejectedValueOnce(unavailableRequestFailure());
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
      .mockRejectedValueOnce(unavailableRequestFailure())
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
    api.saveStatusComponent.mockRejectedValueOnce(unavailableRequestFailure());
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
    api.saveStatusIncident.mockRejectedValueOnce(unavailableRequestFailure());
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
    api.saveStatusComponent.mockRejectedValueOnce(rejectedRequestFailure()).mockResolvedValueOnce(undefined);
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

    api.deleteStatusIncident.mockRejectedValueOnce(rejectedRequestFailure()).mockResolvedValueOnce(undefined);
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
    api.deleteStatusIncident.mockRejectedValueOnce(uncertainRequestFailure());
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
    api.deleteStatusComponent.mockRejectedValueOnce(unavailableRequestFailure());
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
      .mockRejectedValueOnce(unavailableRequestFailure())
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
});
