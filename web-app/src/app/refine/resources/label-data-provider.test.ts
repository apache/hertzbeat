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
import { LabelContractError, type LabelRecord } from '@/features/settings/label/model/label-model';

type LabelApi = typeof import('@/features/settings/label/api/label-api');
const canonical = vi.hoisted(() => ({ endpoint: '/canonical-label-endpoint' }));
const labelApi = vi.hoisted(() => ({
  deleteLabel: vi.fn<LabelApi['deleteLabel']>(),
  findCanonicalLabel: vi.fn<LabelApi['findCanonicalLabel']>(),
  loadLabels: vi.fn<LabelApi['loadLabels']>(),
  saveLabel: vi.fn<LabelApi['saveLabel']>()
}));
vi.mock('@/features/settings/label/api/label-api', async importOriginal => ({
  ...(await importOriginal<LabelApi>()),
  ...labelApi,
  labelEndpoint: canonical.endpoint
}));

import { labelDataProvider } from './label-data-provider';

const serverLabel: LabelRecord = {
  id: 7,
  name: 'env',
  tagValue: 'prod',
  description: 'Server canonical',
  creator: 'server',
  gmtUpdate: 42
};

describe('Label Refine data provider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the endpoint owned by the Label API', () => {
    expect(labelDataProvider.getApiUrl()).toBe(canonical.endpoint);
  });

  it('translates only the Label list contract and its 1-based pagination', async () => {
    labelApi.loadLabels.mockResolvedValue({
      content: [serverLabel],
      totalElements: 1,
      totalPages: 1,
      number: 1,
      size: 50
    });

    await expect(
      labelDataProvider.getList<LabelRecord>({
        resource: 'labels',
        pagination: { currentPage: 2, pageSize: 50, mode: 'server' },
        filters: [{ field: 'search', operator: 'contains', value: ' env ' }]
      })
    ).resolves.toEqual({ data: [serverLabel], total: 1 });
    expect(labelApi.loadLabels).toHaveBeenCalledWith({ search: 'env', pageIndex: 1, pageSize: 50 });
  });

  it('fails unsupported resource, sorter, filter, and getOne without transport', async () => {
    await expect(labelDataProvider.getList({ resource: 'tokens' })).rejects.toMatchObject({
      statusCode: 400,
      code: 'LABEL_RESOURCE_UNSUPPORTED'
    });
    await expect(
      labelDataProvider.getList({
        resource: 'labels',
        sorters: [{ field: 'name', order: 'asc' }]
      })
    ).rejects.toMatchObject({ code: 'LABEL_SORT_UNSUPPORTED' });
    await expect(
      labelDataProvider.getList({
        resource: 'labels',
        filters: [{ field: 'type', operator: 'eq', value: 1 }]
      })
    ).rejects.toMatchObject({ code: 'LABEL_FILTER_UNSUPPORTED' });
    await expect(labelDataProvider.getOne({ resource: 'labels', id: 7 })).rejects.toMatchObject({
      statusCode: 405,
      code: 'LABEL_GET_ONE_UNSUPPORTED'
    });
    expect(labelApi.loadLabels).not.toHaveBeenCalled();
    expect(labelApi.saveLabel).not.toHaveBeenCalled();
    expect(labelApi.deleteLabel).not.toHaveBeenCalled();
  });

  it('fails invalid pagination, ids, and delete variables before transport', async () => {
    await expect(
      labelDataProvider.getList({
        resource: 'labels',
        pagination: { currentPage: 0, pageSize: 20, mode: 'server' }
      })
    ).rejects.toMatchObject({ code: 'LABEL_PAGINATION_INVALID' });
    await expect(
      labelDataProvider.update({
        resource: 'labels',
        id: '7',
        variables: { name: 'env', tagValue: 'prod' }
      })
    ).rejects.toMatchObject({ code: 'LABEL_ID_INVALID' });
    await expect(
      labelDataProvider.deleteOne({
        resource: 'labels',
        id: 7
      })
    ).rejects.toMatchObject({ code: 'LABEL_VARIABLES_INVALID' });
    expect(labelApi.loadLabels).not.toHaveBeenCalled();
    expect(labelApi.saveLabel).not.toHaveBeenCalled();
    expect(labelApi.findCanonicalLabel).not.toHaveBeenCalled();
    expect(labelApi.deleteLabel).not.toHaveBeenCalled();
  });

  it('rereads server canonical data after void create and update mutations', async () => {
    labelApi.saveLabel.mockResolvedValue(undefined);
    labelApi.findCanonicalLabel.mockResolvedValue(serverLabel);

    await expect(
      labelDataProvider.create<LabelRecord, Partial<LabelRecord>>({
        resource: 'labels',
        variables: { name: ' env ', tagValue: ' prod ', description: 'request value' }
      })
    ).resolves.toEqual({ data: serverLabel });
    await expect(
      labelDataProvider.update<LabelRecord, Partial<LabelRecord>>({
        resource: 'labels',
        id: 7,
        variables: { name: ' env ', tagValue: ' prod ', description: 'new request value' }
      })
    ).resolves.toEqual({ data: serverLabel });
    expect(labelApi.saveLabel).toHaveBeenNthCalledWith(1, expect.objectContaining({ name: ' env ' }), true);
    expect(labelApi.saveLabel).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 7 }), false);
    expect(labelApi.findCanonicalLabel).toHaveBeenNthCalledWith(1, { name: 'env', tagValue: 'prod' });
    expect(labelApi.findCanonicalLabel).toHaveBeenNthCalledWith(2, { id: 7, name: 'env', tagValue: 'prod' });
  });

  it('fails closed when a void mutation cannot be reread canonically', async () => {
    labelApi.saveLabel.mockResolvedValue(undefined);
    labelApi.findCanonicalLabel.mockResolvedValue(undefined);

    await expect(
      labelDataProvider.create({
        resource: 'labels',
        variables: { name: 'env', tagValue: 'prod' }
      })
    ).rejects.toMatchObject({ statusCode: 502, code: 'LABEL_CANONICAL_REREAD_MISSING' });
  });

  it('sanitizes canonical reread transport failures after the completed mutation', async () => {
    labelApi.saveLabel.mockResolvedValue(undefined);
    labelApi.findCanonicalLabel.mockRejectedValue(
      new ApiMessageError('token=private-reread-token', { cause: new TypeError('private-reread-cause') })
    );

    let error: unknown;
    try {
      await labelDataProvider.create({
        resource: 'labels',
        variables: { name: 'env', tagValue: 'prod' }
      });
    } catch (reason) {
      error = reason;
    }
    expect(error).toMatchObject({
      message: 'Network request failed',
      statusCode: 0,
      code: 'NETWORK_REQUEST_FAILED'
    });
    expect(JSON.stringify(error)).not.toContain('private-reread');
    expect(labelApi.saveLabel).toHaveBeenCalledTimes(1);
    expect(labelApi.findCanonicalLabel).toHaveBeenCalledTimes(1);
    expect(labelApi.loadLabels).not.toHaveBeenCalled();
    expect(labelApi.deleteLabel).not.toHaveBeenCalled();
  });

  it('deletes a server record pessimistically and confirms canonical absence', async () => {
    labelApi.findCanonicalLabel.mockResolvedValueOnce(serverLabel).mockResolvedValueOnce(undefined);
    labelApi.deleteLabel.mockResolvedValue(undefined);

    await expect(
      labelDataProvider.deleteOne<LabelRecord, LabelRecord>({
        resource: 'labels',
        id: 7,
        variables: serverLabel
      })
    ).resolves.toEqual({ data: serverLabel });
    expect(labelApi.findCanonicalLabel).toHaveBeenNthCalledWith(1, {
      id: 7,
      name: 'env',
      tagValue: 'prod'
    });
    expect(labelApi.deleteLabel).toHaveBeenCalledWith(7);
    expect(labelApi.findCanonicalLabel).toHaveBeenCalledTimes(2);
  });

  it('converts transport errors without exposing secret-shaped messages', async () => {
    labelApi.loadLabels.mockRejectedValue(
      new ApiMessageError('token=private-provider-token', { cause: new TypeError('private-provider-cause') })
    );

    let error: unknown;
    try {
      await labelDataProvider.getList({ resource: 'labels' });
    } catch (reason) {
      error = reason;
    }
    expect(error).toMatchObject({
      message: 'Network request failed',
      statusCode: 0,
      code: 'NETWORK_REQUEST_FAILED'
    });
    expect(JSON.stringify(error)).not.toContain('private-provider');
  });

  it('maps malformed read contracts to a stable sanitized provider error', async () => {
    labelApi.loadLabels.mockRejectedValue(new LabelContractError());

    await expect(labelDataProvider.getList({ resource: 'labels' })).rejects.toMatchObject({
      message: 'Label response is invalid',
      statusCode: 502,
      code: 'LABEL_RESPONSE_INVALID'
    });
  });
});
