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

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';
import { ObjectStoreRequestFailure } from '@/features/settings/object-store/model/object-store-failure';
import {
  ObjectStoreResourceContractError,
  type ObjectStoreDraft,
  type ObjectStoreReadModel
} from '@/features/settings/object-store/model/object-store-model';
import { createRefineHttpError } from '@/shared/refine/refine-http-error';

type ObjectStoreApi = typeof import('@/features/settings/object-store/api/object-store-api');
const canonical = vi.hoisted(() => ({ endpoint: '/canonical-object-store-endpoint' }));
const objectStoreApi = vi.hoisted(() => ({
  loadObjectStore: vi.fn<ObjectStoreApi['loadObjectStore']>(),
  saveObjectStore: vi.fn<ObjectStoreApi['saveObjectStore']>()
}));
vi.mock('@/features/settings/object-store/api/object-store-api', async importOriginal => ({
  ...(await importOriginal<ObjectStoreApi>()),
  ...objectStoreApi,
  objectStoreEndpoint: canonical.endpoint
}));

import { objectStoreDataProvider } from './object-store-data-provider';

const configuredRead: ObjectStoreReadModel = {
  type: 'OBS',
  config: {
    accessKey: 'ak',
    secretConfigured: true,
    bucketName: 'bucket',
    endpoint: 'https://obs.cn-north-4.myhuaweicloud.com',
    savePath: 'hertzbeat'
  }
};

const configuredDraft: ObjectStoreDraft = {
  type: 'OBS',
  config: {
    accessKey: 'ak',
    secretKey: 'sk',
    bucketName: 'bucket',
    endpoint: 'https://obs.cn-north-4.myhuaweicloud.com',
    savePath: 'hertzbeat'
  }
};

