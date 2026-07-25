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
import { anotherRecord, deferred, preset, record } from './notice-template-controller-test-fixtures';

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
      total: override.total ?? 16
    }
  };
}

describe('Notice Template list and detail reads', () => {
  beforeEach(resetNoticeTemplateControllerTest);

  it('maps URL query and pagination into the named Refine list', () => {
    const { result } = renderHook(() => useNoticeTemplateController());

    expect(refine.useList).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'notice-templates',
        dataProviderName: 'notice-templates',
        pagination: { currentPage: 2, pageSize: 15, mode: 'server' }
      })
    );
    expect(result.current.state.query).toEqual({ name: 'Mail', preset: false, pageIndex: 1, pageSize: 15 });
    act(() => result.current.changePage(3, 25));
    expect(refine.setParams).toHaveBeenCalledWith(
      expect.objectContaining({
        get: expect.any(Function)
      })
    );
    expect((refine.setParams.mock.calls[0]?.[0] as URLSearchParams).toString()).toBe(
      'name=Mail&preset=false&pageIndex=2&pageSize=25'
    );
  });

  it('discards a local search draft whenever Back or Forward restores URL search', () => {
    refine.params = 'name=A&preset=false&pageIndex=0&pageSize=8';
    const { result, rerender } = renderHook(() => useNoticeTemplateController());

    act(() => result.current.setName('B'));
    expect(result.current.state.name).toBe('B');

    refine.params = 'name=C&preset=false&pageIndex=0&pageSize=8';
    rerender();
    expect(result.current.state.name).toBe('C');

    refine.params = 'name=A&preset=false&pageIndex=0&pageSize=8';
    rerender();
    expect(result.current.state.name).toBe('A');
  });

  it('guards preset commands before any provider call', async () => {
    const { result } = renderHook(() => useNoticeTemplateController());
    const provider = refine.provider.mock.results[0]?.value;

    await act(async () => result.current.edit(preset));
    await act(async () => result.current.remove(preset));

    expect(provider.getOne).not.toHaveBeenCalled();
    expect(provider.deleteOne).not.toHaveBeenCalled();
  });

  it('deduplicates same-tick detail reads for the same template', async () => {
    const detail = deferred<{ data: typeof record }>();
    refine.provider.mockReturnValue({
      ...refine.provider(),
      getOne: vi.fn().mockReturnValue(detail.promise)
    });
    const { result } = renderHook(() => useNoticeTemplateController());
    const provider = refine.provider.mock.results.at(-1)?.value;

    let first: Promise<void> | undefined;
    let second: Promise<void> | undefined;
    act(() => {
      first = result.current.edit(record);
      second = result.current.edit(record);
    });

    expect(provider.getOne).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    detail.resolve({ data: record });
    await act(async () => Promise.all([first, second]));
  });

  it('lets only the latest template identity publish its detail', async () => {
    const first = deferred<{ data: typeof record }>();
    const second = deferred<{ data: typeof anotherRecord }>();
    refine.provider.mockReturnValue({
      ...refine.provider(),
      getOne: vi.fn(({ id }: { id: number }) => (id === 42 ? first.promise : second.promise))
    });
    const { result } = renderHook(() => useNoticeTemplateController());

    let firstEdit: Promise<void> | undefined;
    let secondEdit: Promise<void> | undefined;
    act(() => {
      firstEdit = result.current.edit(record);
      secondEdit = result.current.edit(anotherRecord);
    });
    second.resolve({ data: anotherRecord });
    await act(async () => secondEdit);
    first.resolve({ data: record });
    await act(async () => firstEdit);

    expect(result.current.state.draft).toMatchObject({ id: 43, name: 'Another' });
  });

  it.each([
    ['create', (controller: ReturnType<typeof useNoticeTemplateController>) => controller.create()],
    ['close', (controller: ReturnType<typeof useNoticeTemplateController>) => controller.closeDraft()]
  ])('%s retires a pending detail owner before it can publish', async (_name, retire) => {
    const detail = deferred<{ data: typeof record }>();
    refine.provider.mockReturnValue({
      ...refine.provider(),
      getOne: vi.fn().mockReturnValue(detail.promise)
    });
    const { result } = renderHook(() => useNoticeTemplateController());

    let editing: Promise<void> | undefined;
    act(() => {
      editing = result.current.edit(record);
      retire(result.current);
    });
    detail.resolve({ data: record });
    await act(async () => editing);

    if (_name === 'create') expect(result.current.state.draft).toEqual({ name: '', type: 1, content: '' });
    else expect(result.current.state.draft).toBeNull();
  });

  it('returns an out-of-range template page to the last authoritative result page', async () => {
    refine.useList.mockReturnValue(buildListResult({ data: [], total: 5 }));
    const { result } = renderHook(() => useNoticeTemplateController());

    expect(result.current.state.list).toEqual({ kind: 'ready', records: [], total: 5 });
    await waitFor(() => expect(refine.setParams).toHaveBeenCalled());
    const corrected = refine.setParams.mock.calls.at(-1)?.[0] as URLSearchParams;
    expect(corrected.toString()).toBe('name=Mail&preset=false&pageIndex=0&pageSize=15');
  });

  it('returns an authoritative empty template page to the first page', async () => {
    refine.useList.mockReturnValue(buildListResult({ data: [], total: 0 }));
    const { result } = renderHook(() => useNoticeTemplateController());

    expect(result.current.state.list).toEqual({ kind: 'empty' });
    await waitFor(() => expect(refine.setParams).toHaveBeenCalled());
    const corrected = refine.setParams.mock.calls.at(-1)?.[0] as URLSearchParams;
    expect(corrected.toString()).toBe('name=Mail&preset=false&pageIndex=0&pageSize=15');
  });
});
