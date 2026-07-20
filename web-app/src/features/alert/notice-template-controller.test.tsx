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
import { NoticeTemplateRequestFailure } from './model/notice-template-failure';
import { noticeTemplateResourceRecord } from './notice-template-model';
import { noticeTemplateCreateActionUrl } from './notice-template-resource';

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

const record = noticeTemplateResourceRecord({
  id: 42,
  name: 'Custom',
  type: 1,
  preset: false,
  content: '${content}'
});
const anotherRecord = noticeTemplateResourceRecord({
  id: 43,
  name: 'Another',
  type: 1,
  preset: false,
  content: '${another}'
});
const preset = noticeTemplateResourceRecord({
  name: 'Built-in',
  type: 1,
  preset: true,
  content: '${content}'
});

describe('Notice Template controller', () => {
  beforeEach(() => {
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
  });

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

  it('keeps an out-of-range empty page honest when the query still has results', () => {
    refine.useList.mockReturnValue(buildListResult({ data: [], total: 5 }));
    const { result } = renderHook(() => useNoticeTemplateController());

    expect(result.current.state.list).toEqual({ kind: 'ready', records: [], total: 5 });
  });

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

  it('retires a confirmed create and retries only its unavailable list projection', async () => {
    refine.refetch
      .mockResolvedValueOnce({ isError: true, error: unavailableFailure() })
      .mockResolvedValueOnce({ data: { data: [record], total: 1 }, isError: false });
    const { result } = renderHook(() => useNoticeTemplateController());
    const provider = refine.provider.mock.results.at(-1)?.value;

    act(() => result.current.create());
    act(() => {
      result.current.updateDraft({ name: 'New', content: '${content}' });
    });
    await act(async () => result.current.submit());

    expect(result.current.state.draft).toBeNull();
    expect(result.current.state.list.kind).toBe('unavailable');
    expect(result.current.state.recovery).toEqual({ stage: 'projection' });
    expect(refine.notification).toHaveBeenCalledWith({ message: 'noticeTemplates.saveSuccess', type: 'success' });

    await act(async () => result.current.submit());
    await act(async () => result.current.retryRecovery());

    expect(provider.custom).toHaveBeenCalledTimes(1);
    expect(refine.refetch).toHaveBeenCalledTimes(2);
    expect(result.current.state.recovery).toBeNull();
    expect(result.current.state.list.kind).toBe('ready');
  });

  it('retries update proof after a confirmed PUT without repeating the mutation', async () => {
    const unavailable = unavailableFailure();
    const updated = { ...record, name: 'Updated' };
    refine.provider.mockReturnValue({
      ...refine.provider(),
      getOne: vi
        .fn()
        .mockResolvedValueOnce({ data: record })
        .mockRejectedValueOnce(unavailable)
        .mockResolvedValueOnce({ data: updated })
    });
    const { result } = renderHook(() => useNoticeTemplateController());
    const provider = refine.provider.mock.results.at(-1)?.value;

    await act(async () => result.current.edit(record));
    act(() => {
      result.current.updateDraft({ name: 'Updated' });
    });
    await act(async () => result.current.submit());

    expect(result.current.state.recovery).toMatchObject({ stage: 'update-proof', draft: { id: 42, name: 'Updated' } });
    expect(provider.update).toHaveBeenCalledTimes(1);
    expect(refine.refetch).not.toHaveBeenCalled();

    await act(async () => result.current.retryRecovery());

    expect(provider.update).toHaveBeenCalledTimes(1);
    expect(provider.getOne).toHaveBeenCalledTimes(3);
    expect(refine.refetch).toHaveBeenCalledTimes(1);
    expect(result.current.state.recovery).toBeNull();
    expect(result.current.state.draft).toBeNull();
  });

  it.each([
    ['server error', unavailableFailure()],
    ['malformed success response', invalidFailure()]
  ])('proves an ambiguous PUT %s without repeating the mutation', async (_name, ambiguous) => {
    refine.provider.mockReturnValue({
      ...refine.provider(),
      getOne: vi
        .fn()
        .mockResolvedValueOnce({ data: record })
        .mockResolvedValueOnce({ data: { ...record, name: 'Updated' } }),
      update: vi.fn().mockRejectedValue(ambiguous)
    });
    const { result } = renderHook(() => useNoticeTemplateController());
    const provider = refine.provider.mock.results.at(-1)?.value;

    await act(async () => result.current.edit(record));
    act(() => {
      result.current.updateDraft({ name: 'Updated' });
    });
    await act(async () => result.current.submit());

    expect(provider.update).toHaveBeenCalledTimes(1);
    expect(provider.getOne).toHaveBeenCalledTimes(2);
    expect(refine.refetch).toHaveBeenCalledTimes(1);
    expect(result.current.state.recovery).toBeNull();
    expect(result.current.state.draft).toBeNull();
  });

  it('keeps an ambiguous PUT in proof recovery when exact detail is unavailable', async () => {
    const ambiguous = unavailableFailure();
    const unavailable = unavailableFailure();
    refine.provider.mockReturnValue({
      ...refine.provider(),
      getOne: vi
        .fn()
        .mockResolvedValueOnce({ data: record })
        .mockRejectedValueOnce(unavailable)
        .mockResolvedValueOnce({ data: { ...record, name: 'Updated' } }),
      update: vi.fn().mockRejectedValue(ambiguous)
    });
    const { result } = renderHook(() => useNoticeTemplateController());
    const provider = refine.provider.mock.results.at(-1)?.value;

    await act(async () => result.current.edit(record));
    act(() => {
      result.current.updateDraft({ name: 'Updated' });
    });
    await act(async () => result.current.submit());

    expect(result.current.state.recovery).toMatchObject({ stage: 'update-proof', draft: { id: 42 } });
    expect(provider.update).toHaveBeenCalledTimes(1);
    expect(refine.refetch).not.toHaveBeenCalled();
    await act(async () => result.current.retryRecovery());

    expect(provider.update).toHaveBeenCalledTimes(1);
    expect(provider.getOne).toHaveBeenCalledTimes(3);
    expect(refine.refetch).toHaveBeenCalledTimes(1);
    expect(result.current.state.recovery).toBeNull();
  });

  it('releases an update receipt after a definite rejection so PUT can be corrected and retried', async () => {
    const rejected = rejectedFailure();
    refine.provider.mockReturnValue({
      ...refine.provider(),
      getOne: vi
        .fn()
        .mockResolvedValueOnce({ data: record })
        .mockResolvedValueOnce({ data: { ...record, name: 'Updated' } }),
      update: vi.fn().mockRejectedValueOnce(rejected).mockResolvedValueOnce({ data: record })
    });
    const { result } = renderHook(() => useNoticeTemplateController());
    const provider = refine.provider.mock.results.at(-1)?.value;

    await act(async () => result.current.edit(record));
    act(() => {
      result.current.updateDraft({ name: 'Updated' });
    });
    await act(async () => result.current.submit());
    expect(result.current.state.recovery).toBeNull();

    await act(async () => result.current.submit());

    expect(provider.update).toHaveBeenCalledTimes(2);
    expect(refine.refetch).toHaveBeenCalledTimes(1);
    expect(result.current.state.draft).toBeNull();
  });

  it('retires a proof-only retry when the controller unmounts', async () => {
    const unavailable = unavailableFailure();
    const proof = deferred<{ data: typeof record }>();
    refine.provider.mockReturnValue({
      ...refine.provider(),
      getOne: vi
        .fn()
        .mockResolvedValueOnce({ data: record })
        .mockRejectedValueOnce(unavailable)
        .mockReturnValueOnce(proof.promise)
    });
    const { result, unmount } = renderHook(() => useNoticeTemplateController());

    await act(async () => result.current.edit(record));
    act(() => {
      result.current.updateDraft({ name: 'Updated' });
    });
    await act(async () => result.current.submit());
    refine.notification.mockClear();

    let retrying: Promise<void> | undefined;
    act(() => {
      retrying = result.current.retryRecovery();
    });
    unmount();
    proof.resolve({ data: { ...record, name: 'Updated' } });
    await act(async () => retrying);

    expect(refine.notification).not.toHaveBeenCalled();
    expect(refine.refetch).not.toHaveBeenCalled();
  });

  it('retires a canonically confirmed update when its list projection contract fails', async () => {
    refine.refetch
      .mockResolvedValueOnce({
        isError: true,
        error: invalidFailure()
      })
      .mockResolvedValueOnce({ data: { data: [record], total: 1 }, isError: false });
    refine.provider.mockReturnValue({
      ...refine.provider(),
      getOne: vi
        .fn()
        .mockResolvedValueOnce({ data: record })
        .mockResolvedValueOnce({ data: { ...record, name: 'Updated' } })
    });
    const { result } = renderHook(() => useNoticeTemplateController());
    const provider = refine.provider.mock.results.at(-1)?.value;

    await act(async () => result.current.edit(record));
    act(() => {
      result.current.updateDraft({ name: 'Updated' });
    });
    await act(async () => result.current.submit());

    expect(result.current.state.draft).toBeNull();
    expect(result.current.state.list.kind).toBe('error');
    expect(result.current.state.recovery).toEqual({ stage: 'projection' });
    expect(refine.notification).toHaveBeenCalledWith({ message: 'noticeTemplates.saveSuccess', type: 'success' });

    await act(async () => result.current.retryRecovery());

    expect(provider.update).toHaveBeenCalledTimes(1);
    expect(provider.getOne).toHaveBeenCalledTimes(2);
    expect(refine.refetch).toHaveBeenCalledTimes(2);
    expect(result.current.state.recovery).toBeNull();
  });

  it('retries exact missing-detail proof after a confirmed DELETE without repeating the mutation', async () => {
    const unavailable = unavailableFailure();
    const missing = missingFailure();
    refine.provider.mockReturnValue({
      ...refine.provider(),
      getOne: vi
        .fn()
        .mockResolvedValueOnce({ data: record })
        .mockRejectedValueOnce(unavailable)
        .mockRejectedValueOnce(missing)
    });
    const { result } = renderHook(() => useNoticeTemplateController());
    const provider = refine.provider.mock.results.at(-1)?.value;

    await act(async () => result.current.remove(record));

    expect(result.current.state.recovery).toMatchObject({ stage: 'delete-proof', id: 42 });
    expect(provider.deleteOne).toHaveBeenCalledTimes(1);
    expect(refine.refetch).not.toHaveBeenCalled();

    await act(async () => result.current.retryRecovery());

    expect(provider.deleteOne).toHaveBeenCalledTimes(1);
    expect(provider.getOne).toHaveBeenCalledTimes(3);
    expect(refine.refetch).toHaveBeenCalledTimes(1);
    expect(result.current.state.recovery).toBeNull();
  });

  it.each([
    ['server error', unavailableFailure()],
    ['malformed success response', invalidFailure()]
  ])('proves an ambiguous DELETE %s without repeating the mutation', async (_name, ambiguous) => {
    const missing = missingFailure();
    refine.provider.mockReturnValue({
      ...refine.provider(),
      deleteOne: vi.fn().mockRejectedValue(ambiguous),
      getOne: vi.fn().mockResolvedValueOnce({ data: record }).mockRejectedValueOnce(missing)
    });
    const { result } = renderHook(() => useNoticeTemplateController());
    const provider = refine.provider.mock.results.at(-1)?.value;

    await act(async () => result.current.remove(record));

    expect(provider.deleteOne).toHaveBeenCalledTimes(1);
    expect(provider.getOne).toHaveBeenCalledTimes(2);
    expect(refine.refetch).toHaveBeenCalledTimes(1);
    expect(result.current.state.recovery).toBeNull();
  });

  it('keeps an ambiguous DELETE in missing-proof recovery without repeating the mutation', async () => {
    const ambiguous = unavailableFailure();
    const unavailable = unavailableFailure();
    const missing = missingFailure();
    refine.provider.mockReturnValue({
      ...refine.provider(),
      deleteOne: vi.fn().mockRejectedValue(ambiguous),
      getOne: vi
        .fn()
        .mockResolvedValueOnce({ data: record })
        .mockRejectedValueOnce(unavailable)
        .mockRejectedValueOnce(missing)
    });
    const { result } = renderHook(() => useNoticeTemplateController());
    const provider = refine.provider.mock.results.at(-1)?.value;

    await act(async () => result.current.remove(record));

    expect(result.current.state.recovery).toMatchObject({ stage: 'delete-proof', id: 42 });
    expect(provider.deleteOne).toHaveBeenCalledTimes(1);
    expect(refine.refetch).not.toHaveBeenCalled();
    await act(async () => result.current.retryRecovery());

    expect(provider.deleteOne).toHaveBeenCalledTimes(1);
    expect(provider.getOne).toHaveBeenCalledTimes(3);
    expect(refine.refetch).toHaveBeenCalledTimes(1);
    expect(result.current.state.recovery).toBeNull();
  });

  it('retries a failed delete preflight without claiming that DELETE was submitted', async () => {
    const unavailable = unavailableFailure();
    const missing = missingFailure();
    refine.provider.mockReturnValue({
      ...refine.provider(),
      getOne: vi
        .fn()
        .mockRejectedValueOnce(unavailable)
        .mockResolvedValueOnce({ data: record })
        .mockRejectedValueOnce(missing)
    });
    const { result } = renderHook(() => useNoticeTemplateController());
    const provider = refine.provider.mock.results.at(-1)?.value;

    await act(async () => result.current.remove(record));
    expect(provider.deleteOne).not.toHaveBeenCalled();
    expect(result.current.state.recovery).toBeNull();

    await act(async () => result.current.remove(record));

    expect(provider.deleteOne).toHaveBeenCalledTimes(1);
    expect(provider.getOne).toHaveBeenCalledTimes(3);
    expect(refine.refetch).toHaveBeenCalledTimes(1);
  });

  it('releases a delete receipt after a definite rejection so DELETE can be retried', async () => {
    const rejected = rejectedFailure();
    const missing = missingFailure();
    refine.provider.mockReturnValue({
      ...refine.provider(),
      deleteOne: vi.fn().mockRejectedValueOnce(rejected).mockResolvedValueOnce({ data: record }),
      getOne: vi
        .fn()
        .mockResolvedValueOnce({ data: record })
        .mockResolvedValueOnce({ data: record })
        .mockRejectedValueOnce(missing)
    });
    const { result } = renderHook(() => useNoticeTemplateController());
    const provider = refine.provider.mock.results.at(-1)?.value;

    await act(async () => result.current.remove(record));
    expect(result.current.state.recovery).toBeNull();

    await act(async () => result.current.remove(record));

    expect(provider.deleteOne).toHaveBeenCalledTimes(2);
    expect(provider.getOne).toHaveBeenCalledTimes(3);
    expect(refine.refetch).toHaveBeenCalledTimes(1);
  });

  it('does not repeat a confirmed delete when only its list projection fails', async () => {
    const missing = missingFailure();
    refine.refetch
      .mockResolvedValueOnce({ isError: true, error: unavailableFailure() })
      .mockResolvedValueOnce({ data: { data: [], total: 0 }, isError: false });
    refine.provider.mockReturnValue({
      ...refine.provider(),
      getOne: vi.fn().mockResolvedValueOnce({ data: record }).mockRejectedValue(missing)
    });
    const { result } = renderHook(() => useNoticeTemplateController());
    const provider = refine.provider.mock.results.at(-1)?.value;

    await act(async () => result.current.remove(record));

    expect(result.current.state.list.kind).toBe('unavailable');
    expect(result.current.state.recovery).toEqual({ stage: 'projection' });
    expect(refine.notification).toHaveBeenCalledWith({ message: 'noticeTemplates.deleteSuccess', type: 'success' });

    await act(async () => result.current.remove(record));
    await act(async () => result.current.retryRecovery());
    await act(async () => result.current.remove(record));

    expect(provider.deleteOne).toHaveBeenCalledTimes(1);
    expect(provider.getOne).toHaveBeenCalledTimes(2);
    expect(refine.refetch).toHaveBeenCalledTimes(2);
    expect(result.current.state.recovery).toBeNull();
  });

  it.each([
    ['network', unavailableFailure()],
    ['server error', unavailableFailure()],
    ['malformed success response', invalidFailure()]
  ])('locks an ambiguous create after %s without replaying POST', async (_name, ambiguous) => {
    refine.provider.mockReturnValue({
      ...refine.provider(),
      custom: vi.fn().mockRejectedValue(ambiguous)
    });
    const { result } = renderHook(() => useNoticeTemplateController());
    const provider = refine.provider.mock.results.at(-1)?.value;

    act(() => result.current.create());
    act(() => {
      result.current.updateDraft({ name: 'New', content: '${content}' });
    });
    await act(async () => result.current.submit());

    expect(result.current.state.draft).toMatchObject({ name: 'New' });
    expect(result.current.state.recovery).toMatchObject({ stage: 'commit-uncertain', draft: { name: 'New' } });
    expect(refine.refetch).not.toHaveBeenCalled();

    await act(async () => result.current.submit());
    await act(async () => result.current.retryRecovery());

    expect(provider.custom).toHaveBeenCalledTimes(1);
    expect(refine.refetch).not.toHaveBeenCalled();
  });

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

function missingFailure() {
  return new NoticeTemplateRequestFailure('missing', 'rejected', {
    code: 'NOTICE_TEMPLATE_NOT_FOUND'
  });
}

function unavailableFailure() {
  return new NoticeTemplateRequestFailure('unavailable', 'uncertain');
}

function invalidFailure() {
  return new NoticeTemplateRequestFailure('invalid', 'uncertain', {
    code: 'NOTICE_TEMPLATE_RESPONSE_INVALID'
  });
}

function rejectedFailure() {
  return new NoticeTemplateRequestFailure('invalid', 'rejected', {
    code: 'NOTICE_TEMPLATE_VARIABLES_INVALID'
  });
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}
