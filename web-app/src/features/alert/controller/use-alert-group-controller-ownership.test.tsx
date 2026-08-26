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
import { beforeEach, describe, expect, it } from 'vitest';

import { AlertGroupMissingError, type AlertGroupConverge } from '../model/alert-group-model';

import {
  api,
  deferred,
  notify,
  persisted,
  proofPage,
  rejectedMissingRequestFailure,
  renderController,
  resetAlertGroupControllerFixture,
  unavailableRequestFailure
} from './use-alert-group-controller-test-support';

describe('Alert Group controller editor ownership', () => {
  beforeEach(resetAlertGroupControllerFixture);

  it('admits only one same-tick write and blocks draft commands until it settles', async () => {
    const write = deferred<void>();
    api.saveAlertGroup.mockReturnValueOnce(write.promise);
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    act(() => result.current.create());
    act(() => result.current.updateDraft({ name: 'New', groupLabels: ['service'] }));

    let first!: Promise<void>;
    let duplicate!: Promise<void>;
    act(() => {
      first = result.current.submit();
      duplicate = result.current.submit();
      void result.current.toggle(persisted, false);
      void result.current.remove(7);
      result.current.create();
      result.current.updateDraft({ name: 'Must not replace the locked draft' });
      result.current.closeDraft();
      void result.current.edit(7);
    });

    await waitFor(() => expect(api.saveAlertGroup).toHaveBeenCalledTimes(1));
    expect(api.updateAlertGroupEnabled).not.toHaveBeenCalled();
    expect(api.deleteAlertGroups).not.toHaveBeenCalled();
    expect(api.loadAlertGroup).not.toHaveBeenCalled();
    expect(result.current.state.draft).toMatchObject({ name: 'New' });

    act(() => write.resolve());
    await act(async () => Promise.all([first, duplicate]));
    expect(result.current.state.command).toBe('idle');
  });

  it('deduplicates the same pending detail and lets only the latest different edit publish', async () => {
    const first = deferred<AlertGroupConverge>();
    const second = deferred<AlertGroupConverge>();
    api.loadAlertGroup.mockReset();
    api.loadAlertGroup.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));

    let firstEdit!: Promise<void>;
    let duplicateEdit!: Promise<void>;
    let secondEdit!: Promise<void>;
    act(() => {
      firstEdit = result.current.edit(7);
      duplicateEdit = result.current.edit(7);
      secondEdit = result.current.edit(8);
    });
    expect(api.loadAlertGroup).toHaveBeenCalledTimes(2);

    act(() => second.resolve({ ...persisted, id: 8, name: 'Latest group' }));
    await act(async () => secondEdit);
    expect(result.current.state.draft).toMatchObject({ id: 8, name: 'Latest group' });

    act(() => first.resolve(persisted));
    await act(async () => Promise.all([firstEdit, duplicateEdit]));
    expect(result.current.state.draft).toMatchObject({ id: 8, name: 'Latest group' });
  });

  it('retires the previous draft while a different detail identity is loading', async () => {
    const failed = deferred<AlertGroupConverge>();
    const latest = deferred<AlertGroupConverge>();
    api.loadAlertGroup.mockReset();
    api.loadAlertGroup
      .mockResolvedValueOnce(persisted)
      .mockReturnValueOnce(failed.promise)
      .mockReturnValueOnce(latest.promise);
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    await act(async () => result.current.edit(7));
    expect(result.current.state.draft).toMatchObject({ id: 7 });

    let failedEdit!: Promise<void>;
    act(() => {
      failedEdit = result.current.edit(8);
    });
    expect(result.current.state.draft).toBeNull();
    await act(async () => result.current.submit());
    expect(api.saveAlertGroup).not.toHaveBeenCalled();

    act(() => failed.reject(new AlertGroupMissingError()));
    await act(async () => failedEdit);
    expect(result.current.state.detail).toEqual({ kind: 'missing', id: 8 });
    expect(result.current.state.draft).toBeNull();

    let latestEdit!: Promise<void>;
    act(() => {
      latestEdit = result.current.edit(8);
    });
    expect(result.current.state.draft).toBeNull();
    act(() => latest.resolve({ ...persisted, id: 8, name: 'Latest group' }));
    await act(async () => latestEdit);
    expect(result.current.state.draft).toMatchObject({ id: 8, name: 'Latest group' });
  });

  it('invalidates pending detail when create or close changes editor ownership', async () => {
    const createDetail = deferred<AlertGroupConverge>();
    api.loadAlertGroup.mockReturnValueOnce(createDetail.promise);
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));

    let createEdit!: Promise<void>;
    act(() => {
      createEdit = result.current.edit(7);
    });
    act(() => result.current.create());
    act(() => createDetail.resolve(persisted));
    await act(async () => createEdit);
    expect(result.current.state.draft).toMatchObject({ name: '', groupLabels: [] });

    const closedDetail = deferred<AlertGroupConverge>();
    api.loadAlertGroup.mockReturnValueOnce(closedDetail.promise);
    let closedEdit!: Promise<void>;
    act(() => {
      closedEdit = result.current.edit(7);
    });
    act(() => result.current.closeDraft());
    act(() => closedDetail.resolve(persisted));
    await act(async () => closedEdit);
    expect(result.current.state.draft).toBeNull();
    expect(result.current.state.detail).toEqual({ kind: 'idle' });
  });

  it('retires a pending detail owner when the controller unmounts', async () => {
    const detail = deferred<AlertGroupConverge>();
    api.loadAlertGroup.mockReturnValueOnce(detail.promise);
    const { result, unmount } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    let edit!: Promise<void>;
    act(() => {
      edit = result.current.edit(7);
    });

    unmount();
    detail.resolve(persisted);
    await edit;

    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
    expect(notify.warning).not.toHaveBeenCalled();
  });

  it('does not publish or notify when an acknowledged create proof completes after unmount', async () => {
    const proof = deferred<ReturnType<typeof proofPage>>();
    const { result, unmount } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    const created = { ...persisted, id: 8, name: 'New', repeatInterval: 14_400 };
    api.loadAlertGroups.mockResolvedValueOnce(proofPage([], 0)).mockReturnValueOnce(proof.promise);
    act(() => result.current.create());
    act(() => result.current.updateDraft({ name: 'New', groupLabels: ['service'] }));
    let submit!: Promise<void>;
    act(() => {
      submit = result.current.submit();
    });
    await waitFor(() => expect(api.saveAlertGroup).toHaveBeenCalledOnce());

    unmount();
    proof.resolve(proofPage([created], 1));
    await submit;

    expect(api.loadAlertGroups).toHaveBeenCalledTimes(3);
    expect(notify.success).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
    expect(notify.warning).not.toHaveBeenCalled();
  });

  it('lets the operator abandon acknowledged proof without repeating the POST', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertGroups.mockResolvedValueOnce(proofPage([], 0)).mockRejectedValueOnce(unavailableRequestFailure());
    act(() => result.current.create());
    act(() => result.current.updateDraft({ name: 'New', groupLabels: ['service'] }));
    await act(async () => result.current.submit());
    expect(result.current.state.createAcknowledged).toBe(true);

    act(() => result.current.closeDraft());
    await act(async () => result.current.submit());

    expect(result.current.state.draft).toBeNull();
    expect(result.current.state.createAcknowledged).toBe(false);
    expect(api.saveAlertGroup).toHaveBeenCalledOnce();
  });

  it('keeps the create draft and reports no success when authoritative reread fails', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertGroups.mockRejectedValueOnce(unavailableRequestFailure());
    act(() => result.current.create());
    act(() => result.current.updateDraft({ name: 'New', groupLabels: ['service'] }));
    await act(async () => result.current.submit());

    expect(result.current.state.draft).toMatchObject({ name: 'New' });
    expect(result.current.state.editorFailure).toBe('unavailable');
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('keeps missing create list proof distinct from missing detail semantics', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertGroups.mockRejectedValueOnce(rejectedMissingRequestFailure());
    act(() => result.current.create());
    act(() => result.current.updateDraft({ name: 'New', groupLabels: ['service'] }));

    await act(async () => result.current.submit());

    expect(result.current.state.draft).toMatchObject({ name: 'New' });
    expect(result.current.state.editorFailure).toBe('error');
    expect(notify.success).not.toHaveBeenCalled();
  });
});