describe('Object Store Refine data provider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the endpoint owned by the Object Store API', () => {
    expect(objectStoreDataProvider.getApiUrl()).toBe(canonical.endpoint);
  });

  it('reads the named singleton into the model-owned stable record', async () => {
    objectStoreApi.loadObjectStore.mockResolvedValue(configuredRead);

    const result = await objectStoreDataProvider.getOne({
      resource: 'object-store',
      id: 'current'
    });

    expect(result).toEqual({ data: { id: 'current', ...configuredRead } });
    expect(JSON.stringify(result)).not.toContain('secretKey');
    expect(objectStoreApi.loadObjectStore).toHaveBeenCalledTimes(1);
  });

  it('sends plaintext only in the write and resolves cache-safe presence evidence from reread', async () => {
    const plaintext = 'runtime-only-provider-secret';
    const write = { ...configuredDraft, config: { ...configuredDraft.config, secretKey: plaintext } };
    objectStoreApi.saveObjectStore.mockResolvedValue('Update config success');
    objectStoreApi.loadObjectStore.mockResolvedValue(configuredRead);

    const result = await objectStoreDataProvider.update({
      resource: 'object-store',
      id: 'current',
      variables: write
    });

    expect(result).toEqual({ data: { id: 'current', ...configuredRead } });
    expect(JSON.stringify(result)).not.toContain('secretKey');
    expect(JSON.stringify(result)).not.toContain(plaintext);
    expect(objectStoreApi.saveObjectStore).toHaveBeenCalledWith(write);
    expect(objectStoreApi.loadObjectStore).toHaveBeenCalledWith();
    expect(objectStoreApi.saveObjectStore.mock.invocationCallOrder[0]).toBeLessThan(
      objectStoreApi.loadObjectStore.mock.invocationCallOrder[0] ?? 0
    );
  });

  it('fails the mutation when the authoritative reread fails after POST', async () => {
    objectStoreApi.saveObjectStore.mockResolvedValue('Update config success');
    objectStoreApi.loadObjectStore.mockRejectedValue(
      new ApiMessageError('secretKey=private-reread-secret', { cause: new TypeError('private-reread-cause') })
    );

    let error: unknown;
    try {
      await objectStoreDataProvider.update({
        resource: 'object-store',
        id: 'current',
        variables: configuredDraft
      });
    } catch (reason) {
      error = reason;
    }

    expect(error).toMatchObject({
      code: 'OBJECT_STORE_CANONICAL_REREAD_FAILED',
      kind: 'invalid',
      message: 'Object Store request failed',
      writeOutcome: 'uncertain'
    });
    expect(JSON.stringify(error)).not.toContain('private-reread-secret');
    expect(JSON.stringify(error)).not.toContain('private-reread-cause');
    expect((error as Error).cause).toBeUndefined();
    expect(objectStoreApi.saveObjectStore).toHaveBeenCalledTimes(1);
    expect(objectStoreApi.loadObjectStore).toHaveBeenCalledTimes(1);
  });

  it('marks a 4xx canonical reread as post-write uncertainty instead of a rejected save', async () => {
    objectStoreApi.saveObjectStore.mockResolvedValue('Update config success');
    objectStoreApi.loadObjectStore.mockRejectedValue(new ApiMessageError('Forbidden', { status: 403 }));

    await expect(
      objectStoreDataProvider.update({
        resource: 'object-store',
        id: 'current',
        variables: configuredDraft
      })
    ).rejects.toMatchObject({
      code: 'OBJECT_STORE_CANONICAL_REREAD_FAILED',
      kind: 'invalid',
      writeOutcome: 'uncertain'
    });
  });

  it('fails closed when the post-write authoritative reread has no record', async () => {
    objectStoreApi.saveObjectStore.mockResolvedValue('Update config success');
    objectStoreApi.loadObjectStore.mockResolvedValue(null);

    await expect(
      objectStoreDataProvider.update({
        resource: 'object-store',
        id: 'current',
        variables: configuredDraft
      })
    ).rejects.toMatchObject({
      code: 'OBJECT_STORE_CANONICAL_REREAD_MISSING',
      kind: 'invalid',
      writeOutcome: 'uncertain'
    });
  });

  it('sanitizes malformed backend records at the model-owned resource boundary', async () => {
    objectStoreApi.loadObjectStore.mockRejectedValue(new ObjectStoreResourceContractError());

    let error: unknown;
    try {
      await objectStoreDataProvider.getOne({ resource: 'object-store', id: 'current' });
    } catch (reason) {
      error = reason;
    }
    expect(error).toMatchObject({
      code: 'OBJECT_STORE_RESPONSE_INVALID',
      kind: 'invalid',
      writeOutcome: 'uncertain'
    });
    expect(JSON.stringify(error)).not.toContain('secretKey');
  });

  it('rejects unsupported resources, ids, and actions before transport', async () => {
    await expect(objectStoreDataProvider.getOne({ resource: 'labels', id: 'current' })).rejects.toMatchObject({
      code: 'OBJECT_STORE_RESOURCE_UNSUPPORTED',
      kind: 'invalid',
      writeOutcome: 'rejected'
    });
    await expect(objectStoreDataProvider.getOne({ resource: 'object-store', id: 'other' })).rejects.toMatchObject({
      code: 'OBJECT_STORE_ID_INVALID',
      kind: 'invalid',
      writeOutcome: 'rejected'
    });
    await expect(objectStoreDataProvider.getList({ resource: 'object-store' })).rejects.toMatchObject({
      code: 'OBJECT_STORE_LIST_UNSUPPORTED',
      kind: 'invalid',
      writeOutcome: 'rejected'
    });
    await expect(
      objectStoreDataProvider.create({ resource: 'object-store', variables: configuredDraft })
    ).rejects.toMatchObject({ code: 'OBJECT_STORE_CREATE_UNSUPPORTED', kind: 'invalid', writeOutcome: 'rejected' });
    await expect(objectStoreDataProvider.deleteOne({ resource: 'object-store', id: 'current' })).rejects.toMatchObject({
      code: 'OBJECT_STORE_DELETE_UNSUPPORTED',
      kind: 'invalid',
      writeOutcome: 'rejected'
    });
    expect(objectStoreApi.loadObjectStore).not.toHaveBeenCalled();
    expect(objectStoreApi.saveObjectStore).not.toHaveBeenCalled();
  });

  it('normalizes raw fallback evidence with the provider operation context', async () => {
    objectStoreApi.loadObjectStore.mockRejectedValueOnce(new ApiMessageError('private-network'));
    objectStoreApi.saveObjectStore.mockRejectedValueOnce(
      new ApiMessageError('private-business', { code: 20, status: 200 })
    );

    await expect(objectStoreDataProvider.getOne({ resource: 'object-store', id: 'current' })).rejects.toMatchObject({
      kind: 'unavailable',
      writeOutcome: 'uncertain'
    });
    await expect(
      objectStoreDataProvider.update({
        resource: 'object-store',
        id: 'current',
        variables: configuredDraft
      })
    ).rejects.toMatchObject({ kind: 'error', writeOutcome: 'rejected' });
  });

  it('never presents a read failure as proof that a write was rejected', async () => {
    objectStoreApi.loadObjectStore.mockRejectedValueOnce(
      createRefineHttpError('private-read-rejection', 422, undefined, 'http', 422)
    );

    await expect(objectStoreDataProvider.getOne({ resource: 'object-store', id: 'current' })).rejects.toMatchObject({
      kind: 'error',
      writeOutcome: 'uncertain'
    });
  });

  it('preserves typed failure identity without copying secret evidence', async () => {
    const failure = new ObjectStoreRequestFailure('unavailable', 'uncertain');
    objectStoreApi.loadObjectStore.mockRejectedValueOnce(failure);

    await expect(objectStoreDataProvider.getOne({ resource: 'object-store', id: 'current' })).rejects.toBe(failure);
  });
});
