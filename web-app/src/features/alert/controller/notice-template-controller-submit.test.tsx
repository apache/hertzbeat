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

import { noticeTemplateCreateActionUrl } from '../api/notice-template-resource';
import { useNoticeTemplateController } from './notice-template-controller';
import { anotherRecord, deferred, missingFailure, record } from './notice-template-controller-test-fixtures';

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

describe('Notice Template submit ownership', () => {
  beforeEach(resetNoticeTemplateControllerTest);

  it('accepts one resolved POST without create inference and then refreshes the list', async () => {
    const { result } = renderHook(() => useNoticeTemplateController());
    const provider = refine.provider.mock.results[0]?.value;
    act(() => result.current.create());
    act(() => {
      result.current.updateDraft({ name: 'New', content: '${content}' });
    });
    await act(async () => result.current.submit());

    expect(provider.custom).toHaveBeenCalledWith({
      url: noticeTemplateCreateActionUrl,
      method: 'post',
      payload: { name: 'New', type: 1, content: '${content}' }
    });
    expect(provider.getList).not.toHaveBeenCalled();
    expect(provider.getOne).not.toHaveBeenCalled();
    expect(refine.refetch).toHaveBeenCalledTimes(1);
    expect(result.current.state.draft).toBeNull();
    expect(refine.notification).toHaveBeenCalledWith({ message: 'noticeTemplates.saveSuccess', type: 'success' });
  });

  it('admits only one same-tick submit write', async () => {
    const write = deferred<{ data: { response: null } }>();
    refine.provider.mockReturnValue({
      ...refine.provider(),
      custom: vi.fn().mockReturnValue(write.promise)
    });
    const { result } = renderHook(() => useNoticeTemplateController());
    const provider = refine.provider.mock.results.at(-1)?.value;
    act(() => result.current.create());
    act(() => {
      result.current.updateDraft({ name: 'New', content: '${content}' });
    });

    let first: Promise<void> | undefined;
    let second: Promise<void> | undefined;
    act(() => {
      first = result.current.submit();
      second = result.current.submit();
    });

    expect(provider.custom).toHaveBeenCalledTimes(1);
    write.resolve({ data: { response: null } });
    await act(async () => Promise.all([first, second]));
  });

  it('does not let create or close supersede an in-flight submit', async () => {
    const write = deferred<{ data: { response: null } }>();
    refine.provider.mockReturnValue({
      ...refine.provider(),
      custom: vi.fn().mockReturnValue(write.promise)
    });
    const { result } = renderHook(() => useNoticeTemplateController());
    act(() => result.current.create());
    act(() => {
      result.current.updateDraft({ name: 'Old', content: '${content}' });
    });

    let saving: Promise<void> | undefined;
    act(() => {
      saving = result.current.submit();
      result.current.create();
      result.current.closeDraft();
    });
    expect(result.current.state.draft).toMatchObject({ name: 'Old' });
    write.resolve({ data: { response: null } });
    await act(async () => saving);

    expect(result.current.state.draft).toBeNull();
    expect(refine.refetch).toHaveBeenCalledTimes(1);
    expect(refine.notification).toHaveBeenCalledWith({
      message: 'noticeTemplates.saveSuccess',
      type: 'success'
    });
  });

  it('retires an in-flight submit when the controller unmounts', async () => {
    const write = deferred<{ data: { response: null } }>();
    refine.provider.mockReturnValue({
      ...refine.provider(),
      custom: vi.fn().mockReturnValue(write.promise)
    });
    const { result, unmount } = renderHook(() => useNoticeTemplateController());
    act(() => result.current.create());
    act(() => {
      result.current.updateDraft({ name: 'New', content: '${content}' });
    });

    let saving: Promise<void> | undefined;
    act(() => {
      saving = result.current.submit();
    });
    unmount();
    write.resolve({ data: { response: null } });
    await act(async () => saving);

    expect(refine.refetch).not.toHaveBeenCalled();
    expect(refine.notification).not.toHaveBeenCalled();
  });

  it('admits only one same-tick remove write', async () => {
    const deletion = deferred<{ data: typeof record }>();
    const missing = missingFailure();
    refine.provider.mockReturnValue({
      ...refine.provider(),
      deleteOne: vi.fn().mockReturnValue(deletion.promise),
      getOne: vi.fn().mockResolvedValueOnce({ data: record }).mockRejectedValueOnce(missing)
    });
    const { result } = renderHook(() => useNoticeTemplateController());
    const provider = refine.provider.mock.results.at(-1)?.value;

    let first: Promise<void> | undefined;
    let second: Promise<void> | undefined;
    act(() => {
      first = result.current.remove(record);
      second = result.current.remove(record);
    });

    expect(provider.getOne).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(provider.deleteOne).toHaveBeenCalledTimes(1));
    deletion.resolve({ data: record });
    await act(async () => Promise.all([first, second]));
  });

  it('keeps remove ownership when create, edit, or another remove is requested', async () => {
    const deletion = deferred<{ data: typeof record }>();
    const missing = missingFailure();
    refine.provider.mockReturnValue({
      ...refine.provider(),
      deleteOne: vi.fn().mockReturnValue(deletion.promise),
      getOne: vi.fn().mockResolvedValueOnce({ data: record }).mockRejectedValueOnce(missing)
    });
    const { result } = renderHook(() => useNoticeTemplateController());
    act(() => {
      result.current.create();
    });

    let removing: Promise<void> | undefined;
    act(() => {
      removing = result.current.remove(record);
      result.current.create();
      result.current.closeDraft();
      void result.current.edit(anotherRecord);
      void result.current.remove(anotherRecord);
    });
    expect(result.current.state.draft).toEqual({ name: '', type: 1, content: '' });
    deletion.resolve({ data: record });
    await act(async () => removing);

    const provider = refine.provider.mock.results.at(-1)?.value;
    expect(result.current.state.draft).toEqual({ name: '', type: 1, content: '' });
    expect(provider.getOne).toHaveBeenCalledTimes(2);
    expect(provider.deleteOne).toHaveBeenCalledTimes(1);
    expect(refine.refetch).toHaveBeenCalledTimes(1);
    expect(refine.notification).toHaveBeenCalledWith({
      message: 'noticeTemplates.deleteSuccess',
      type: 'success'
    });
  });

  it('updates and deletes only after provider proof plus authoritative list refetch', async () => {
    const missing = missingFailure();
    refine.provider.mockReturnValue({
      ...refine.provider(),
      getOne: vi
        .fn()
        .mockResolvedValueOnce({ data: record })
        .mockResolvedValueOnce({ data: { ...record, name: 'Updated' } })
        .mockResolvedValueOnce({ data: record })
        .mockRejectedValueOnce(missing)
    });
    const { result } = renderHook(() => useNoticeTemplateController());
    const provider = refine.provider.mock.results.at(-1)?.value;

    await act(async () => result.current.edit(record));
    act(() => {
      result.current.updateDraft({ name: 'Updated' });
    });
    await act(async () => result.current.submit());
    await act(async () => result.current.remove(record));

    expect(provider.update).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'notice-templates',
        id: 42
      })
    );
    expect(provider.deleteOne).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'notice-templates',
        id: 42
      })
    );
    expect(refine.refetch).toHaveBeenCalledTimes(2);
  });
});
