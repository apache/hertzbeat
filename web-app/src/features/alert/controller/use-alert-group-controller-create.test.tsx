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

import { ApiMessageError } from '@/core/http/api-message';

import { normalizeAlertGroupApiFailure } from '../api/alert-group-api-failure';
import { AlertGroupRequestFailure, type AlertGroupQuery } from '../model/alert-group-model';

import {
  api,
  notify,
  page,
  persisted,
  proofPage,
  renderController,
  resetAlertGroupControllerFixture,
  unavailableRequestFailure,
  uncertainRequestFailure
} from './use-alert-group-controller-test-support';

describe('Alert Group controller create proof', () => {
  beforeEach(resetAlertGroupControllerFixture);

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

  it.each(['create', 'update'] as const)(
    'keeps a code=1 rejected %s editor retryable without GET-only recovery',
    async kind => {
      const { result } = renderController();
      await waitFor(() => expect(result.current.state.list.kind).toBe('empty'));
      const rejected = normalizeAlertGroupApiFailure(new ApiMessageError('private', { code: 1, status: 200 }));
      if (kind === 'create') {
        api.loadAlertGroups.mockResolvedValueOnce(proofPage([], 0));
        act(() => result.current.create());
        act(() => result.current.updateDraft({ name: 'New', groupLabels: ['service'] }));
      } else {
        await act(async () => result.current.edit(7));
      }
      api.saveAlertGroup.mockRejectedValue(rejected);

      await act(async () => result.current.submit());

      expect(result.current.state.draft).toMatchObject(kind === 'create' ? { name: 'New' } : { id: 7 });
      expect(result.current.state.createAcknowledged).toBe(false);
      expect(result.current.state.editorFailure).toBe('error');
      expect(result.current.state.recovery).toBeUndefined();
      expect(api.saveAlertGroup).toHaveBeenCalledOnce();

      if (kind === 'create') api.loadAlertGroups.mockResolvedValueOnce(proofPage([], 0));
      await act(async () => result.current.submit());
      expect(api.saveAlertGroup).toHaveBeenCalledTimes(2);
      expect(result.current.state.createAcknowledged).toBe(false);
      expect(result.current.state.recovery).toBeUndefined();
    }
  );

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
});
