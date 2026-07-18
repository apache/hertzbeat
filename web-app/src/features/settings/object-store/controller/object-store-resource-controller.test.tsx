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
  createObjectStoreDraft,
  type ObjectStoreResourceRecord
} from '../model/object-store-model';
import { useObjectStoreResourceController } from './object-store-resource-controller';

const refine = vi.hoisted(() => ({
  refetch: vi.fn(),
  updateMutate: vi.fn(),
  useOne: vi.fn(),
  useUpdate: vi.fn()
}));

vi.mock('@refinedev/core', () => ({
  useOne: refine.useOne,
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

describe('Object Store resource controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refine.useOne.mockReturnValue(buildOneResult());
    refine.useUpdate.mockReturnValue({ mutate: refine.updateMutate, mutation: { isPending: false } });
  });

  it('uses the named singleton provider and pessimistic detail update', () => {
    const { result } = renderHook(() => useObjectStoreResourceController());

    expect(refine.useOne).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'object-store',
      id: 'current',
      dataProviderName: 'object-store'
    }));
    expect(refine.useUpdate).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'object-store',
      dataProviderName: 'object-store',
      mutationMode: 'pessimistic',
      invalidates: ['detail']
    }));

    const editable = createObjectStoreDraft(serverRecord);
    act(() => result.current.updateDraft({
      ...editable,
      config: {
        ...editable.config,
        accessKey: 'changed-ak',
        secretKey: 'runtime-only-secret'
      }
    }));
    act(() => result.current.submit());

    expect(refine.updateMutate).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'object-store',
      id: 'current',
      dataProviderName: 'object-store',
      mutationMode: 'pessimistic',
      invalidates: ['detail'],
      values: expect.objectContaining({ type: 'OBS', config: expect.objectContaining({ accessKey: 'changed-ak' }) })
    }), expect.objectContaining({ onSuccess: expect.any(Function) }));
  });

  it.each([
    ['loading', { isPending: true }],
    ['unavailable', { isError: true, error: { statusCode: 0 }, result: undefined }],
    ['unavailable', { isError: true, error: { statusCode: 502 }, result: undefined }],
    ['error', {
      isError: true,
      error: { statusCode: 502, code: 'OBJECT_STORE_RESPONSE_INVALID' },
      result: undefined
    }],
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
    act(() => result.current.updateDraft({
      ...editable,
      config: { ...editable.config, secretKey: 'runtime-only-secret' }
    }));
    act(() => result.current.submit());
    const callbacks = refine.updateMutate.mock.calls[0]?.[1];

    expect(result.current.state).toMatchObject({ kind: 'ready', dirty: true });
    expect(callbacks).not.toHaveProperty('onError');
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

  it('keeps the editable secret out of browser persistence and logs', () => {
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const { result } = renderHook(() => useObjectStoreResourceController());
    const editable = createObjectStoreDraft(serverRecord);

    act(() => result.current.updateDraft({
      ...editable,
      config: { ...editable.config, secretKey: 'runtime-only-secret' }
    }));
    act(() => result.current.submit());

    expect(JSON.stringify(storageWrite.mock.calls)).not.toContain('runtime-only-secret');
    expect(JSON.stringify([...log.mock.calls, ...info.mock.calls, ...debug.mock.calls]))
      .not.toContain('runtime-only-secret');
    storageWrite.mockRestore();
    log.mockRestore();
    info.mockRestore();
    debug.mockRestore();
  });

  it('owns retry without changing the singleton identity', () => {
    refine.useOne.mockReturnValue(buildOneResult({ isError: true, result: undefined }));
    const { result } = renderHook(() => useObjectStoreResourceController());

    act(() => result.current.retry());

    expect(refine.refetch).toHaveBeenCalledTimes(1);
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
