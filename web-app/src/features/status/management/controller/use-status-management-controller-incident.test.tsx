/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { StatusManagementMissingError } from '../model/status-management-contract';

import {
  api,
  incident,
  incidentPage,
  notification,
  renderController,
  resetStatusManagementControllerFixture,
  unavailableRequestFailure
} from './use-status-management-controller-test-support';

describe('useStatusManagementController incident proof', () => {
  beforeEach(resetStatusManagementControllerFixture);

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
    await waitFor(() => expect(api.loadStatusIncident).toHaveBeenCalledWith(7, expect.any(AbortSignal)));
    await waitFor(() => expect(api.loadStatusIncidents).toHaveBeenCalledTimes(3));

    api.loadStatusIncident.mockRejectedValueOnce(new StatusManagementMissingError('incident'));
    act(() => result.current.deleteIncident(7));
    await waitFor(() => expect(api.deleteStatusIncident).toHaveBeenCalledWith(7));
    await waitFor(() => expect(api.loadStatusIncidents).toHaveBeenCalledTimes(4));
  });

  it('distinguishes unavailable, missing detail, and an out-of-range ready page', async () => {
    api.loadStatusComponents.mockRejectedValue(unavailableRequestFailure());
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
      .mockRejectedValueOnce(unavailableRequestFailure())
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
      .mockRejectedValueOnce(unavailableRequestFailure())
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
    expect(api.loadStatusIncidents).toHaveBeenLastCalledWith(
      {
        search: 'current',
        pageIndex: 0,
        pageSize: 8
      },
      expect.any(AbortSignal)
    );
  });
});
