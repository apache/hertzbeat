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

import {
  createLabelDeleteEvidence,
  createLabelWriteEvidence,
  LabelRequestFailure,
  type LabelWriteRecovery
} from '../model/label-failure';
import { buildLabelExpectedWrite, type LabelRecord } from '../model/label-model';
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
const labelApi = vi.hoisted(() => ({ findCanonicalLabel: vi.fn() }));

vi.mock('@refinedev/core', () => ({
  useCreate: refine.useCreate,
  useDelete: refine.useDelete,
  useList: refine.useList,
  useNotification: refine.useNotification,
  useUpdate: refine.useUpdate
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router-dom', () => ({ useNavigate: () => router.navigate }));
vi.mock('../api/label-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/label-api')>()),
  findCanonicalLabel: labelApi.findCanonicalLabel
}));

const serverLabel: LabelRecord = {
  id: 7,
  name: 'env',
  tagValue: 'prod',
  description: 'Server canonical'
};

const exclusiveMutationCases = [
  ['create', ['update', 'delete']],
  ['update', ['create', 'delete']],
  ['delete', ['create', 'update']]
] as const;

describe('Label resource controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refine.useCreate.mockReturnValue({ mutate: refine.createMutate, mutation: { isPending: false } });
    refine.useUpdate.mockReturnValue({ mutate: refine.updateMutate, mutation: { isPending: false } });
    refine.useDelete.mockReturnValue({ mutate: refine.deleteMutate, mutation: { isPending: false } });
    refine.useNotification.mockReturnValue({ open: refine.notificationOpen });
    refine.useList.mockReturnValue(buildListResult({ data: [serverLabel], total: 1 }));
    refine.refetch.mockResolvedValue({ isError: false, data: { data: [serverLabel], total: 1 } });
    labelApi.findCanonicalLabel.mockReset();
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

    act(() => {
      result.current.createLabel({ name: 'team', tagValue: 'platform' }, onSuccess);
    });
    act(() => {
      void refine.createMutate.mock.calls[0]?.[1]?.onSuccess?.({ data: serverLabel });
    });
    act(() => {
      result.current.updateLabel(serverLabel, { id: 99, description: 'Updated' }, onSuccess);
    });
    act(() => {
      void refine.updateMutate.mock.calls[0]?.[1]?.onSuccess?.({ data: serverLabel });
    });
    act(() => {
      result.current.deleteLabel(serverLabel);
    });

    expect(refine.createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'labels',
        dataProviderName: 'labels',
        invalidates: ['list'],
        values: { name: 'team', tagValue: 'platform' }
      }),
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
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
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
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
    expect(deleteParams.successNotification).toBe(false);
    expect(deleteParams.errorNotification).toBe(false);
  });

  it.each(exclusiveMutationCases)(
    'serializes every Label mutation while %s owns the operation gate',
    (owner, blocked) => {
      const { result } = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));
      const transports = {
        create: refine.createMutate,
        update: refine.updateMutate,
        delete: refine.deleteMutate
      };
      const invoke = {
        create: () => result.current.createLabel({ name: 'team' }, vi.fn()),
        update: () => result.current.updateLabel(serverLabel, { description: 'changed' }, vi.fn()),
        delete: () => result.current.deleteLabel(serverLabel)
      };
      const settle = (operation: keyof typeof transports) => {
        const callbacks = transports[operation].mock.calls.at(-1)?.[1];
        void callbacks?.onSuccess?.({ data: serverLabel });
      };

      let ownerAccepted = false;
      act(() => {
        ownerAccepted = invoke[owner]();
      });
      expect(ownerAccepted).toBe(true);
      expect(transports[owner]).toHaveBeenCalledTimes(1);

      const blockedResults: boolean[] = [];
      act(() => {
        blocked.forEach(operation => blockedResults.push(invoke[operation]()));
      });
      expect(blockedResults).toEqual([false, false]);
      blocked.forEach(operation => expect(transports[operation]).not.toHaveBeenCalled());

      act(() => settle(owner));
      blocked.forEach(operation => {
        let acceptedAfterSettle = false;
        act(() => {
          acceptedAfterSettle = invoke[operation]();
        });
        expect(acceptedAfterSettle).toBe(true);
        expect(transports[operation]).toHaveBeenCalledTimes(1);
        act(() => settle(operation));
      });
    }
  );

  it('retires a confirmed delete so a stale list row cannot repeat it', () => {
    const confirmDelete = vi.fn();
    const query = { search: 'env', pageIndex: 2, pageSize: 50 as const };
    const { result } = renderHook(() => useLabelResourceController(query, confirmDelete));

    act(() => {
      result.current.deleteLabel(serverLabel);
    });
    const callbacks = refine.deleteMutate.mock.calls[0]?.[1];
    act(() => {
      void callbacks?.onSuccess?.({ data: serverLabel });
      result.current.deleteLabel(serverLabel);
      result.current.refresh();
    });

    expect(refine.deleteMutate).toHaveBeenCalledTimes(1);
    expect(refine.refetch).toHaveBeenCalledTimes(1);
    expect(confirmDelete).toHaveBeenCalledOnce();
    expect(confirmDelete).toHaveBeenCalledWith({ query, visibleRecords: 1 });
  });

  it('retries ambiguous delete with exact GET proof and never repeats DELETE', async () => {
    labelApi.findCanonicalLabel.mockResolvedValue(undefined);
    refine.refetch.mockResolvedValue({ isError: false, data: { data: [], total: 0 } });
    const confirmDelete = vi.fn();
    const query = { search: 'env', pageIndex: 2, pageSize: 50 as const };
    const { result } = renderHook(() => useLabelResourceController(query, confirmDelete));
    act(() => {
      result.current.deleteLabel(serverLabel);
    });
    act(() => {
      void refine.deleteMutate.mock.calls[0]?.[1]?.onError?.(
        new LabelRequestFailure('unavailable', 'uncertain', {
          evidence: createLabelDeleteEvidence('write', 'proof', serverLabel)
        })
      );
    });

    expect(result.current.isSaving).toBe(false);
    expect(result.current.recovery).toBe('proof');
    expect(result.current.recoveryCommand).toBe('delete');
    expect(result.current.deleteLabel(serverLabel)).toBe(false);

    await act(async () => result.current.retryMutationProof());

    expect(labelApi.findCanonicalLabel).toHaveBeenCalledWith({ id: 7, name: 'env', tagValue: 'prod' });
    expect(refine.refetch).toHaveBeenCalledTimes(1);
    expect(refine.deleteMutate).toHaveBeenCalledTimes(1);
    expect(confirmDelete).toHaveBeenCalledOnce();
    expect(confirmDelete).toHaveBeenCalledWith({ query, visibleRecords: 1 });
    expect(result.current.recovery).toBeNull();
    expect(refine.notificationOpen).toHaveBeenCalledWith({ message: 'labels.deleteSuccess', type: 'success' });
  });

  it('releases delete recovery only for an explicit typed 4xx rejection', () => {
    const { result } = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));
    act(() => {
      result.current.deleteLabel(serverLabel);
    });
    act(() => {
      void refine.deleteMutate.mock.calls[0]?.[1]?.onError?.(
        new LabelRequestFailure('error', 'rejected', {
          evidence: createLabelDeleteEvidence('write', 'rewrite', serverLabel)
        })
      );
    });
    act(() => {
      result.current.deleteLabel(serverLabel);
    });

    expect(result.current.recovery).toBeNull();
    expect(refine.deleteMutate).toHaveBeenCalledTimes(2);
  });

  it('does not publish or notify when a pending mutation completes after unmount', () => {
    const confirmed = vi.fn();
    const hook = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));
    act(() => {
      hook.result.current.createLabel({ name: 'team' }, confirmed);
    });
    const callbacks = refine.createMutate.mock.calls[0]?.[1];

    hook.unmount();
    act(() => {
      void callbacks?.onSuccess?.({ data: serverLabel });
    });

    expect(confirmed).not.toHaveBeenCalled();
    expect(refine.notificationOpen).not.toHaveBeenCalled();
  });

  it.each([
    [
      'explicit prewrite 4xx rejection',
      new LabelRequestFailure('error', 'rejected', {
        evidence: writeEvidence('create', 'write', 'rewrite', { name: 'old' })
      })
    ],
    ['local request validation failure', new LabelRequestFailure('invalid', 'not-attempted')]
  ])('releases a write receipt after a proven %s', (_case, failure) => {
    const oldConfirmed = vi.fn();
    const newConfirmed = vi.fn();
    const { result } = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));
    act(() => {
      result.current.createLabel({ name: 'old' }, oldConfirmed);
    });
    const oldCallbacks = refine.createMutate.mock.calls[0]?.[1];
    act(() => {
      void oldCallbacks?.onError?.(failure);
      result.current.updateLabel(serverLabel, { description: 'new' }, newConfirmed);
      void oldCallbacks?.onSuccess?.({ data: serverLabel });
    });

    expect(oldConfirmed).not.toHaveBeenCalled();
    expect(newConfirmed).not.toHaveBeenCalled();
    expect(refine.updateMutate).toHaveBeenCalledTimes(1);
    expect(refine.notificationOpen).toHaveBeenCalledTimes(1);
    expect(refine.notificationOpen).toHaveBeenCalledWith({ message: 'labels.saveFailed', type: 'error' });
  });

  it('retains a create receipt after canonical proof fails so the UI cannot repeat any mutation', async () => {
    labelApi.findCanonicalLabel.mockResolvedValue(undefined);
    const { result } = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));
    act(() => {
      result.current.createLabel({ name: 'team' }, vi.fn());
    });
    act(() => {
      void refine.createMutate.mock.calls[0]?.[1]?.onError?.(
        new LabelRequestFailure('unavailable', 'uncertain', {
          evidence: writeEvidence('create', 'proof', 'commit-uncertain', { name: 'team' })
        })
      );
    });

    expect(result.current.createLabel({ name: 'team' }, vi.fn())).toBe(false);
    expect(result.current.updateLabel(serverLabel, { description: 'changed' }, vi.fn())).toBe(false);
    expect(result.current.deleteLabel(serverLabel)).toBe(false);
    expect(refine.createMutate).toHaveBeenCalledTimes(1);
    expect(refine.updateMutate).not.toHaveBeenCalled();
    expect(refine.deleteMutate).not.toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);
    expect(result.current.recovery).toBe('commit-uncertain');
    await expect(result.current.retryMutationProof()).resolves.toBe(false);
    expect(labelApi.findCanonicalLabel).toHaveBeenCalledWith({ name: 'team', tagValue: '' });
    expect(result.current.recovery).toBe('commit-uncertain');
    expect(refine.createMutate).toHaveBeenCalledTimes(1);
  });

  it('proves an ambiguous create by GET, enriches its server id, and converges projection without another POST', async () => {
    const confirmed = vi.fn();
    const created = { id: 9, name: 'team', tagValue: '', description: '', type: 1 };
    labelApi.findCanonicalLabel.mockResolvedValue(created);
    refine.refetch.mockResolvedValue({ isError: false, data: { data: [created], total: 1 } });
    const { result } = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));
    act(() => {
      result.current.createLabel({ name: 'team' }, confirmed);
    });
    act(() => {
      void refine.createMutate.mock.calls[0]?.[1]?.onError?.(
        new LabelRequestFailure('unavailable', 'uncertain', {
          evidence: writeEvidence('create', 'proof', 'commit-uncertain', { name: 'team' })
        })
      );
    });

    await act(async () => result.current.retryMutationProof());

    expect(labelApi.findCanonicalLabel).toHaveBeenCalledWith({ name: 'team', tagValue: '' });
    expect(refine.refetch).toHaveBeenCalledTimes(1);
    expect(refine.createMutate).toHaveBeenCalledTimes(1);
    expect(confirmed).toHaveBeenCalledTimes(1);
    expect(result.current.recovery).toBeNull();
  });

  it('retains enriched create proof when the refreshed projection does not contain its server id', async () => {
    const confirmed = vi.fn();
    const created = { id: 9, name: 'team', tagValue: '', description: '', type: 1 };
    labelApi.findCanonicalLabel.mockResolvedValue(created);
    refine.refetch.mockResolvedValue({ isError: false, data: { data: [], total: 0 } });
    const { result } = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));
    act(() => {
      result.current.createLabel({ name: 'team' }, confirmed);
    });
    act(() => {
      void refine.createMutate.mock.calls[0]?.[1]?.onError?.(
        new LabelRequestFailure('unavailable', 'uncertain', {
          evidence: writeEvidence('create', 'proof', 'commit-uncertain', { name: 'team' })
        })
      );
    });

    await act(async () => result.current.retryMutationProof());

    expect(result.current.recovery).toBe('commit-uncertain');
    expect(confirmed).not.toHaveBeenCalled();
    expect(refine.createMutate).toHaveBeenCalledTimes(1);
  });

  it('retries exact-id update proof with GET only and never issues another PUT', async () => {
    const confirmed = vi.fn();
    labelApi.findCanonicalLabel.mockResolvedValue({ ...serverLabel, description: 'changed' });
    refine.refetch.mockResolvedValue({
      isError: false,
      data: { data: [{ ...serverLabel, description: 'changed' }], total: 1 }
    });
    const { result } = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));
    act(() => {
      result.current.updateLabel(serverLabel, { description: 'changed' }, confirmed);
    });
    act(() => {
      void refine.updateMutate.mock.calls[0]?.[1]?.onError?.(
        new LabelRequestFailure('unavailable', 'uncertain', {
          evidence: writeEvidence('update', 'proof', 'proof', { ...serverLabel, description: 'changed' })
        })
      );
    });

    expect(result.current.updateLabel(serverLabel, { description: 'changed again' }, vi.fn())).toBe(false);
    expect(refine.updateMutate).toHaveBeenCalledTimes(1);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.recovery).toBe('proof');

    await act(async () => result.current.retryMutationProof());

    expect(labelApi.findCanonicalLabel).toHaveBeenCalledWith({ id: 7, name: 'env', tagValue: 'prod' });
    expect(refine.updateMutate).toHaveBeenCalledTimes(1);
    expect(confirmed).toHaveBeenCalledTimes(1);
    expect(result.current.recovery).toBeNull();
  });

  it('retains proof recovery when canonical data converges but list projection refresh fails', async () => {
    const confirmed = vi.fn();
    labelApi.findCanonicalLabel.mockResolvedValue({ ...serverLabel, description: 'changed' });
    refine.refetch.mockResolvedValue({ isError: true });
    const { result } = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));
    act(() => {
      result.current.updateLabel(serverLabel, { description: 'changed' }, confirmed);
    });
    act(() => {
      void refine.updateMutate.mock.calls[0]?.[1]?.onError?.(
        new LabelRequestFailure('unavailable', 'uncertain', {
          evidence: writeEvidence('update', 'proof', 'proof', { ...serverLabel, description: 'changed' })
        })
      );
    });

    await act(async () => result.current.retryMutationProof());

    expect(refine.updateMutate).toHaveBeenCalledTimes(1);
    expect(refine.refetch).toHaveBeenCalledTimes(1);
    expect(result.current.recovery).toBe('proof');
    expect(confirmed).not.toHaveBeenCalled();
  });

  it('retains update proof when refetch succeeds but projects the old writable fields', async () => {
    const confirmed = vi.fn();
    labelApi.findCanonicalLabel.mockResolvedValue({ ...serverLabel, description: 'changed' });
    refine.refetch.mockResolvedValue({ isError: false, data: { data: [serverLabel], total: 1 } });
    const { result } = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));
    act(() => {
      result.current.updateLabel(serverLabel, { description: 'changed' }, confirmed);
    });
    act(() => {
      void refine.updateMutate.mock.calls[0]?.[1]?.onError?.(
        new LabelRequestFailure('unavailable', 'uncertain', {
          evidence: writeEvidence('update', 'proof', 'proof', { ...serverLabel, description: 'changed' })
        })
      );
    });

    await act(async () => result.current.retryMutationProof());

    expect(result.current.recovery).toBe('proof');
    expect(confirmed).not.toHaveBeenCalled();
    expect(refine.updateMutate).toHaveBeenCalledTimes(1);
  });

  it('retains delete proof when refetch succeeds but still projects the deleted id', async () => {
    labelApi.findCanonicalLabel.mockResolvedValue(undefined);
    refine.refetch.mockResolvedValue({ isError: false, data: { data: [serverLabel], total: 1 } });
    const confirmDelete = vi.fn();
    const { result } = renderHook(() =>
      useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }, confirmDelete)
    );
    act(() => {
      result.current.deleteLabel(serverLabel);
    });
    act(() => {
      void refine.deleteMutate.mock.calls[0]?.[1]?.onError?.(
        new LabelRequestFailure('unavailable', 'uncertain', {
          evidence: createLabelDeleteEvidence('proof', 'proof', serverLabel)
        })
      );
    });

    await act(async () => result.current.retryMutationProof());

    expect(result.current.recovery).toBe('proof');
    expect(refine.deleteMutate).toHaveBeenCalledTimes(1);
    expect(confirmDelete).not.toHaveBeenCalled();
    expect(refine.notificationOpen).not.toHaveBeenCalledWith({ message: 'labels.deleteSuccess', type: 'success' });
  });

  it('retains proof recovery when the exact-id GET still has stale writable values', async () => {
    labelApi.findCanonicalLabel.mockResolvedValue(serverLabel);
    const { result } = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));
    act(() => {
      result.current.updateLabel(serverLabel, { description: 'changed' }, vi.fn());
    });
    act(() => {
      void refine.updateMutate.mock.calls[0]?.[1]?.onError?.(
        new LabelRequestFailure('unavailable', 'uncertain', {
          evidence: writeEvidence('update', 'proof', 'proof', { ...serverLabel, description: 'changed' })
        })
      );
    });

    await act(async () => result.current.retryMutationProof());

    expect(refine.updateMutate).toHaveBeenCalledTimes(1);
    expect(labelApi.findCanonicalLabel).toHaveBeenCalledTimes(1);
    expect(result.current.recovery).toBe('proof');
    expect(result.current.isLocked()).toBe(true);
    expect(result.current.isSaving).toBe(false);
  });

  it('retires retained proof evidence on unmount before an old retry can issue GET', async () => {
    const hook = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));
    act(() => {
      hook.result.current.updateLabel(serverLabel, { description: 'changed' }, vi.fn());
    });
    act(() => {
      void refine.updateMutate.mock.calls[0]?.[1]?.onError?.(
        new LabelRequestFailure('unavailable', 'uncertain', {
          evidence: writeEvidence('update', 'proof', 'proof', { ...serverLabel, description: 'changed' })
        })
      );
    });
    const retry = hook.result.current.retryMutationProof;

    hook.unmount();

    await expect(retry()).resolves.toBe(false);
    expect(labelApi.findCanonicalLabel).not.toHaveBeenCalled();
  });

  it('allows a safe list refresh while a commit-uncertain create keeps writes locked', () => {
    const { result } = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));
    act(() => {
      result.current.createLabel({ name: 'team' }, vi.fn());
    });
    act(() => {
      void refine.createMutate.mock.calls[0]?.[1]?.onError?.(
        new LabelRequestFailure('unavailable', 'uncertain', {
          evidence: writeEvidence('create', 'proof', 'commit-uncertain', { name: 'team' })
        })
      );
    });

    act(() => result.current.refresh());

    expect(refine.refetch).toHaveBeenCalledTimes(1);
    expect(result.current.isLocked()).toBe(true);
    expect(result.current.isSaving).toBe(false);
  });

  it('publishes localized notifications only from the current mutation owner', () => {
    const { result } = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));

    const createOptions = refine.useCreate.mock.calls[0]?.[0];
    const updateOptions = refine.useUpdate.mock.calls[0]?.[0];
    expect(createOptions).toMatchObject({ successNotification: false, errorNotification: false });
    expect(updateOptions).toMatchObject({ successNotification: false, errorNotification: false });

    act(() => {
      result.current.createLabel({ name: 'team' }, vi.fn());
    });
    act(() => {
      void refine.createMutate.mock.calls[0]?.[1]?.onSuccess?.({ data: serverLabel });
    });
    act(() => {
      result.current.updateLabel(serverLabel, { description: 'changed' }, vi.fn());
    });
    act(() => {
      void refine.updateMutate.mock.calls[0]?.[1]?.onError?.(
        new LabelRequestFailure('error', 'rejected', {
          evidence: writeEvidence('update', 'write', 'rewrite', serverLabel)
        })
      );
    });

    expect(refine.notificationOpen).toHaveBeenNthCalledWith(1, { message: 'labels.saveSuccess', type: 'success' });
    expect(refine.notificationOpen).toHaveBeenNthCalledWith(2, { message: 'labels.saveFailed', type: 'error' });
  });

  it.each([
    [true, false, true, true],
    [false, true, true, true],
    [false, false, true, true]
  ])('aggregates every pending mutation as saving', (createPending, updatePending, deletePending, expected) => {
    refine.useCreate.mockReturnValue({ mutate: refine.createMutate, mutation: { isPending: createPending } });
    refine.useUpdate.mockReturnValue({ mutate: refine.updateMutate, mutation: { isPending: updatePending } });
    refine.useDelete.mockReturnValue({ mutate: refine.deleteMutate, mutation: { isPending: deletePending } });

    const { result } = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));

    expect(result.current.isSaving).toBe(expected);
  });

  it.each([
    ['loading', { isPending: true }],
    ['permission', { isError: true, error: new LabelRequestFailure('permission', 'rejected') }],
    ['unavailable', { isError: true, error: new LabelRequestFailure('unavailable', 'uncertain') }],
    ['error', { isError: true, error: new LabelRequestFailure('invalid', 'uncertain') }],
    ['error', { isError: true, error: new LabelRequestFailure('error', 'uncertain') }],
    ['empty', { result: { data: [], total: 0 } }]
  ])('maps list evidence to the %s state without fake records', (kind, override) => {
    refine.useList.mockReturnValue(buildListResult(override));

    const { result } = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));

    expect(result.current.listState).toEqual({ kind });
  });

  it.each([[{ data: [], total: undefined }], [{ data: [], total: 1 }], [{ data: [serverLabel], total: 0 }]])(
    'rejects incomplete or contradictory list totals instead of showing fake empty/ready state',
    resultData => {
      refine.useList.mockReturnValue(buildListResult({ result: resultData }));

      const { result } = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));

      expect(result.current.listState).toEqual({ kind: 'error' });
    }
  );

  it('fails closed without provider transport when a selected server record has no id', () => {
    const invalidRecord = { name: 'env', tagValue: 'prod' } as unknown as LabelRecord;
    const { result } = renderHook(() => useLabelResourceController({ search: '', pageIndex: 0, pageSize: 20 }));

    act(() => {
      result.current.updateLabel(invalidRecord, { description: 'Updated' }, vi.fn());
    });
    act(() => {
      result.current.deleteLabel(invalidRecord);
    });

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

function writeEvidence(
  operation: 'create' | 'update',
  phase: 'write' | 'proof',
  recovery: LabelWriteRecovery,
  value: Partial<LabelRecord>
) {
  return createLabelWriteEvidence(operation, phase, recovery, buildLabelExpectedWrite(value, operation));
}
