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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';

import { normalizeAlertGroupApiFailure } from '../api/alert-group-api-failure';
import {
  AlertGroupContractError,
  AlertGroupMissingError,
  AlertGroupRequestFailure,
  type AlertGroupConverge,
  type AlertGroupDraft,
  type AlertGroupQuery
} from '../model/alert-group-model';
import { useAlertGroupController } from './use-alert-group-controller';

const api = vi.hoisted(() => ({
  deleteAlertGroup: vi.fn(),
  loadAlertGroup: vi.fn(),
  loadAlertGroups: vi.fn(),
  saveAlertGroup: vi.fn(),
  updateAlertGroupEnabled: vi.fn()
}));
const notify = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), warning: vi.fn() }));

vi.mock('../api/alert-group-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/alert-group-api')>()),
  ...api
}));
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()),
  App: { useApp: () => ({ message: notify }) }
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const persisted: AlertGroupConverge = {
  id: 7,
  name: 'By service',
  groupLabels: ['service'],
  groupWait: 30,
  groupInterval: 300,
  repeatInterval: 0,
  enable: true,
  gmtUpdate: '2026-07-17T09:00:00'
};

describe('Alert Group controller', () => {
  beforeEach(() => {
    // Reset queued one-shot implementations as well as call history so a RED
    // test cannot leak unused transport evidence into the next case.
    vi.resetAllMocks();
    api.loadAlertGroups.mockImplementation((query: AlertGroupQuery) => Promise.resolve(page(query, [])));
    api.loadAlertGroup.mockResolvedValue(persisted);
    api.saveAlertGroup.mockResolvedValue(undefined);
    api.updateAlertGroupEnabled.mockResolvedValue(undefined);
    api.deleteAlertGroup.mockResolvedValue(undefined);
  });

  it('forwards TanStack cancellation to the list read', async () => {
    const { result } = renderController();

    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));

    expect(api.loadAlertGroups).toHaveBeenCalledWith(
      { search: '', pageIndex: 0, pageSize: 8 },
      expect.any(AbortSignal)
    );
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

  it('keeps an out-of-range empty page with a nonzero total ready', async () => {
    api.loadAlertGroups.mockImplementation((query: AlertGroupQuery) =>
      Promise.resolve({
        ...page(query, []),
        totalElements: 5,
        totalPages: 1
      })
    );
    const { result } = renderController('/alerts/groups?pageIndex=2&pageSize=8');

    await waitFor(() => expect(result.current.state.list).toEqual({ kind: 'ready', records: [], total: 5 }));
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

  it('does not repeat an acknowledged create while canonical proof is unavailable', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    const created = { ...persisted, name: 'New', repeatInterval: 14_400 };
    api.loadAlertGroups.mockResolvedValueOnce(proofPage([], 0)).mockRejectedValueOnce(unavailableRequestFailure());
    act(() => result.current.create());
    act(() => result.current.updateDraft({ name: 'New', groupLabels: ['service'] }));

    await act(async () => result.current.submit());
    await waitFor(() => expect(api.saveAlertGroup).toHaveBeenCalledTimes(1));
    expect(result.current.state).toMatchObject({ createAcknowledged: true });
    expect(result.current.state.draft).toMatchObject({ name: 'New' });
    expect(notify.success).not.toHaveBeenCalled();

    api.loadAlertGroups
      .mockResolvedValueOnce(proofPage([created], 1))
      .mockResolvedValueOnce(page(result.current.state.query, [created]));
    await act(async () => result.current.submit());

    expect(api.saveAlertGroup).toHaveBeenCalledTimes(1);
    expect(result.current.state.draft).toBeNull();
    expect(api.loadAlertGroup).not.toHaveBeenCalled();
    expect(notify.success).toHaveBeenCalledWith('alertGroups.saveSuccess');
  });

  it.each([unavailableRequestFailure(), uncertainRequestFailure()])(
    'does not repeat a POST whose %s response leaves commit status ambiguous',
    async reason => {
      const { result } = renderController();
      await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
      api.loadAlertGroups.mockResolvedValueOnce(proofPage([], 0));
      api.saveAlertGroup.mockRejectedValueOnce(reason);
      act(() => result.current.create());
      act(() => result.current.updateDraft({ name: 'New', groupLabels: ['service'] }));

      await act(async () => result.current.submit());
      expect(result.current.state.createAcknowledged).toBe(true);
      expect(api.saveAlertGroup).toHaveBeenCalledOnce();

      api.loadAlertGroups.mockResolvedValueOnce(proofPage([], 0));
      await act(async () => result.current.submit());

      expect(api.saveAlertGroup).toHaveBeenCalledOnce();
      expect(result.current.state.createAcknowledged).toBe(true);
      expect(notify.success).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['HTTP-success business envelope', new ApiMessageError('private', { code: 12, status: 200 })],
    ['HTTP timeout', new ApiMessageError('private', { status: 408 })],
    ['HTTP server envelope', new ApiMessageError('private', { code: 12, status: 500 })]
  ])('retains create proof ownership after an ambiguous %s and retries GET only', async (_label, transportFailure) => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertGroups.mockResolvedValueOnce(proofPage([], 0));
    api.saveAlertGroup.mockRejectedValueOnce(normalizeAlertGroupApiFailure(transportFailure));
    act(() => result.current.create());
    act(() => result.current.updateDraft({ name: 'New', groupLabels: ['service'] }));

    await act(async () => result.current.submit());
    expect(result.current.state.createAcknowledged).toBe(true);
    expect(api.saveAlertGroup).toHaveBeenCalledOnce();

    api.loadAlertGroups.mockResolvedValueOnce(proofPage([], 0));
    await act(async () => result.current.submit());

    expect(api.saveAlertGroup).toHaveBeenCalledOnce();
    expect(api.loadAlertGroups).toHaveBeenCalledTimes(3);
    expect(api.loadAlertGroups).toHaveBeenLastCalledWith({ search: 'New', pageIndex: 0, pageSize: 25 });
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('keeps a definitely rejected create retryable without accepting proof ownership', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertGroups.mockResolvedValueOnce(proofPage([], 0));
    api.saveAlertGroup.mockRejectedValueOnce(new AlertGroupRequestFailure('error', 'rejected'));
    act(() => result.current.create());
    act(() => result.current.updateDraft({ name: 'New', groupLabels: ['service'] }));

    await act(async () => result.current.submit());

    expect(api.saveAlertGroup).toHaveBeenCalledOnce();
    expect(result.current.state.createAcknowledged).toBe(false);
    expect(result.current.state.draft).toMatchObject({ name: 'New' });
    expect(result.current.state.editorFailure).toBe('error');
  });

  it('does not report create success when a successful reread cannot prove the new record', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertGroups.mockImplementation((query: AlertGroupQuery) =>
      Promise.resolve(query.pageSize === 25 ? proofPage([], 0) : page(query, []))
    );
    act(() => result.current.create());
    act(() => result.current.updateDraft({ name: 'New', groupLabels: ['service'] }));

    await act(async () => result.current.submit());

    expect(api.saveAlertGroup).toHaveBeenCalledTimes(1);
    expect(result.current.state).toMatchObject({ createAcknowledged: true });
    expect(result.current.state.draft).toMatchObject({ name: 'New' });
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('does not mistake an older exact-name record beyond the proof page for a new create', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    const newerPartialMatches = Array.from({ length: 25 }, (_, index) => ({
      ...persisted,
      id: 100 - index,
      name: `New partial ${index}`
    }));
    const olderExactMatch = { ...persisted, id: 75, name: 'New', repeatInterval: 14_400 };
    api.loadAlertGroups
      .mockResolvedValueOnce(proofPage(newerPartialMatches, 26))
      .mockResolvedValueOnce(proofPage([...newerPartialMatches.slice(0, 24), olderExactMatch], 26));
    act(() => result.current.create());
    act(() => result.current.updateDraft({ name: 'New', groupLabels: ['service'] }));

    await act(async () => result.current.submit());

    expect(api.saveAlertGroup).toHaveBeenCalledOnce();
    expect(result.current.state).toMatchObject({ createAcknowledged: true });
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('proves a create from the descending head even when exact search has more than 25 results', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    const previous = Array.from({ length: 25 }, (_, index) => ({
      ...persisted,
      id: 100 - index,
      name: `New partial ${index}`
    }));
    const created = { ...persisted, id: 101, name: 'New', repeatInterval: 14_400 };
    api.loadAlertGroups
      .mockResolvedValueOnce(proofPage(previous, 40))
      .mockResolvedValueOnce(proofPage([created, ...previous.slice(0, 24)], 41))
      .mockResolvedValueOnce(page(result.current.state.query, [created]));
    act(() => result.current.create());
    act(() => result.current.updateDraft({ name: 'New', groupLabels: ['service'] }));

    await act(async () => result.current.submit());

    expect(api.saveAlertGroup).toHaveBeenCalledOnce();
    expect(result.current.state.draft).toBeNull();
    expect(notify.success).toHaveBeenCalledWith('alertGroups.saveSuccess');
  });

  it('fails closed when the first proof page is not a complete descending head', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertGroups.mockResolvedValueOnce(
      proofPage(
        [
          { ...persisted, id: 99, name: 'New partial A' },
          { ...persisted, id: 100, name: 'New partial B' }
        ],
        40
      )
    );
    act(() => result.current.create());
    act(() => result.current.updateDraft({ name: 'New', groupLabels: ['service'] }));

    await act(async () => result.current.submit());

    expect(api.saveAlertGroup).not.toHaveBeenCalled();
    expect(result.current.state.editorFailure).toBe('error');
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('keeps a canonically proven create complete when the visible list projection fails', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    const created = { ...persisted, name: 'New', repeatInterval: 14_400 };
    api.loadAlertGroups
      .mockResolvedValueOnce(proofPage([], 0))
      .mockResolvedValueOnce(proofPage([created], 1))
      .mockRejectedValueOnce(unavailableRequestFailure());
    act(() => result.current.create());
    act(() => result.current.updateDraft({ name: 'New', groupLabels: ['service'] }));

    await act(async () => result.current.submit());

    expect(api.saveAlertGroup).toHaveBeenCalledTimes(1);
    expect(result.current.state.draft).toBeNull();
    expect(result.current.state).toMatchObject({ createAcknowledged: false });
    expect(notify.success).toHaveBeenCalledWith('alertGroups.saveSuccess');
    expect(notify.error).not.toHaveBeenCalledWith('alertGroups.saveFailed');
  });

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
    expect(api.deleteAlertGroup).not.toHaveBeenCalled();
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
    await act(async () => routed.router.navigate('/alerts/groups?search=fresh&pageIndex=2&pageSize=8'));
    await waitFor(() => expect(routed.current().state.query).toEqual({ search: 'fresh', pageIndex: 2, pageSize: 8 }));
    const callsBeforeConvergence = api.loadAlertGroups.mock.calls.length;

    act(() => write.resolve());
    await act(async () => operation);

    expect(api.loadAlertGroups.mock.calls.length).toBeGreaterThan(callsBeforeConvergence);
    expect(api.loadAlertGroups).toHaveBeenLastCalledWith(
      { search: 'fresh', pageIndex: 2, pageSize: 8 },
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
    expect(api.deleteAlertGroup).not.toHaveBeenCalled();
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
    api.deleteAlertGroup.mockRejectedValueOnce(uncertainRequestFailure());
    api.loadAlertGroup
      .mockRejectedValueOnce(unavailableRequestFailure())
      .mockRejectedValueOnce(new AlertGroupMissingError());

    await act(async () => result.current.remove(7));

    expect(api.deleteAlertGroup).toHaveBeenCalledOnce();
    expect(result.current.state.recovery).toEqual({
      kind: 'delete',
      phase: 'proof',
      failure: 'error',
      retryable: true
    });
    expect(notify.error).not.toHaveBeenCalledWith('alertGroups.operationFailed');

    await act(async () => result.current.remove(7));
    expect(api.deleteAlertGroup).toHaveBeenCalledOnce();

    await act(async () => result.current.retry());

    expect(result.current.state.recovery).toMatchObject({ failure: 'unavailable', phase: 'proof' });
    await act(async () => result.current.retry());

    expect(api.deleteAlertGroup).toHaveBeenCalledOnce();
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

    await act(async () => routed.router.navigate('/alerts/groups?search=fresh&pageIndex=2&pageSize=8'));
    api.loadAlertGroups.mockResolvedValueOnce(page(routed.current().state.query, []));
    await act(async () => routed.current().retry());

    expect(api.updateAlertGroupEnabled).toHaveBeenCalledOnce();
    expect(api.loadAlertGroup).toHaveBeenCalledTimes(2);
    expect(api.loadAlertGroups).toHaveBeenLastCalledWith(
      { search: 'fresh', pageIndex: 2, pageSize: 8 },
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
    expect(api.deleteAlertGroup).not.toHaveBeenCalled();
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
      api.deleteAlertGroup.mockRejectedValueOnce(rejection()).mockResolvedValueOnce(undefined);
      api.loadAlertGroup.mockRejectedValue(new AlertGroupMissingError());
      await act(async () => result.current.remove(7));
      await act(async () => result.current.remove(7));
      expect(api.deleteAlertGroup).toHaveBeenCalledTimes(2);
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

  it('deletes only after missing-detail proof and authoritative list absence', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
    api.loadAlertGroup.mockRejectedValue(new AlertGroupMissingError());
    api.loadAlertGroups.mockImplementation((query: AlertGroupQuery) => Promise.resolve(page(query, [])));

    await act(async () => result.current.remove(7));
    expect(api.deleteAlertGroup).toHaveBeenCalledWith(7);
    expect(api.loadAlertGroup).toHaveBeenCalledWith(7);
    expect(notify.success).toHaveBeenCalledWith('alertGroups.operationSuccess');

    vi.clearAllMocks();
    api.deleteAlertGroup.mockResolvedValue(undefined);
    api.loadAlertGroup.mockRejectedValue(new AlertGroupMissingError());
    api.loadAlertGroups.mockImplementation((query: AlertGroupQuery) => Promise.resolve(page(query, [persisted])));
    await act(async () => result.current.remove(7));
    expect(notify.success).not.toHaveBeenCalled();
    expect(result.current.state.recovery).toMatchObject({ kind: 'delete', phase: 'projection', failure: 'error' });
    expect(notify.error).toHaveBeenCalledWith('common.routeError.description');
  });
});

function renderController(entry = '/alerts/groups?pageIndex=0&pageSize=8') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return renderHook(() => useAlertGroupController(), { wrapper });
}

function renderRoutedController(entries: string[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let controller: ReturnType<typeof useAlertGroupController> | undefined;
  function Probe() {
    controller = useAlertGroupController();
    return null;
  }
  const router = createMemoryRouter(
    [
      {
        path: '/alerts/groups',
        element: (
          <QueryClientProvider client={client}>
            <Probe />
          </QueryClientProvider>
        )
      }
    ],
    { initialEntries: entries, initialIndex: 0 }
  );
  render(<RouterProvider router={router} />);
  return {
    router,
    current: () => {
      if (!controller) throw new Error('not mounted');
      return controller;
    }
  };
}

function page(query: AlertGroupQuery, content: AlertGroupConverge[]) {
  const totalElements = content.length;
  return {
    content,
    totalElements,
    totalPages: Math.ceil(totalElements / query.pageSize),
    number: query.pageIndex,
    size: query.pageSize
  };
}

function proofPage(content: AlertGroupConverge[], totalElements: number) {
  return {
    content,
    totalElements,
    totalPages: Math.ceil(totalElements / 25),
    number: 0,
    size: 25
  };
}

function unavailableRequestFailure() {
  return new AlertGroupRequestFailure('unavailable', 'uncertain');
}

function uncertainRequestFailure() {
  return new AlertGroupRequestFailure('error', 'uncertain');
}

function rejectedMissingRequestFailure() {
  return new AlertGroupRequestFailure('missing', 'rejected');
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, reject, resolve };
}
