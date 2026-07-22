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

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useNoticeTemplateController } from './notice-template-controller';
import {
  deferred,
  invalidFailure,
  record,
  rejectedFailure,
  unavailableFailure
} from './notice-template-controller-test-fixtures';

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
      total: override.total ?? 1
    }
  };
}

describe('Notice Template update proof', () => {
  beforeEach(resetNoticeTemplateControllerTest);

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
});
