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
const { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } = vi.hoisted(() => ({
  apiMessageDelete: vi.fn(),
  apiMessageGet: vi.fn(),
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn()
}));
vi.mock('@/core/http/api-message', () => ({ apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut }));
import { LabelContractError } from '../model/label-model';
import {
  buildLabelPayload,
  deleteLabel,
  findCanonicalLabel,
  LabelCanonicalProofLimitError,
  labelEndpoint,
  loadLabels,
  maximumLabelCanonicalProofPages,
  saveLabel
} from './label-api';

const label = {
  id: 7,
  name: 'env',
  tagValue: 'prod',
  description: null,
  type: 1,
  creator: null,
  modifier: null,
  gmtCreate: null,
  gmtUpdate: null
};

describe('label API', () => {
  beforeEach(() => vi.clearAllMocks());
  it('uses the established label endpoints', async () => {
    apiMessageGet.mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 20
    });
    apiMessagePost.mockResolvedValue(undefined);
    apiMessagePut.mockResolvedValue(undefined);
    apiMessageDelete.mockResolvedValue(undefined);
    await loadLabels({ search: '', pageIndex: 0, pageSize: 20 });
    await saveLabel({ name: 'env' }, true);
    await saveLabel({ id: 4, name: 'env', type: 1 }, false);
    await deleteLabel(4);
    expect(apiMessageGet).toHaveBeenCalledWith(`${labelEndpoint}?pageIndex=0&pageSize=20`);
    expect(apiMessagePost).toHaveBeenCalledWith(labelEndpoint, { name: 'env', tagValue: '', description: '', type: 1 });
    expect(apiMessagePut).toHaveBeenCalledWith(labelEndpoint, {
      id: 4,
      name: 'env',
      tagValue: '',
      description: '',
      type: 1
    });
    expect(apiMessageDelete).toHaveBeenCalledWith(`${labelEndpoint}?ids=4`);
  });

  it('trims the Label request payload at the transport boundary', () => {
    expect(buildLabelPayload({ name: ' env ', tagValue: ' prod ', description: ' primary ' }, true)).toEqual({
      name: 'env',
      tagValue: 'prod',
      description: 'primary',
      type: 1
    });
    expect(buildLabelPayload({ id: 7, name: ' env ', tagValue: '', description: '', type: 2 }, false)).toEqual({
      id: 7,
      name: 'env',
      tagValue: '',
      description: '',
      type: 2
    });
  });

  it('finds only an exact server record across paginated fuzzy search results', async () => {
    apiMessageGet
      .mockResolvedValueOnce({
        content: fuzzyLabels(100),
        totalElements: 101,
        totalPages: 2,
        number: 0,
        size: 100
      })
      .mockResolvedValueOnce({
        content: [{ id: 7, name: 'env', tagValue: 'prod', creator: 'server' }],
        totalElements: 101,
        totalPages: 2,
        number: 1,
        size: 100
      });

    await expect(findCanonicalLabel({ id: 7, name: ' env ', tagValue: ' prod ' })).resolves.toMatchObject({
      id: 7,
      name: 'env',
      tagValue: 'prod',
      creator: 'server'
    });
    expect(apiMessageGet).toHaveBeenNthCalledWith(1, `${labelEndpoint}?pageIndex=0&pageSize=100&search=env`);
    expect(apiMessageGet).toHaveBeenNthCalledWith(2, `${labelEndpoint}?pageIndex=1&pageSize=100&search=env`);
  });

  it('maps backend-nullable Label fields without weakening required identity fields', async () => {
    apiMessageGet.mockResolvedValue(page([label], { totalElements: 1 }));

    await expect(loadLabels({ search: '', pageIndex: 0, pageSize: 100 })).resolves.toEqual({
      content: [{ id: 7, name: 'env', tagValue: 'prod', type: 1 }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 100
    });
  });

  it.each([
    null,
    {},
    { content: null, totalElements: 0, totalPages: 0, number: 0, size: 100 },
    page([{ ...label, id: null }], { totalElements: 1 }),
    page([{ ...label, name: null }], { totalElements: 1 }),
    page([{ ...label, tagValue: 42 }], { totalElements: 1 }),
    page([], { totalElements: Number.NaN })
  ])('rejects malformed Label pages without echoing response contents', async wire => {
    apiMessageGet.mockResolvedValue(wire);

    let error: unknown;
    try {
      await loadLabels({ search: '', pageIndex: 0, pageSize: 100 });
    } catch (reason) {
      error = reason;
    }

    expect(error).toBeInstanceOf(LabelContractError);
    expect(JSON.stringify(error)).not.toContain('private-label-response');
  });

  it.each([page([], { number: 1 }), page([], { size: 50 }), page([], { totalElements: 101, totalPages: 1 })])(
    'rejects page metadata that does not identify the requested page',
    async wire => {
      apiMessageGet.mockResolvedValue(wire);

      await expect(loadLabels({ search: '', pageIndex: 0, pageSize: 100 })).rejects.toBeInstanceOf(LabelContractError);
    }
  );

  it.each([Number.NaN, -1, 1.5])('stops canonical proof after invalid first-page totalPages %s', async totalPages => {
    apiMessageGet.mockResolvedValueOnce(page([label], { totalElements: 1, totalPages }));

    await expect(findCanonicalLabel({ id: 7, name: 'env', tagValue: 'prod' })).rejects.toBeInstanceOf(
      LabelContractError
    );
    expect(apiMessageGet).toHaveBeenCalledTimes(1);
  });

  it.each([maximumLabelCanonicalProofPages + 1, 1_000_000])(
    'stops canonical proof after over-limit first-page totalPages %s',
    async totalPages => {
      apiMessageGet.mockResolvedValueOnce(
        page([label, ...fuzzyLabels(99)], {
          totalElements: totalPages * 100,
          totalPages
        })
      );

      await expect(findCanonicalLabel({ id: 7, name: 'env', tagValue: 'prod' })).rejects.toBeInstanceOf(
        LabelCanonicalProofLimitError
      );
      expect(apiMessageGet).toHaveBeenCalledTimes(1);
    }
  );

  it('validates first-page identity before accepting a matching record', async () => {
    apiMessageGet.mockResolvedValueOnce(page([label], { totalElements: 1, number: 1 }));

    await expect(findCanonicalLabel({ id: 7, name: 'env', tagValue: 'prod' })).rejects.toBeInstanceOf(
      LabelContractError
    );
    expect(apiMessageGet).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'totalElements',
      page([label, { id: 8, name: 'environment' }], {
        totalElements: 102,
        totalPages: 2,
        number: 1
      })
    ],
    [
      'totalPages',
      page([label, ...fuzzyLabels(99, 2_000)], {
        totalElements: 201,
        totalPages: 3,
        number: 1
      })
    ],
    [
      'number',
      page([label, ...fuzzyLabels(99, 3_000)], {
        totalElements: 101,
        totalPages: 2,
        number: 0
      })
    ],
    [
      'size',
      page([label, ...fuzzyLabels(49, 4_000)], {
        totalElements: 101,
        totalPages: 3,
        number: 1,
        size: 50
      })
    ]
  ])('rejects %s drift before accepting a later-page match', async (_field, secondPage) => {
    apiMessageGet
      .mockResolvedValueOnce(page(fuzzyLabels(100), { totalElements: 101, totalPages: 2 }))
      .mockResolvedValueOnce(secondPage);

    await expect(findCanonicalLabel({ id: 7, name: 'env', tagValue: 'prod' })).rejects.toBeInstanceOf(
      LabelContractError
    );
    expect(apiMessageGet).toHaveBeenCalledTimes(2);
  });

  it('rejects ambiguous exact records after completing the bounded page proof', async () => {
    apiMessageGet
      .mockResolvedValueOnce(page([label, ...fuzzyLabels(99)], { totalElements: 101, totalPages: 2 }))
      .mockResolvedValueOnce(
        page([label], {
          totalElements: 101,
          totalPages: 2,
          number: 1
        })
      );

    await expect(findCanonicalLabel({ name: 'env', tagValue: 'prod' })).rejects.toBeInstanceOf(LabelContractError);
    expect(apiMessageGet).toHaveBeenCalledTimes(2);
  });
});

function page(content: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    content,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    number: 0,
    size: 100,
    ...overrides
  };
}

function fuzzyLabels(count: number, idOffset = 1_000) {
  return Array.from({ length: count }, (_, index) => ({
    id: idOffset + index,
    name: `environment-${index}`,
    tagValue: 'prod'
  }));
}
