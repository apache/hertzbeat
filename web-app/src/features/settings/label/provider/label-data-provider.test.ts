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

import { LabelTransportFailure } from '../api/label-api-failure';
import { LabelRequestFailure } from '../model/label-failure';
import { LabelContractError, LabelRequestContractError, type LabelRecord } from '../model/label-model';

type LabelApi = typeof import('../api/label-api');
const canonical = vi.hoisted(() => ({ endpoint: '/canonical-label-endpoint' }));
const labelApi = vi.hoisted(() => ({
  deleteLabel: vi.fn<LabelApi['deleteLabel']>(),
  findCanonicalLabel: vi.fn<LabelApi['findCanonicalLabel']>(),
  loadLabels: vi.fn<LabelApi['loadLabels']>(),
  saveLabel: vi.fn<LabelApi['saveLabel']>()
}));
vi.mock('../api/label-api', async importOriginal => ({
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
  gmtUpdate: '2026-07-18T10:30:00'
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
    await expect(
      labelDataProvider.create({
        resource: 'labels',
        variables: { name: 'env', description: 42 }
      })
    ).rejects.toMatchObject({ code: 'LABEL_VARIABLES_INVALID' });
    await expect(
      labelDataProvider.update({
        resource: 'labels',
        id: 7,
        variables: { name: 'env', type: 'user' }
      })
    ).rejects.toMatchObject({ code: 'LABEL_VARIABLES_INVALID' });
    await expect(
      labelDataProvider.create({ resource: 'labels', variables: Object.create({ name: 'inherited' }) })
    ).rejects.toMatchObject({ code: 'LABEL_VARIABLES_INVALID' });
    expect(labelApi.loadLabels).not.toHaveBeenCalled();
    expect(labelApi.saveLabel).not.toHaveBeenCalled();
    expect(labelApi.findCanonicalLabel).not.toHaveBeenCalled();
    expect(labelApi.deleteLabel).not.toHaveBeenCalled();
  });

  it('rereads server canonical data after void create and update mutations', async () => {
    const createdLabel = { ...serverLabel, description: 'request value' };
    const updatedLabel = { ...serverLabel, description: 'new request value' };
    labelApi.saveLabel.mockResolvedValue(null);
    labelApi.findCanonicalLabel.mockResolvedValueOnce(createdLabel).mockResolvedValueOnce(updatedLabel);

    await expect(
      labelDataProvider.create<LabelRecord, Partial<LabelRecord>>({
        resource: 'labels',
        variables: { id: 999, name: ' env ', tagValue: ' prod ', description: 'request value', creator: 'client' }
      })
    ).resolves.toEqual({ data: createdLabel });
    await expect(
      labelDataProvider.update<LabelRecord, Partial<LabelRecord>>({
        resource: 'labels',
        id: 7,
        variables: { name: ' env ', tagValue: ' prod ', description: 'new request value' }
      })
    ).resolves.toEqual({ data: updatedLabel });
    expect(labelApi.saveLabel).toHaveBeenNthCalledWith(
      1,
      { name: ' env ', tagValue: ' prod ', description: 'request value' },
      true
    );
    expect(labelApi.saveLabel).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 7 }), false);
    expect(labelApi.findCanonicalLabel).toHaveBeenNthCalledWith(1, { name: 'env', tagValue: 'prod' });
    expect(labelApi.findCanonicalLabel).toHaveBeenNthCalledWith(2, { id: 7, name: 'env', tagValue: 'prod' });
  });

  it('does not accept a matching id with stale writable values as update proof', async () => {
    labelApi.saveLabel.mockResolvedValue(null);
    labelApi.findCanonicalLabel.mockResolvedValue(serverLabel);

    await expect(
      labelDataProvider.update({
        resource: 'labels',
        id: 7,
        variables: { name: 'env', tagValue: 'prod', description: 'new value' }
      })
    ).rejects.toMatchObject({
      name: 'LabelRequestFailure',
      kind: 'invalid',
      writeOutcome: 'uncertain',
      code: 'LABEL_CANONICAL_NOT_CONVERGED',
      evidence: { operation: 'update', phase: 'proof', recovery: 'proof', identity: { id: 7 } }
    });
  });

  it('marks a create without a canonical server id as commit-uncertain', async () => {
    labelApi.saveLabel.mockResolvedValue(null);
    labelApi.findCanonicalLabel.mockResolvedValue(undefined);

    await expect(
      labelDataProvider.create({
        resource: 'labels',
        variables: { name: 'env', tagValue: 'prod' }
      })
    ).rejects.toMatchObject({
      name: 'LabelRequestFailure',
      kind: 'invalid',
      writeOutcome: 'uncertain',
      code: 'LABEL_CANONICAL_REREAD_MISSING',
      evidence: {
        operation: 'create',
        phase: 'proof',
        recovery: 'commit-uncertain',
        identity: { name: 'env', tagValue: 'prod' }
      }
    });
  });

  it('retains exact-id proof evidence when an update canonical reread fails', async () => {
    labelApi.saveLabel.mockResolvedValue(null);
    labelApi.findCanonicalLabel.mockRejectedValue(new LabelTransportFailure('unavailable'));

    let error: unknown;
    try {
      await labelDataProvider.update({
        resource: 'labels',
        id: 7,
        variables: { name: 'env', tagValue: 'prod' }
      });
    } catch (reason) {
      error = reason;
    }
    expect(error).toBeInstanceOf(LabelRequestFailure);
    expect(error).toMatchObject({
      kind: 'unavailable',
      writeOutcome: 'uncertain',
      evidence: {
        operation: 'update',
        phase: 'proof',
        recovery: 'proof',
        identity: { id: 7, name: 'env', tagValue: 'prod' }
      }
    });
    expect(labelApi.saveLabel).toHaveBeenCalledTimes(1);
    expect(labelApi.findCanonicalLabel).toHaveBeenCalledTimes(1);
    expect(labelApi.loadLabels).not.toHaveBeenCalled();
    expect(labelApi.deleteLabel).not.toHaveBeenCalled();
  });

  it('marks only an explicit 4xx write rejection as safe to rewrite', async () => {
    labelApi.saveLabel.mockRejectedValue(new LabelTransportFailure('rejected', { status: 409 }));

    await expect(
      labelDataProvider.create({ resource: 'labels', variables: { name: 'env', tagValue: 'prod' } })
    ).rejects.toMatchObject({
      name: 'LabelRequestFailure',
      writeOutcome: 'rejected',
      evidence: { operation: 'create', phase: 'write', recovery: 'rewrite' }
    });
    expect(labelApi.findCanonicalLabel).not.toHaveBeenCalled();
  });

  it('marks a local write-request contract failure as not attempted', async () => {
    labelApi.saveLabel.mockRejectedValue(new LabelRequestContractError('Label write request is invalid'));

    await expect(
      labelDataProvider.create({ resource: 'labels', variables: { name: 'env', tagValue: 'prod' } })
    ).rejects.toMatchObject({
      name: 'LabelRequestFailure',
      kind: 'invalid',
      writeOutcome: 'not-attempted',
      evidence: { operation: 'create', phase: 'write', recovery: 'rewrite' }
    });
    expect(labelApi.findCanonicalLabel).not.toHaveBeenCalled();
  });

  it('marks rejected Refine mutation input as not attempted', async () => {
    await expect(
      labelDataProvider.create({ resource: 'labels', variables: { name: 'env', description: 42 } })
    ).rejects.toMatchObject({
      name: 'LabelRequestFailure',
      kind: 'invalid',
      writeOutcome: 'not-attempted',
      code: 'LABEL_VARIABLES_INVALID'
    });
    expect(labelApi.saveLabel).not.toHaveBeenCalled();
    expect(labelApi.findCanonicalLabel).not.toHaveBeenCalled();
  });

  it('does not trust a rejected label without explicit 4xx transport evidence', async () => {
    labelApi.saveLabel.mockRejectedValue(new LabelTransportFailure('rejected'));

    await expect(
      labelDataProvider.create({ resource: 'labels', variables: { name: 'env', tagValue: 'prod' } })
    ).rejects.toMatchObject({
      name: 'LabelRequestFailure',
      writeOutcome: 'uncertain',
      evidence: { operation: 'create', phase: 'write', recovery: 'commit-uncertain' }
    });
  });

  it.each([
    ['timeout response', new LabelTransportFailure('unavailable', { status: 408 })],
    ['cause-bearing client response', new LabelTransportFailure('unavailable', { status: 409 })],
    ['business envelope', new LabelTransportFailure('error', { status: 200 })]
  ])('retains write proof after an uncertain %s', async (_label, failure) => {
    labelApi.saveLabel.mockRejectedValue(failure);

    await expect(
      labelDataProvider.update({
        resource: 'labels',
        id: 7,
        variables: { name: 'env', tagValue: 'prod' }
      })
    ).rejects.toMatchObject({
      name: 'LabelRequestFailure',
      writeOutcome: 'uncertain',
      evidence: { operation: 'update', phase: 'write', recovery: 'proof' }
    });
    expect(labelApi.saveLabel).toHaveBeenCalledTimes(1);
    expect(labelApi.findCanonicalLabel).not.toHaveBeenCalled();
  });

  it('deletes a server record pessimistically and confirms canonical absence', async () => {
    labelApi.findCanonicalLabel.mockResolvedValueOnce(serverLabel).mockResolvedValueOnce(undefined);
    labelApi.deleteLabel.mockResolvedValue(null);

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

  it('turns ambiguous DELETE and delete-proof failures into exact proof-only evidence', async () => {
    labelApi.findCanonicalLabel.mockResolvedValueOnce(serverLabel);
    labelApi.deleteLabel.mockRejectedValueOnce(new LabelTransportFailure('unavailable'));

    await expect(
      labelDataProvider.deleteOne<LabelRecord, LabelRecord>({
        resource: 'labels',
        id: 7,
        variables: serverLabel
      })
    ).rejects.toMatchObject({
      name: 'LabelRequestFailure',
      writeOutcome: 'uncertain',
      evidence: {
        operation: 'delete',
        phase: 'write',
        recovery: 'proof',
        identity: { id: 7, name: 'env', tagValue: 'prod' }
      }
    });

    vi.clearAllMocks();
    labelApi.findCanonicalLabel
      .mockResolvedValueOnce(serverLabel)
      .mockRejectedValueOnce(new LabelTransportFailure('unavailable'));
    labelApi.deleteLabel.mockResolvedValue(null);

    await expect(
      labelDataProvider.deleteOne<LabelRecord, LabelRecord>({
        resource: 'labels',
        id: 7,
        variables: serverLabel
      })
    ).rejects.toMatchObject({
      evidence: {
        operation: 'delete',
        phase: 'proof',
        recovery: 'proof',
        identity: { id: 7, name: 'env', tagValue: 'prod' }
      }
    });
    expect(labelApi.deleteLabel).toHaveBeenCalledTimes(1);
  });

  it('converts transport errors without exposing secret-shaped messages', async () => {
    labelApi.loadLabels.mockRejectedValue(
      new ApiMessageError('token=private-provider-token', {
        status: 422,
        cause: new TypeError('private-provider-cause')
      })
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
      httpStatus: undefined,
      code: 'NETWORK_REQUEST_FAILED',
      kind: 'network'
    });
    expect(JSON.stringify(error)).not.toContain('private-provider');
  });

  it('maps malformed read contracts to a stable sanitized provider error', async () => {
    labelApi.loadLabels.mockRejectedValue(new LabelContractError());

    await expect(labelDataProvider.getList({ resource: 'labels' })).rejects.toMatchObject({
      name: 'LabelRequestFailure',
      kind: 'invalid',
      writeOutcome: 'uncertain',
      code: 'LABEL_RESPONSE_INVALID'
    });
  });
});
