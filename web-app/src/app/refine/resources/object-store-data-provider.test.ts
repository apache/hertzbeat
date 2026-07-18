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
import {
  ObjectStoreResourceContractError,
  type ObjectStoreDraft,
  type ObjectStoreReadModel
} from '@/features/settings/object-store/model/object-store-model';

type ObjectStoreApi = typeof import('@/features/settings/object-store/api/object-store-api');
const objectStoreApi = vi.hoisted(() => ({
  loadObjectStore: vi.fn<ObjectStoreApi['loadObjectStore']>(),
  saveObjectStore: vi.fn<ObjectStoreApi['saveObjectStore']>()
}));
vi.mock('@/features/settings/object-store/api/object-store-api', async importOriginal => ({
  ...(await importOriginal<ObjectStoreApi>()),
  ...objectStoreApi
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

  it('rereads authoritative configuration after POST before resolving update', async () => {
    const canonical: ObjectStoreReadModel = { type: 'FILE', config: {} };
    objectStoreApi.saveObjectStore.mockResolvedValue('Update config success');
    objectStoreApi.loadObjectStore.mockResolvedValue(canonical);

    const result = await objectStoreDataProvider.update({
      resource: 'object-store',
      id: 'current',
      variables: configuredDraft
    });

    expect(result).toEqual({ data: { id: 'current', ...canonical } });
    expect(JSON.stringify(result)).not.toContain('secretKey');
    expect(objectStoreApi.saveObjectStore).toHaveBeenCalledWith(configuredDraft);
    expect(objectStoreApi.saveObjectStore.mock.invocationCallOrder[0])
      .toBeLessThan(objectStoreApi.loadObjectStore.mock.invocationCallOrder[0] ?? 0);
  });

  it('fails the mutation when the authoritative reread fails after POST', async () => {
    objectStoreApi.saveObjectStore.mockResolvedValue('Update config success');
    objectStoreApi.loadObjectStore.mockRejectedValue(new ApiMessageError(
      'secretKey=private-reread-secret',
      { cause: new TypeError('private-reread-cause') }
    ));

    await expect(objectStoreDataProvider.update({
      resource: 'object-store',
      id: 'current',
      variables: configuredDraft
    })).rejects.toMatchObject({
      statusCode: 0,
      code: 'NETWORK_REQUEST_FAILED',
      message: 'Network request failed'
    });
    expect(objectStoreApi.saveObjectStore).toHaveBeenCalledTimes(1);
    expect(objectStoreApi.loadObjectStore).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the post-write authoritative reread has no record', async () => {
    objectStoreApi.saveObjectStore.mockResolvedValue('Update config success');
    objectStoreApi.loadObjectStore.mockResolvedValue(null);

    await expect(objectStoreDataProvider.update({
      resource: 'object-store',
      id: 'current',
      variables: configuredDraft
    })).rejects.toMatchObject({
      statusCode: 502,
      code: 'OBJECT_STORE_CANONICAL_REREAD_MISSING'
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
      statusCode: 502,
      code: 'OBJECT_STORE_RESPONSE_INVALID'
    });
    expect(JSON.stringify(error)).not.toContain('secretKey');
  });

  it('rejects unsupported resources, ids, and actions before transport', async () => {
    await expect(objectStoreDataProvider.getOne({ resource: 'labels', id: 'current' }))
      .rejects.toMatchObject({ code: 'OBJECT_STORE_RESOURCE_UNSUPPORTED' });
    await expect(objectStoreDataProvider.getOne({ resource: 'object-store', id: 'other' }))
      .rejects.toMatchObject({ code: 'OBJECT_STORE_ID_INVALID' });
    await expect(objectStoreDataProvider.getList({ resource: 'object-store' }))
      .rejects.toMatchObject({ statusCode: 405, code: 'OBJECT_STORE_LIST_UNSUPPORTED' });
    await expect(objectStoreDataProvider.create({ resource: 'object-store', variables: configuredDraft }))
      .rejects.toMatchObject({ statusCode: 405, code: 'OBJECT_STORE_CREATE_UNSUPPORTED' });
    await expect(objectStoreDataProvider.deleteOne({ resource: 'object-store', id: 'current' }))
      .rejects.toMatchObject({ statusCode: 405, code: 'OBJECT_STORE_DELETE_UNSUPPORTED' });
    expect(objectStoreApi.loadObjectStore).not.toHaveBeenCalled();
    expect(objectStoreApi.saveObjectStore).not.toHaveBeenCalled();
  });
});
