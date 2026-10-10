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

import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AlertGroupMissingError,
  AlertGroupRequestFailure,
  type AlertGroupConverge,
  type AlertGroupDraft,
  type AlertGroupQuery
} from '../model/alert-group-model';

import {
  api,
  deferred,
  notify,
  page,
  persisted,
  rejectedMissingRequestFailure,
  renderController,
  renderRoutedController,
  resetAlertGroupControllerFixture,
  unavailableRequestFailure,
  uncertainRequestFailure
} from './use-alert-group-controller-test-support';

describe('Alert Group controller update and toggle proof', () => {
  beforeEach(resetAlertGroupControllerFixture);

  it('proves exact-id detail and list rereads after PUT and toggle', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    await act(async () => result.current.edit(7));
    vi.clearAllMocks();
    api.loadAlertGroup
      .mockResolvedValueOnce(persisted)
      .mockResolvedValueOnce(persisted)
      .mockResolvedValueOnce({ ...persisted, enable: false });
    api.loadAlertGroups.mockImplementation((query: AlertGroupQuery) => Promise.resolve(page(query, [persisted])));
    api.saveAlertGroup.mockResolvedValue(undefined);
    api.updateAlertGroupEnabled.mockResolvedValue(undefined);

    await act(async () => result.current.submit());
    expect(api.loadAlertGroup).toHaveBeenCalledWith(7);
    expect(api.loadAlertGroups).toHaveBeenCalledTimes(1);
    expect(result.current.state.draft).toBeNull();

    await act(async () => result.current.toggle(persisted, false));
    expect(api.updateAlertGroupEnabled).toHaveBeenCalledWith(persisted, false);
    expect(api.loadAlertGroup).toHaveBeenLastCalledWith(7);
    expect(api.loadAlertGroups).toHaveBeenCalledTimes(2);
  });

  it('toggles from an exact authoritative detail instead of the stale list row', async () => {
    const staleRow = { ...persisted, name: 'Stale list name', groupWait: 1 };
    const authoritative = { ...persisted, name: 'Current server name', groupWait: 45 };
    api.loadAlertGroup.mockResolvedValueOnce(authoritative).mockResolvedValueOnce({ ...authoritative, enable: false });
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));

    await act(async () => result.current.toggle(staleRow, false));

    expect(api.loadAlertGroup).toHaveBeenNthCalledWith(1, 7);
    expect(api.updateAlertGroupEnabled).toHaveBeenCalledWith(authoritative, false);
    expect(api.loadAlertGroup).toHaveBeenNthCalledWith(2, 7);
    expect(notify.success).toHaveBeenCalledWith('alertGroups.operationSuccess');
  });

  it('rereads the latest visible query after a pending operation changes route context', async () => {
    const write = deferred<void>();
    api.updateAlertGroupEnabled.mockReturnValueOnce(write.promise);
    api.loadAlertGroup.mockResolvedValueOnce(persisted).mockResolvedValueOnce({ ...persisted, enable: false });
    const routed = renderRoutedController(['/alerts/groups?search=old&pageIndex=0&pageSize=8']);
    await waitFor(() => expect(routed.current().state.list.kind).toBe('empty'));

    let operation!: Promise<void>;
    act(() => {
      operation = routed.current().toggle(persisted, false);
    });
    await waitFor(() => expect(api.updateAlertGroupEnabled).toHaveBeenCalledOnce());
    await act(async () => routed.router.navigate('/alerts/groups?search=fresh&pageIndex=0&pageSize=8'));
    await waitFor(() => expect(routed.current().state.query).toEqual({ search: 'fresh', pageIndex: 0, pageSize: 8 }));
    const callsBeforeConvergence = api.loadAlertGroups.mock.calls.length;

    act(() => write.resolve());
    await act(async () => operation);

    expect(api.loadAlertGroups.mock.calls.length).toBeGreaterThan(callsBeforeConvergence);
    expect(api.loadAlertGroups).toHaveBeenLastCalledWith(
      { search: 'fresh', pageIndex: 0, pageSize: 8 },
      expect.any(AbortSignal)
    );
  });

  it('keeps write 404 distinct from missing detail semantics', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    await act(async () => result.current.edit(7));
    api.saveAlertGroup.mockRejectedValueOnce(rejectedMissingRequestFailure());

    await act(async () => result.current.submit());

    expect(result.current.state.draft).toMatchObject({ id: 7 });
    expect(result.current.state.detail).toEqual({ kind: 'idle' });
    expect(result.current.state.editorFailure).toBe('error');
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('keeps an uncertain update locked to exact-id proof and never repeats the PUT', async () => {
    const submitted: AlertGroupDraft & { id: number } = {
      id: 7,
      name: 'Updated group',
      groupLabels: ['service', 'severity'],
      groupWait: 30,
      groupInterval: 300,
      repeatInterval: 14_400,
      enable: true
    };
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    await act(async () => result.current.edit(7));
    act(() => result.current.updateDraft(submitted));
    api.saveAlertGroup.mockRejectedValueOnce(uncertainRequestFailure());
    api.loadAlertGroup.mockRejectedValueOnce(unavailableRequestFailure());

    await act(async () => result.current.submit());

    expect(api.saveAlertGroup).toHaveBeenCalledOnce();
    expect(api.saveAlertGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 7,
        name: 'Updated group',
        groupLabels: ['service', 'severity'],
        repeatInterval: 14_400
      })
    );
    expect(result.current.state.recovery).toEqual({
      kind: 'update',
      phase: 'proof',
      failure: 'error',
      retryable: true
    });
    expect(result.current.state.draft).toMatchObject(submitted);
    expect(notify.error).not.toHaveBeenCalledWith('alertGroups.saveFailed');
    expect(notify.error).toHaveBeenCalledWith('common.routeError.description');

    act(() => {
      result.current.updateDraft({ name: 'Must remain frozen' });
      void result.current.submit();
      void result.current.toggle(persisted, false);
      void result.current.remove(7);
      result.current.closeDraft();
    });
    expect(api.saveAlertGroup).toHaveBeenCalledOnce();
    expect(api.updateAlertGroupEnabled).not.toHaveBeenCalled();
    expect(api.deleteAlertGroups).not.toHaveBeenCalled();
    expect(result.current.state.draft).toMatchObject(submitted);

    await act(async () => result.current.retry());

    expect(result.current.state.recovery).toEqual({
      kind: 'update',
      phase: 'proof',
      failure: 'unavailable',
      retryable: true
    });
    expect(notify.warning).toHaveBeenCalledWith('common.unavailable');
    api.loadAlertGroup.mockResolvedValueOnce(submitted);
    await act(async () => result.current.retry());

    expect(api.saveAlertGroup).toHaveBeenCalledOnce();
    expect(api.loadAlertGroup).toHaveBeenLastCalledWith(7);
    expect(result.current.state.recovery).toBeUndefined();
    expect(result.current.state.draft).toBeNull();
    expect(notify.success).toHaveBeenCalledWith('alertGroups.saveSuccess');
  });

  it('keeps an uncertain toggle locked to canonical proof and never repeats the PUT', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertGroup
      .mockResolvedValueOnce(persisted)
      .mockRejectedValueOnce(unavailableRequestFailure())
      .mockResolvedValueOnce({ ...persisted, enable: false });
    api.updateAlertGroupEnabled.mockRejectedValueOnce(uncertainRequestFailure());

    await act(async () => result.current.toggle(persisted, false));

    expect(api.updateAlertGroupEnabled).toHaveBeenCalledOnce();
    expect(result.current.state.recovery).toEqual({
      kind: 'toggle',
      phase: 'proof',
      failure: 'error',
      retryable: true
    });
    expect(notify.error).not.toHaveBeenCalledWith('alertGroups.operationFailed');

    await act(async () => result.current.toggle(persisted, false));
    expect(api.updateAlertGroupEnabled).toHaveBeenCalledOnce();

    await act(async () => result.current.retry());

    expect(result.current.state.recovery).toMatchObject({ failure: 'unavailable', phase: 'proof' });
    await act(async () => result.current.retry());

    expect(api.updateAlertGroupEnabled).toHaveBeenCalledOnce();
    expect(api.loadAlertGroup).toHaveBeenCalledTimes(3);
    expect(result.current.state.recovery).toBeUndefined();
    expect(notify.success).toHaveBeenCalledWith('alertGroups.operationSuccess');
  });

  it('keeps an uncertain delete locked to missing proof and never repeats the DELETE', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.deleteAlertGroups.mockRejectedValueOnce(uncertainRequestFailure());
    api.loadAlertGroup
      .mockRejectedValueOnce(unavailableRequestFailure())
      .mockRejectedValueOnce(new AlertGroupMissingError());

    await act(async () => result.current.remove(7));

    expect(api.deleteAlertGroups).toHaveBeenCalledOnce();
    expect(result.current.state.recovery).toEqual({
      kind: 'delete',
      phase: 'proof',
      failure: 'error',
      retryable: true
    });
    expect(notify.error).not.toHaveBeenCalledWith('alertGroups.operationFailed');

    await act(async () => result.current.remove(7));
    expect(api.deleteAlertGroups).toHaveBeenCalledOnce();

    await act(async () => result.current.retry());

    expect(result.current.state.recovery).toMatchObject({ failure: 'unavailable', phase: 'proof' });
    await act(async () => result.current.retry());

    expect(api.deleteAlertGroups).toHaveBeenCalledOnce();
    expect(api.loadAlertGroup).toHaveBeenCalledTimes(2);
    expect(result.current.state.recovery).toBeUndefined();
    expect(notify.success).toHaveBeenCalledWith('alertGroups.operationSuccess');
  });

  it('retries a failed projection with the latest list query and no canonical or write replay', async () => {
    const routed = renderRoutedController(['/alerts/groups?search=old&pageIndex=0&pageSize=8']);
    await waitFor(() => expect(routed.current().state.list.kind).toBe('empty'));
    api.loadAlertGroup.mockResolvedValueOnce(persisted).mockResolvedValueOnce({ ...persisted, enable: false });
    api.loadAlertGroups.mockRejectedValueOnce(unavailableRequestFailure());

    await act(async () => routed.current().toggle(persisted, false));

    expect(routed.current().state.recovery).toEqual({
      kind: 'toggle',
      phase: 'projection',
      failure: 'unavailable',
      retryable: true
    });
    expect(api.updateAlertGroupEnabled).toHaveBeenCalledOnce();
    expect(api.loadAlertGroup).toHaveBeenCalledTimes(2);

    await act(async () => routed.router.navigate('/alerts/groups?search=fresh&pageIndex=0&pageSize=8'));
    api.loadAlertGroups.mockResolvedValueOnce(page(routed.current().state.query, []));
    await act(async () => routed.current().retry());

    expect(api.updateAlertGroupEnabled).toHaveBeenCalledOnce();
    expect(api.loadAlertGroup).toHaveBeenCalledTimes(2);
    expect(api.loadAlertGroups).toHaveBeenLastCalledWith(
      { search: 'fresh', pageIndex: 0, pageSize: 8 },
      expect.any(AbortSignal)
    );
    expect(routed.current().state.recovery).toBeUndefined();
  });

  it('admits only one same-tick row operation before React publishes command state', async () => {
    const detail = deferred<AlertGroupConverge>();
    api.loadAlertGroup.mockReturnValueOnce(detail.promise);
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));

    let first!: Promise<void>;
    act(() => {
      first = result.current.toggle(persisted, false);
      void result.current.toggle(persisted, false);
      void result.current.remove(7);
    });

    expect(api.loadAlertGroup).toHaveBeenCalledOnce();
    expect(api.deleteAlertGroups).not.toHaveBeenCalled();
    act(() => detail.resolve(persisted));
    await act(async () => first);
    expect(api.updateAlertGroupEnabled).toHaveBeenCalledOnce();
  });

  it('retires a pending recovery proof when the controller unmounts', async () => {
    const proof = deferred<AlertGroupConverge>();
    const { result, unmount } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.saveAlertGroup.mockRejectedValueOnce(uncertainRequestFailure());
    await act(async () => result.current.edit(7));
    await act(async () => result.current.submit());
    api.loadAlertGroup.mockReturnValueOnce(proof.promise);
    let retry!: Promise<void>;
    act(() => {
      retry = result.current.retry();
    });

    unmount();
    proof.resolve(persisted);
    await retry;

    expect(api.saveAlertGroup).toHaveBeenCalledOnce();
    expect(notify.success).not.toHaveBeenCalled();
    expect(api.loadAlertGroups).toHaveBeenCalledOnce();
  });

  it.each([
    ['update', () => new AlertGroupRequestFailure('error', 'rejected')],
    ['toggle', () => new AlertGroupRequestFailure('error', 'rejected')],
    ['delete', () => new AlertGroupRequestFailure('error', 'rejected')]
  ] as const)('unlocks a definitely rejected %s for an explicit write retry', async (kind, rejection) => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    if (kind === 'update') {
      await act(async () => result.current.edit(7));
      api.saveAlertGroup.mockRejectedValueOnce(rejection()).mockResolvedValueOnce(undefined);
      await act(async () => result.current.submit());
      await act(async () => result.current.submit());
      expect(api.saveAlertGroup).toHaveBeenCalledTimes(2);
    } else if (kind === 'toggle') {
      api.loadAlertGroup
        .mockResolvedValueOnce(persisted)
        .mockResolvedValueOnce(persisted)
        .mockResolvedValueOnce({ ...persisted, enable: false });
      api.updateAlertGroupEnabled.mockRejectedValueOnce(rejection()).mockResolvedValueOnce(undefined);
      await act(async () => result.current.toggle(persisted, false));
      await act(async () => result.current.toggle(persisted, false));
      expect(api.updateAlertGroupEnabled).toHaveBeenCalledTimes(2);
    } else {
      api.deleteAlertGroups.mockRejectedValueOnce(rejection()).mockResolvedValueOnce(undefined);
      api.loadAlertGroup.mockRejectedValue(new AlertGroupMissingError());
      await act(async () => result.current.remove(7));
      await act(async () => result.current.remove(7));
      expect(api.deleteAlertGroups).toHaveBeenCalledTimes(2);
    }
    expect(result.current.state.recovery).toBeUndefined();
  });

  it('keeps an update draft when exact-id detail does not match the normalized writable payload', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    await act(async () => result.current.edit(7));
    act(() => result.current.updateDraft({ name: ' Updated ', groupLabels: ['service', 'service', ' severity '] }));
    api.loadAlertGroup.mockResolvedValue({ ...persisted, name: 'By service' });
    await act(async () => result.current.submit());

    expect(result.current.state.draft).toMatchObject({ id: 7, name: ' Updated ' });
    expect(result.current.state.editorFailure).toBeUndefined();
    expect(result.current.state.recovery).toMatchObject({ kind: 'update', phase: 'proof', failure: 'error' });
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('does not report toggle success when canonical writable fields fail to converge', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertGroup.mockResolvedValue(persisted);

    await act(async () => result.current.toggle(persisted, false));

    expect(api.loadAlertGroups).toHaveBeenCalledTimes(1);
    expect(notify.success).not.toHaveBeenCalled();
    expect(result.current.state.recovery).toMatchObject({ kind: 'toggle', phase: 'proof', failure: 'error' });
    expect(notify.error).toHaveBeenCalledWith('common.routeError.description');
  });

  it('does not close an update when the detail reread returns another id', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    await act(async () => result.current.edit(7));
    api.loadAlertGroup.mockResolvedValue({ ...persisted, id: 8 });
    await act(async () => result.current.submit());

    expect(result.current.state.draft).toMatchObject({ id: 7 });
    expect(result.current.state.editorFailure).toBeUndefined();
    expect(result.current.state.recovery).toMatchObject({ kind: 'update', phase: 'proof', failure: 'error' });
    expect(notify.success).not.toHaveBeenCalled();
  });
});
