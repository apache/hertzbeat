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

import { AlertGroupContractError, AlertGroupMissingError, type AlertGroupQuery } from '../model/alert-group-model';

import {
  api,
  page,
  persisted,
  renderController,
  renderRoutedController,
  resetAlertGroupControllerFixture,
  unavailableRequestFailure
} from './use-alert-group-controller-test-support';

describe('Alert Group controller query and admission', () => {
  beforeEach(resetAlertGroupControllerFixture);

  it('forwards TanStack cancellation to the list read', async () => {
    const { result } = renderController();

    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));

    expect(api.loadAlertGroups).toHaveBeenCalledWith(
      { search: '', pageIndex: 0, pageSize: 8 },
      expect.any(AbortSignal)
    );
  });

  it('rejects USER delete before transport while keeping the list read available', async () => {
    const { result } = renderController('/alerts/groups?pageIndex=0&pageSize=8', ['USER']);

    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    await act(async () => result.current.remove(7));

    expect(api.loadAlertGroups).toHaveBeenCalled();
    expect(api.deleteAlertGroups).not.toHaveBeenCalled();
  });

  it('keeps Sureness-authorized USER writes available', async () => {
    const { result } = renderController('/alerts/groups?pageIndex=0&pageSize=8', ['USER']);

    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    await act(async () => result.current.toggle(persisted, false));

    expect(api.updateAlertGroupEnabled).toHaveBeenCalledOnce();
  });

  it('rejects every GUEST mutation before editor or transport admission', async () => {
    const { result } = renderController('/alerts/groups?pageIndex=0&pageSize=8', ['GUEST']);

    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    await act(async () => {
      result.current.create();
      await result.current.edit(7);
      await result.current.toggle(persisted, false);
      await result.current.remove(7);
      await result.current.submit();
    });

    expect(result.current.state.draft).toBeNull();
    expect(api.loadAlertGroup).not.toHaveBeenCalled();
    expect(api.saveAlertGroup).not.toHaveBeenCalled();
    expect(api.updateAlertGroupEnabled).not.toHaveBeenCalled();
    expect(api.deleteAlertGroups).not.toHaveBeenCalled();
  });

  it('owns canonical URL search, POP convergence, and page-size reset', async () => {
    const routed = renderRoutedController([
      '/alerts/groups?search=A&pageIndex=1&pageSize=15',
      '/alerts/groups?search=B&pageIndex=2&pageSize=8'
    ]);
    await waitFor(() => expect(routed.current().state.list.kind).toBe('empty'));
    act(() => routed.current().setSearch('draft'));
    await act(async () => routed.router.navigate(1));
    expect(routed.current().state).toMatchObject({ search: 'B', query: { search: 'B', pageIndex: 2, pageSize: 8 } });
    await act(async () => routed.router.navigate(-1));
    expect(routed.current().state.search).toBe('A');

    act(() => routed.current().changePage(3, 25));
    await waitFor(() => expect(routed.current().state.query).toMatchObject({ pageIndex: 0, pageSize: 25 }));
  });

  it.each([
    [unavailableRequestFailure(), 'unavailable'],
    [new AlertGroupContractError('invalid'), 'error']
  ])('keeps list failure %s distinct from empty', async (reason, kind) => {
    api.loadAlertGroups.mockRejectedValue(reason);
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe(kind));
  });

  it('returns an authoritative out-of-range page to the last populated page', async () => {
    api.loadAlertGroups.mockImplementation((query: AlertGroupQuery) => {
      if (query.pageIndex === 2) {
        return Promise.resolve({
          ...page(query, []),
          totalElements: 5,
          totalPages: 1
        });
      }
      return Promise.resolve({
        ...page(query, [persisted]),
        totalElements: 5,
        totalPages: 1
      });
    });
    const routed = renderRoutedController(['/alerts/groups?pageIndex=2&pageSize=8']);

    await waitFor(() => expect(routed.current().state.query.pageIndex).toBe(0));
    await waitFor(() => expect(routed.current().state.list).toMatchObject({ kind: 'ready', total: 5 }));
    expect(routed.router.state.location.search).toBe('?pageIndex=0&pageSize=8');
  });

  it.each([
    [new AlertGroupMissingError(), 'missing'],
    [unavailableRequestFailure(), 'unavailable'],
    [new AlertGroupContractError('invalid'), 'error']
  ])('keeps detail failure %s retryable and distinct', async (reason, kind) => {
    api.loadAlertGroup.mockRejectedValueOnce(reason).mockResolvedValueOnce(persisted);
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));

    await act(async () => result.current.edit(7));
    expect(result.current.state.detail).toEqual({ kind, id: 7 });
    await act(async () => result.current.retryDetail());
    expect(result.current.state.draft).toMatchObject({ id: 7, name: 'By service' });
  });
});
