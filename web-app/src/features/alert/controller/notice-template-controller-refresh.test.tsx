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

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useNoticeTemplateController } from './notice-template-controller';
import { record, rejectedFailure, unavailableFailure } from './notice-template-controller-test-fixtures';

const refine = vi.hoisted(() => ({
  notification: vi.fn(),
  params: 'name=Mail&preset=false&pageIndex=1&pageSize=15',
  provider: vi.fn(),
  refetch: vi.fn(),
  setParams: vi.fn(),
  useDataProvider: vi.fn(),
  useList: vi.fn(),
  useNotification: vi.fn()
}));

vi.mock('@refinedev/core', () => ({
  useDataProvider: refine.useDataProvider,
  useList: refine.useList,
  useNotification: refine.useNotification
}));
vi.mock('./use-notice-template-action-capabilities', () => ({
  useNoticeTemplateActionCapabilities: () => ({ canCreate: true, canEdit: true, canDelete: true })
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(refine.params), refine.setParams]
}));

function resetNoticeTemplateControllerTest() {
  vi.clearAllMocks();
  refine.params = 'name=Mail&preset=false&pageIndex=1&pageSize=15';
  refine.provider.mockReturnValue({
    custom: vi.fn().mockResolvedValue({ data: { response: null } }),
    deleteOne: vi.fn().mockResolvedValue({ data: record }),
    getList: vi.fn(),
    getOne: vi.fn().mockResolvedValue({ data: record }),
    update: vi.fn().mockResolvedValue({ data: record })
  });
  refine.useDataProvider.mockReturnValue(refine.provider);
  refine.useNotification.mockReturnValue({ open: refine.notification });
  refine.useList.mockReturnValue(buildListResult());
  refine.refetch.mockResolvedValue({ data: { data: [record], total: 1 }, isError: false });
}

function buildListResult(override: { data?: (typeof record)[]; total?: number } = {}) {
  return {
    query: { error: null, isError: false, isFetching: false, isPending: false, refetch: refine.refetch },
    result: {
      data: override.data ?? [record],
      total: override.total ?? 1
    }
  };
}

describe('Notice Template refresh ownership', () => {
  beforeEach(resetNoticeTemplateControllerTest);

  it('allows create to be retried after a definite pre-commit rejection', async () => {
    const rejected = rejectedFailure();
    refine.provider.mockReturnValue({
      ...refine.provider(),
      custom: vi
        .fn()
        .mockRejectedValueOnce(rejected)
        .mockResolvedValueOnce({ data: { response: null } })
    });
    const { result } = renderHook(() => useNoticeTemplateController());
    const provider = refine.provider.mock.results.at(-1)?.value;

    act(() => result.current.create());
    act(() => {
      result.current.updateDraft({ name: 'New', content: '${content}' });
    });
    await act(async () => result.current.submit());
    await act(async () => result.current.submit());

    expect(provider.custom).toHaveBeenCalledTimes(2);
    expect(result.current.state.recovery).toBeNull();
    expect(result.current.state.draft).toBeNull();
  });

  it('does not leak query A refresh failure into a successful query B', async () => {
    refine.params = 'name=A&preset=false&pageIndex=0&pageSize=8';
    refine.refetch.mockResolvedValue({ isError: true, error: unavailableFailure() });
    const { result, rerender } = renderHook(() => useNoticeTemplateController());

    act(() => result.current.create());
    act(() => {
      result.current.updateDraft({ name: 'New', content: '${content}' });
    });
    await act(async () => result.current.submit());
    expect(result.current.state.list.kind).toBe('unavailable');

    refine.params = 'name=B&preset=false&pageIndex=0&pageSize=8';
    rerender();
    expect(result.current.state.list).toEqual({ kind: 'ready', records: [record], total: 1 });
  });

  it('clears a refresh failure across URL navigation without render-phase updates or Back revival', async () => {
    refine.params = 'name=A&preset=false&pageIndex=0&pageSize=8';
    refine.refetch.mockResolvedValue({ isError: true, error: unavailableFailure() });
    const { result, rerender } = renderHook(() => useNoticeTemplateController());

    act(() => result.current.create());
    act(() => {
      result.current.updateDraft({ name: 'New', content: '${content}' });
    });
    await act(async () => result.current.submit());
    expect(result.current.state.list.kind).toBe('unavailable');

    refine.params = 'name=B&preset=false&pageIndex=0&pageSize=8';
    rerender();
    expect(refine.useList).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: expect.arrayContaining([expect.objectContaining({ field: 'name', value: 'B' })])
      })
    );
    expect(result.current.state.list.kind).toBe('ready');

    refine.params = 'name=A&preset=false&pageIndex=0&pageSize=8';
    rerender();
    expect(refine.useList).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: expect.arrayContaining([expect.objectContaining({ field: 'name', value: 'A' })])
      })
    );
    expect(result.current.state.list.kind).toBe('ready');
  });

  it('clears refresh failure after an explicit retry succeeds in the same query', async () => {
    refine.refetch.mockResolvedValueOnce({ isError: true, error: unavailableFailure() });
    const { result } = renderHook(() => useNoticeTemplateController());

    act(() => result.current.create());
    act(() => {
      result.current.updateDraft({ name: 'New', content: '${content}' });
    });
    await act(async () => result.current.submit());
    expect(result.current.state.list.kind).toBe('unavailable');

    refine.refetch.mockResolvedValueOnce({ data: { data: [record], total: 1 }, isError: false });
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.state.list.kind).toBe('ready'));
  });
});
