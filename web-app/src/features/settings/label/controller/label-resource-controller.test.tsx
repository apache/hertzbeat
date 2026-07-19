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

import type { LabelRecord } from '../model/label-model';
import { useLabelResourceController } from './label-resource-controller';

const refine = vi.hoisted(() => ({
  createMutate: vi.fn(),
  clipboardWrite: vi.fn(),
  deleteMutate: vi.fn(),
  notificationOpen: vi.fn(),
  refetch: vi.fn(),
  updateMutate: vi.fn(),
  useCreate: vi.fn(),
  useDelete: vi.fn(),
  useList: vi.fn(),
  useNotification: vi.fn(),
  useUpdate: vi.fn()
}));
const router = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock('@refinedev/core', () => ({
  useCreate: refine.useCreate,
  useDelete: refine.useDelete,
  useList: refine.useList,
  useNotification: refine.useNotification,
  useUpdate: refine.useUpdate
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router-dom', () => ({ useNavigate: () => router.navigate }));

const serverLabel: LabelRecord = {
  id: 7,
  name: 'env',
  tagValue: 'prod',
  description: 'Server canonical'
};

describe('Label resource controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refine.useCreate.mockReturnValue({ mutate: refine.createMutate, mutation: { isPending: false } });
    refine.useUpdate.mockReturnValue({ mutate: refine.updateMutate, mutation: { isPending: false } });
    refine.useDelete.mockReturnValue({ mutate: refine.deleteMutate, mutation: { isPending: false } });
    refine.useNotification.mockReturnValue({ open: refine.notificationOpen });
    refine.useList.mockReturnValue(buildListResult({ data: [serverLabel], total: 1 }));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: refine.clipboardWrite.mockResolvedValue(undefined) }
    });
  });

  it('uses the named Label provider and translates the canonical URL query', () => {
    renderHook(() => useLabelResourceController({ search: 'env', pageIndex: 2, pageSize: 50 }));

    expect(refine.useList).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'labels',
        dataProviderName: 'labels',
        pagination: { currentPage: 3, pageSize: 50, mode: 'server' },
        filters: [{ field: 'search', operator: 'contains', value: 'env' }]
      })
    );
  });

  it('uses pessimistic canonical mutations and passes the full selected row to delete', () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));

    act(() => result.current.createLabel({ name: 'team', tagValue: 'platform' }, onSuccess));
    act(() => result.current.updateLabel(serverLabel, { id: 99, description: 'Updated' }, onSuccess));
    act(() => result.current.deleteLabel(serverLabel));

    expect(refine.createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'labels',
        dataProviderName: 'labels',
        invalidates: ['list'],
        values: { name: 'team', tagValue: 'platform' }
      }),
      expect.objectContaining({ onSuccess })
    );
    expect(refine.updateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 7,
        resource: 'labels',
        dataProviderName: 'labels',
        invalidates: ['list'],
        mutationMode: 'pessimistic',
        values: { ...serverLabel, description: 'Updated' }
      }),
      expect.objectContaining({ onSuccess })
    );
    const deleteParams = refine.deleteMutate.mock.calls[0]?.[0];
    expect(deleteParams).toEqual(
      expect.objectContaining({
        id: 7,
        resource: 'labels',
        dataProviderName: 'labels',
        invalidates: ['list'],
        mutationMode: 'pessimistic',
        values: serverLabel
      })
    );
    expect(deleteParams.successNotification()).toEqual({ message: 'labels.deleteSuccess', type: 'success' });
    expect(deleteParams.errorNotification()).toEqual({ message: 'labels.deleteFailed', type: 'error' });
  });

  it('provides existing localized success and backend error notifications', () => {
    renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));

    const createOptions = refine.useCreate.mock.calls[0]?.[0];
    const updateOptions = refine.useUpdate.mock.calls[0]?.[0];
    expect(createOptions?.successNotification?.()).toEqual({ message: 'labels.saveSuccess', type: 'success' });
    expect(createOptions?.errorNotification?.()).toEqual({ message: 'labels.saveFailed', type: 'error' });
    expect(updateOptions?.successNotification?.()).toEqual({ message: 'labels.saveSuccess', type: 'success' });
    expect(updateOptions?.errorNotification?.()).toEqual({ message: 'labels.saveFailed', type: 'error' });
  });

  it.each([
    [true, false, true, true],
    [false, true, true, true],
    [false, false, true, false]
  ])('aggregates only create/update pending as saving', (createPending, updatePending, deletePending, expected) => {
    refine.useCreate.mockReturnValue({ mutate: refine.createMutate, mutation: { isPending: createPending } });
    refine.useUpdate.mockReturnValue({ mutate: refine.updateMutate, mutation: { isPending: updatePending } });
    refine.useDelete.mockReturnValue({ mutate: refine.deleteMutate, mutation: { isPending: deletePending } });

    const { result } = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));

    expect(result.current.isSaving).toBe(expected);
  });

  it.each([
    ['loading', { isPending: true }],
    ['unavailable', { isError: true, error: { statusCode: 0 } }],
    ['unavailable', { isError: true, error: { statusCode: 502 } }],
    ['unavailable', { isError: true, error: { statusCode: 503 } }],
    ['unavailable', { isError: true, error: { statusCode: 504 } }],
    ['error', { isError: true, error: { statusCode: 400, kind: 'envelope' } }],
    ['error', { isError: true, error: { statusCode: 500 } }],
    ['empty', { result: { data: [], total: 0 } }]
  ])('maps list evidence to the %s state without fake records', (kind, override) => {
    refine.useList.mockReturnValue(buildListResult(override));

    const { result } = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));

    expect(result.current.listState).toEqual({ kind });
  });

  it('fails closed without provider transport when a selected server record has no id', () => {
    const invalidRecord = { name: 'env', tagValue: 'prod' } as unknown as LabelRecord;
    const { result } = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));

    act(() => result.current.updateLabel(invalidRecord, { description: 'Updated' }, vi.fn()));
    act(() => result.current.deleteLabel(invalidRecord));

    expect(refine.updateMutate).not.toHaveBeenCalled();
    expect(refine.deleteMutate).not.toHaveBeenCalled();
    expect(refine.notificationOpen).toHaveBeenNthCalledWith(1, { message: 'labels.saveFailed', type: 'error' });
    expect(refine.notificationOpen).toHaveBeenNthCalledWith(2, { message: 'labels.deleteFailed', type: 'error' });
  });

  it('owns refresh, copy notifications, and Monitor query navigation', async () => {
    const { result } = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));

    act(() => result.current.refresh());
    await act(() => result.current.copyLabel(serverLabel));
    act(() => result.current.inspectLabel(serverLabel));

    expect(refine.refetch).toHaveBeenCalledTimes(1);
    expect(refine.clipboardWrite).toHaveBeenCalledWith('env:prod');
    expect(refine.notificationOpen).toHaveBeenCalledWith({ message: 'labels.copySuccess', type: 'success' });
    expect(router.navigate).toHaveBeenCalledWith('/monitors?labels=env%3Aprod');
  });

  it('reports clipboard failure without exposing the thrown error', async () => {
    refine.clipboardWrite.mockRejectedValue(new Error('private clipboard content'));
    const { result } = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));

    await act(() => result.current.copyLabel(serverLabel));

    expect(refine.notificationOpen).toHaveBeenCalledWith({ message: 'labels.copyFailed', type: 'error' });
    expect(JSON.stringify(refine.notificationOpen.mock.calls)).not.toContain('private clipboard');
  });
});

function buildListResult(override: Record<string, unknown>) {
  return {
    query: {
      error: null,
      isError: false,
      isFetching: false,
      isPending: false,
      refetch: refine.refetch,
      ...override
    },
    result: { data: [serverLabel], total: 1, ...readResultOverride(override) }
  };
}

function readResultOverride(override: Record<string, unknown>) {
  const result = override.result;
  return result && typeof result === 'object' ? result : {};
}
