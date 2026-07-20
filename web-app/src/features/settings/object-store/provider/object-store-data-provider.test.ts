/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiMessageError } from '@/core/http/api-message';
import { createRefineHttpError } from '@/shared/refine/refine-http-error';

import type * as ObjectStoreApi from '../api/object-store-api';
import { ObjectStoreRequestFailure } from '../model/object-store-failure';
import {
  ObjectStoreResourceContractError,
  type ObjectStoreDraft,
  type ObjectStoreReadModel
} from '../model/object-store-model';

const canonical = vi.hoisted(() => ({ endpoint: '/canonical-object-store-endpoint' }));
const objectStoreApi = vi.hoisted(() => ({
  loadObjectStore: vi.fn<typeof ObjectStoreApi.loadObjectStore>(),
  saveObjectStore: vi.fn<typeof ObjectStoreApi.saveObjectStore>()
}));
vi.mock('../api/object-store-api', async importOriginal => ({
  ...(await importOriginal<typeof ObjectStoreApi>()),
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

    const result = await objectStoreDataProvider.getOne({ resource: 'object-store', id: 'current' });

    expect(result).toEqual({ data: { id: 'current', ...configuredRead } });
    expect(JSON.stringify(result)).not.toContain('secretKey');
  });

  it('sends plaintext only in the write and returns cache-safe canonical evidence', async () => {
    const plaintext = 'runtime-only-provider-secret';
    const write = { ...configuredDraft, config: { ...configuredDraft.config, secretKey: plaintext } };
    objectStoreApi.saveObjectStore.mockResolvedValue('Update config success');
    objectStoreApi.loadObjectStore.mockResolvedValue(configuredRead);

    const result = await objectStoreDataProvider.update({ resource: 'object-store', id: 'current', variables: write });

    expect(result).toEqual({ data: { id: 'current', ...configuredRead } });
    expect(JSON.stringify(result)).not.toContain(plaintext);
    expect(objectStoreApi.saveObjectStore).toHaveBeenCalledWith(write);
    expect(objectStoreApi.loadObjectStore).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed mutation variables before transport through the schema boundary', async () => {
    await expect(
      objectStoreDataProvider.update({
        resource: 'object-store',
        id: 'current',
        variables: { type: 'OBS', config: new Date() }
      })
    ).rejects.toMatchObject({
      code: 'OBJECT_STORE_VARIABLES_INVALID',
      kind: 'invalid',
      writeOutcome: 'rejected'
    });
    expect(objectStoreApi.saveObjectStore).not.toHaveBeenCalled();
  });

  it('fails the mutation when the authoritative reread fails after POST', async () => {
    objectStoreApi.saveObjectStore.mockResolvedValue('Update config success');
    objectStoreApi.loadObjectStore.mockRejectedValue(
      new ApiMessageError('secretKey=private-reread-secret', { cause: new TypeError('private-reread-cause') })
    );

    let error: unknown;
    try {
      await objectStoreDataProvider.update({ resource: 'object-store', id: 'current', variables: configuredDraft });
    } catch (reason) {
      error = reason;
    }

    expect(error).toMatchObject({
      code: 'OBJECT_STORE_CANONICAL_REREAD_FAILED',
      kind: 'invalid',
      message: 'Object Store request failed',
      writeOutcome: 'uncertain'
    });
    expect(JSON.stringify(error)).not.toContain('private-reread');
    expect((error as Error).cause).toBeUndefined();
    expect(objectStoreApi.saveObjectStore).toHaveBeenCalledTimes(1);
    expect(objectStoreApi.loadObjectStore).toHaveBeenCalledTimes(1);
  });

  it('marks a 4xx canonical reread as post-write uncertainty', async () => {
    objectStoreApi.saveObjectStore.mockResolvedValue('Update config success');
    objectStoreApi.loadObjectStore.mockRejectedValue(new ApiMessageError('Forbidden', { status: 403 }));

    await expect(
      objectStoreDataProvider.update({ resource: 'object-store', id: 'current', variables: configuredDraft })
    ).rejects.toMatchObject({ code: 'OBJECT_STORE_CANONICAL_REREAD_FAILED', writeOutcome: 'uncertain' });
  });

  it('fails closed when the post-write authoritative reread has no record', async () => {
    objectStoreApi.saveObjectStore.mockResolvedValue('Update config success');
    objectStoreApi.loadObjectStore.mockResolvedValue(null);

    await expect(
      objectStoreDataProvider.update({ resource: 'object-store', id: 'current', variables: configuredDraft })
    ).rejects.toMatchObject({ code: 'OBJECT_STORE_CANONICAL_REREAD_MISSING', writeOutcome: 'uncertain' });
  });

  it('sanitizes malformed backend records at the model-owned resource boundary', async () => {
    objectStoreApi.loadObjectStore.mockRejectedValue(new ObjectStoreResourceContractError());

    await expect(objectStoreDataProvider.getOne({ resource: 'object-store', id: 'current' })).rejects.toMatchObject({
      code: 'OBJECT_STORE_RESPONSE_INVALID',
      kind: 'invalid',
      writeOutcome: 'uncertain'
    });
  });

  it('rejects unsupported resources, ids, and actions before transport', async () => {
    await expect(objectStoreDataProvider.getOne({ resource: 'labels', id: 'current' })).rejects.toMatchObject({
      code: 'OBJECT_STORE_RESOURCE_UNSUPPORTED',
      writeOutcome: 'uncertain'
    });
    await expect(objectStoreDataProvider.getOne({ resource: 'object-store', id: 'other' })).rejects.toMatchObject({
      code: 'OBJECT_STORE_ID_INVALID',
      writeOutcome: 'uncertain'
    });
    await expect(objectStoreDataProvider.getList({ resource: 'object-store' })).rejects.toMatchObject({
      code: 'OBJECT_STORE_LIST_UNSUPPORTED',
      writeOutcome: 'uncertain'
    });
    await expect(
      objectStoreDataProvider.create({ resource: 'object-store', variables: configuredDraft })
    ).rejects.toMatchObject({ code: 'OBJECT_STORE_CREATE_UNSUPPORTED', writeOutcome: 'rejected' });
    await expect(objectStoreDataProvider.deleteOne({ resource: 'object-store', id: 'current' })).rejects.toMatchObject({
      code: 'OBJECT_STORE_DELETE_UNSUPPORTED',
      writeOutcome: 'rejected'
    });
    expect(objectStoreApi.loadObjectStore).not.toHaveBeenCalled();
    expect(objectStoreApi.saveObjectStore).not.toHaveBeenCalled();
  });

  it('treats an HTTP 200 business envelope as an uncertain write outcome', async () => {
    objectStoreApi.saveObjectStore.mockRejectedValue(
      new ApiMessageError('private-business', { code: 20, status: 200 })
    );

    await expect(
      objectStoreDataProvider.update({ resource: 'object-store', id: 'current', variables: configuredDraft })
    ).rejects.toMatchObject({ kind: 'error', writeOutcome: 'uncertain' });
  });

  it.each([
    ['HTTP source 4xx', createRefineHttpError('private', 400, undefined, 'http', 422), 'rejected'],
    ['display-only 4xx', createRefineHttpError('private', 400, 20, 'envelope', 200), 'uncertain'],
    ['contract', createRefineHttpError('private', 400, 'OBJECT_STORE_RESPONSE_INVALID', 'contract'), 'uncertain'],
    ['unexpected', createRefineHttpError('private', 500, 'REFINE_UNEXPECTED_ERROR', 'unexpected'), 'uncertain'],
    ['network', createRefineHttpError('private', 0, 'NETWORK_REQUEST_FAILED', 'network'), 'uncertain']
  ] as const)('uses source evidence for %s write classification', async (_label, failure, writeOutcome) => {
    objectStoreApi.saveObjectStore.mockRejectedValueOnce(failure);

    await expect(
      objectStoreDataProvider.update({ resource: 'object-store', id: 'current', variables: configuredDraft })
    ).rejects.toMatchObject({ writeOutcome });
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
