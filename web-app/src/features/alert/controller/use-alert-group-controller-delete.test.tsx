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

import { AlertGroupMissingError, type AlertGroupQuery } from '../model/alert-group-model';

import {
  api,
  notify,
  page,
  persisted,
  renderController,
  resetAlertGroupControllerFixture,
  unavailableRequestFailure,
  uncertainRequestFailure
} from './use-alert-group-controller-test-support';

describe('Alert Group controller delete proof', () => {
  beforeEach(resetAlertGroupControllerFixture);

  it('deletes only after missing-detail proof and authoritative list absence', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertGroup.mockRejectedValue(new AlertGroupMissingError());
    api.loadAlertGroups.mockImplementation((query: AlertGroupQuery) => Promise.resolve(page(query, [])));

    await act(async () => result.current.remove(7));
    expect(api.deleteAlertGroups).toHaveBeenCalledWith([7]);
    expect(api.loadAlertGroup).toHaveBeenCalledWith(7);
    expect(notify.success).toHaveBeenCalledWith('alertGroups.operationSuccess');

    vi.clearAllMocks();
    api.deleteAlertGroups.mockResolvedValue(undefined);
    api.loadAlertGroup.mockRejectedValue(new AlertGroupMissingError());
    api.loadAlertGroups.mockImplementation((query: AlertGroupQuery) => Promise.resolve(page(query, [persisted])));
    await act(async () => result.current.remove(7));
    expect(notify.success).not.toHaveBeenCalled();
    expect(result.current.state.recovery).toMatchObject({ kind: 'delete', phase: 'projection', failure: 'error' });
    expect(notify.error).toHaveBeenCalledWith('common.routeError.description');
  });

  it('deletes the selected policies in one write and proves every id missing', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertGroup.mockRejectedValue(new AlertGroupMissingError());
    api.loadAlertGroups.mockImplementation((query: AlertGroupQuery) => Promise.resolve(page(query, [])));

    await act(async () => result.current.removeMany([8, 7, 8]));

    expect(api.deleteAlertGroups).toHaveBeenCalledOnce();
    expect(api.deleteAlertGroups).toHaveBeenCalledWith([7, 8]);
    expect(api.loadAlertGroup).toHaveBeenCalledTimes(2);
    expect(api.loadAlertGroup).toHaveBeenCalledWith(7);
    expect(api.loadAlertGroup).toHaveBeenCalledWith(8);
    expect(notify.success).toHaveBeenCalledWith('alertGroups.operationSuccess');
  });

  it('never repeats an uncertain batch delete while every selected id is proved', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.deleteAlertGroups.mockRejectedValueOnce(uncertainRequestFailure());
    api.loadAlertGroup.mockImplementation((id: number) =>
      Promise.reject(id === 7 ? new AlertGroupMissingError() : unavailableRequestFailure())
    );

    await act(async () => result.current.removeMany([7, 8]));

    expect(api.deleteAlertGroups).toHaveBeenCalledOnce();
    expect(result.current.state.recovery).toMatchObject({ kind: 'delete', phase: 'proof' });

    api.loadAlertGroup.mockRejectedValue(new AlertGroupMissingError());
    api.loadAlertGroups.mockImplementation((query: AlertGroupQuery) => Promise.resolve(page(query, [])));
    await act(async () => result.current.retry());

    expect(api.deleteAlertGroups).toHaveBeenCalledOnce();
    expect(api.loadAlertGroup).toHaveBeenCalledWith(7);
    expect(api.loadAlertGroup).toHaveBeenCalledWith(8);
    expect(result.current.state.recovery).toBeUndefined();
    expect(notify.success).toHaveBeenCalledWith('alertGroups.operationSuccess');
  });
});
