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

import { createRefineHttpError } from '@/shared/refine/refine-http-error';

import { createObjectStoreDraft, type ObjectStoreResourceRecord } from '../model/object-store-model';
import { useObjectStoreResourceController } from './object-store-resource-controller';

const refine = vi.hoisted(() => ({
  notification: vi.fn(),
  refetch: vi.fn(),
  updateMutate: vi.fn(),
  useOne: vi.fn(),
  useNotification: vi.fn(),
  useUpdate: vi.fn()
}));

vi.mock('@refinedev/core', () => ({
  useOne: refine.useOne,
  useNotification: refine.useNotification,
  useUpdate: refine.useUpdate
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const serverRecord: ObjectStoreResourceRecord = {
  id: 'current',
  type: 'OBS',
  config: {
    accessKey: 'ak',
    secretConfigured: true,
    bucketName: 'bucket',
    endpoint: 'https://obs.cn-north-4.myhuaweicloud.com',
    savePath: 'hertzbeat'
  }
};
const databaseRecord: ObjectStoreResourceRecord = { id: 'current', type: 'DATABASE', config: {} };

describe('Object Store resource controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refine.refetch.mockReset();
    refine.updateMutate.mockReset();
    refine.refetch.mockResolvedValue({ data: { data: serverRecord }, error: null, isError: false });
    refine.useOne.mockReturnValue(buildOneResult());
    refine.useNotification.mockReturnValue({ open: refine.notification });
    refine.useUpdate.mockReturnValue({ mutate: refine.updateMutate, mutation: { isPending: false } });
  });

  it('uses the named singleton provider and pessimistic detail update', () => {
    const { result } = renderHook(() => useObjectStoreResourceController());

    expect(refine.useOne).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'object-store',
        id: 'current',
        dataProviderName: 'object-store'
      })
    );
    expect(refine.useUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'object-store',
        dataProviderName: 'object-store',
        mutationMode: 'pessimistic',
        invalidates: ['detail']
      })
    );

    const editable = createObjectStoreDraft(serverRecord);
    act(() =>
      result.current.updateDraft({
        ...editable,
        config: {
          ...editable.config,
          accessKey: 'changed-ak',
          secretKey: 'runtime-only-secret'
        }
      })
    );
    act(() => result.current.submit());

    expect(refine.updateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'object-store',
        id: 'current',
        dataProviderName: 'object-store',
        mutationMode: 'pessimistic',
        invalidates: ['detail'],
        values: expect.objectContaining({ type: 'OBS', config: expect.objectContaining({ accessKey: 'changed-ak' }) })
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it.each([
    ['loading', { isPending: true }],
    ['unavailable', { isError: true, error: { statusCode: 0 }, result: undefined }],
    ['unavailable', { isError: true, error: { statusCode: 502 }, result: undefined }],
    [
      'error',
      {
        isError: true,
        error: { statusCode: 502, code: 'OBJECT_STORE_RESPONSE_INVALID' },
        result: undefined
      }
    ],
    ['unavailable', { isError: true, error: { statusCode: 503 }, result: undefined }],
    ['unavailable', { isError: true, error: { statusCode: 504 }, result: undefined }],
    ['error', { isError: true, error: { statusCode: 400 }, result: undefined }],
    ['error', { isError: true, error: { statusCode: 500 }, result: undefined }],
    ['error', { isError: false, result: undefined }],
    ['ready', {}]
  ])('maps authoritative evidence to the %s state', (kind, override) => {
    refine.useOne.mockReturnValue(buildOneResult(override));

    const { result } = renderHook(() => useObjectStoreResourceController());

    expect(result.current.state.kind).toBe(kind);
  });

  it('does not write for no-op, invalid, or discarded drafts', () => {
    const { result } = renderHook(() => useObjectStoreResourceController());

    expect(result.current.state).toMatchObject({
      kind: 'ready',
      current: { config: { secretKey: '' } }
    });
    act(() => result.current.submit());
    act(() => result.current.updateDraft({ type: 'OBS', config: {} }));
    act(() => result.current.submit());
    expect(result.current.state).toMatchObject({ kind: 'ready', showValidation: true });
    act(() => result.current.discard());

    expect(refine.updateMutate).not.toHaveBeenCalled();
    expect(result.current.state).toMatchObject({ kind: 'ready', dirty: false, showValidation: false });
  });

  it('clears the draft only after the provider update succeeds', () => {
    const { result } = renderHook(() => useObjectStoreResourceController());
    const editable = createObjectStoreDraft(serverRecord);
    act(() =>
      result.current.updateDraft({
        ...editable,
        config: { ...editable.config, secretKey: 'runtime-only-secret' }
      })
    );
    act(() => result.current.submit());
    const callbacks = refine.updateMutate.mock.calls[0]?.[1];

    expect(result.current.state).toMatchObject({ kind: 'ready', dirty: true });
    expect(callbacks).toHaveProperty('onError', expect.any(Function));
    expect(result.current.state).toMatchObject({
      kind: 'ready',
      dirty: true,
      current: { config: expect.objectContaining({ secretKey: 'runtime-only-secret' }) }
    });
    act(() => {
      void callbacks?.onSuccess?.({
        data: { ...serverRecord, config: { ...serverRecord.config, accessKey: 'canonical' } }
      });
    });
    expect(result.current.state).toMatchObject({ kind: 'ready', dirty: false, showValidation: false });
  });

  it('admits one save and locks draft mutations until its owner completes', () => {
    const { result } = renderHook(() => useObjectStoreResourceController());
    const submitted = {
      ...createObjectStoreDraft(serverRecord),
      config: {
        ...createObjectStoreDraft(serverRecord).config,
        accessKey: 'submitted-ak',
        secretKey: 'runtime-only-secret'
      }
    };
    act(() => result.current.updateDraft(submitted));

    act(() => {
      result.current.submit();
      result.current.submit();
      result.current.updateDraft({ ...submitted, config: { ...submitted.config, accessKey: 'late-ak' } });
      result.current.discard();
      void result.current.retry();
    });

    expect(refine.updateMutate).toHaveBeenCalledTimes(1);
    expect(refine.refetch).not.toHaveBeenCalled();
    expect(result.current.state).toMatchObject({ kind: 'ready', current: submitted, saving: true });
  });

  it('keeps the editable secret out of browser persistence and logs', () => {
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const { result } = renderHook(() => useObjectStoreResourceController());
    const editable = createObjectStoreDraft(serverRecord);

    act(() =>
      result.current.updateDraft({
        ...editable,
        config: { ...editable.config, secretKey: 'runtime-only-secret' }
      })
    );
    act(() => result.current.submit());

    expect(JSON.stringify(storageWrite.mock.calls)).not.toContain('runtime-only-secret');
    expect(JSON.stringify([...log.mock.calls, ...info.mock.calls, ...debug.mock.calls])).not.toContain(
      'runtime-only-secret'
    );
    storageWrite.mockRestore();
    log.mockRestore();
    info.mockRestore();
    debug.mockRestore();
  });

  it('owns retry without changing the singleton identity', async () => {
    refine.useOne.mockReturnValue(buildOneResult({ isError: true, result: undefined }));
    const { result } = renderHook(() => useObjectStoreResourceController());

    await act(async () => result.current.retry());

    expect(refine.refetch).toHaveBeenCalledTimes(1);
  });

  it.each(ambiguousWriteFailures)(
    'proves an ambiguous %s save by canonical reread without repeating POST',
    async (_label, failure) => {
      refine.useOne.mockReturnValue(buildOneResult({ result: databaseRecord }));
      refine.refetch.mockResolvedValue({
        data: { data: { ...databaseRecord, type: 'FILE' } },
        error: null,
        isError: false
      });
      const { result } = renderHook(() => useObjectStoreResourceController());

      act(() => result.current.updateDraft({ type: 'FILE', config: {} }));
      act(() => result.current.submit());
      const callbacks = refine.updateMutate.mock.calls[0]?.[1];
      act(() => {
        void callbacks?.onError?.(failure());
      });

      await waitFor(() => expect(refine.refetch).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(result.current.state).toMatchObject({ kind: 'ready', recovery: null }));
      expect(refine.updateMutate).toHaveBeenCalledTimes(1);
      expect(refine.notification).toHaveBeenCalledWith({ message: 'objectStore.saveSuccess', type: 'success' });
    }
  );

  it.each(definiteWriteRejections)(
    'unlocks an OBS secret draft after a definite %s rejection',
    async (_label, rejection) => {
      const { result } = renderHook(() => useObjectStoreResourceController());
      const submitted = {
        ...createObjectStoreDraft(serverRecord),
        config: { ...createObjectStoreDraft(serverRecord).config, secretKey: 'runtime-only-secret' }
      };

      act(() => result.current.updateDraft(submitted));
      act(() => result.current.submit());
      const callbacks = refine.updateMutate.mock.calls[0]?.[1];
      act(() => {
        void callbacks?.onError?.(rejection());
      });

      await waitFor(() => expect(result.current.state).toMatchObject({ kind: 'ready', locked: false, recovery: null }));
      expect(refine.refetch).not.toHaveBeenCalled();
      expect(refine.notification).toHaveBeenCalledWith({ message: 'objectStore.saveFailed', type: 'error' });
      act(() => result.current.submit());
      expect(refine.updateMutate).toHaveBeenCalledTimes(2);
    }
  );

  it.each(definiteWriteRejections)(
    'does not start canonical proof after a definite FILE %s rejection',
    async (_label, rejection) => {
      refine.useOne.mockReturnValue(buildOneResult({ result: databaseRecord }));
      const { result } = renderHook(() => useObjectStoreResourceController());

      act(() => result.current.updateDraft({ type: 'FILE', config: {} }));
      act(() => result.current.submit());
      const callbacks = refine.updateMutate.mock.calls[0]?.[1];
      act(() => {
        void callbacks?.onError?.(rejection());
      });

      await waitFor(() => expect(result.current.state).toMatchObject({ kind: 'ready', locked: false, recovery: null }));
      expect(refine.refetch).not.toHaveBeenCalled();
      expect(refine.notification).toHaveBeenCalledWith({ message: 'objectStore.saveFailed', type: 'error' });
    }
  );

  it('retains proof-only recovery and retries GET without repeating an ambiguous write', async () => {
    refine.useOne.mockReturnValue(buildOneResult({ result: databaseRecord }));
    refine.refetch
      .mockResolvedValueOnce({ data: undefined, error: { statusCode: 503 }, isError: true })
      .mockResolvedValueOnce({ data: { data: { ...databaseRecord, type: 'FILE' } }, error: null, isError: false });
    const { result } = renderHook(() => useObjectStoreResourceController());

    act(() => result.current.updateDraft({ type: 'FILE', config: {} }));
    act(() => result.current.submit());
    const callbacks = refine.updateMutate.mock.calls[0]?.[1];
    act(() => {
      void callbacks?.onError?.({ statusCode: 503 });
    });

    await waitFor(() =>
      expect(result.current.state).toMatchObject({ kind: 'ready', locked: true, recovery: { phase: 'proof' } })
    );
    act(() => {
      result.current.submit();
      result.current.discard();
      result.current.updateDraft({ type: 'DATABASE', config: {} });
    });
    expect(refine.updateMutate).toHaveBeenCalledTimes(1);

    await act(async () => result.current.retry());

    expect(refine.refetch).toHaveBeenCalledTimes(2);
    expect(refine.updateMutate).toHaveBeenCalledTimes(1);
    expect(result.current.state).toMatchObject({ kind: 'ready', locked: false, recovery: null });
  });

  it.each(ambiguousWriteFailures)(
    'keeps an OBS secret save commit-uncertain after an ambiguous %s outcome',
    async (_label, failure) => {
      const { result } = renderHook(() => useObjectStoreResourceController());
      const submitted = {
        ...createObjectStoreDraft(serverRecord),
        config: { ...createObjectStoreDraft(serverRecord).config, secretKey: 'runtime-only-secret' }
      };

      act(() => result.current.updateDraft(submitted));
      act(() => result.current.submit());
      const callbacks = refine.updateMutate.mock.calls[0]?.[1];
      act(() => {
        void callbacks?.onError?.(failure());
      });

      await waitFor(() =>
        expect(result.current.state).toMatchObject({
          kind: 'ready',
          current: submitted,
          locked: true,
          recovery: { phase: 'commit-uncertain' }
        })
      );
      await act(async () => result.current.retry());
      act(() => result.current.submit());
      expect(refine.refetch).not.toHaveBeenCalled();
      expect(refine.updateMutate).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(refine.notification.mock.calls)).not.toContain('runtime-only-secret');
    }
  );

  it('retires an in-flight proof on unmount without publishing a notification', async () => {
    const proof = deferred<{ data: { data: ObjectStoreResourceRecord }; error: null; isError: false }>();
    refine.useOne.mockReturnValue(buildOneResult({ result: databaseRecord }));
    refine.refetch.mockReturnValue(proof.promise);
    const { result, unmount } = renderHook(() => useObjectStoreResourceController());

    act(() => result.current.updateDraft({ type: 'FILE', config: {} }));
    act(() => result.current.submit());
    const callbacks = refine.updateMutate.mock.calls[0]?.[1];
    act(() => {
      void callbacks?.onError?.({ statusCode: 503 });
    });
    unmount();
    proof.resolve({ data: { data: { ...databaseRecord, type: 'FILE' } }, error: null, isError: false });
    await act(async () => proof.promise);

    expect(refine.notification).not.toHaveBeenCalled();
  });
});

function buildOneResult(override: Record<string, unknown> = {}) {
  return {
    query: {
      error: null,
      isError: false,
      isFetching: false,
      isPending: false,
      refetch: refine.refetch,
      ...override
    },
    result: Object.hasOwn(override, 'result') ? override.result : serverRecord
  };
}

const ambiguousWriteFailures = [
  ['network', () => ({ statusCode: 0, kind: 'network' })],
  ['5xx', () => ({ statusCode: 503, kind: 'http' })],
  ['malformed success', () => ({ statusCode: 502, code: 'OBJECT_STORE_RESPONSE_INVALID', kind: 'contract' })]
] as const;

const definiteWriteRejections = [
  ['business envelope', () => createRefineHttpError('rejected', 400, 20, 'envelope', 200)],
  ['HTTP 4xx', () => createRefineHttpError('rejected', 422, undefined, 'http', 422)]
] as const;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
