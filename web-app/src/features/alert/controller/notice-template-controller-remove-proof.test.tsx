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
  invalidFailure,
  missingFailure,
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

describe('Notice Template remove proof', () => {
  beforeEach(resetNoticeTemplateControllerTest);

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
});
