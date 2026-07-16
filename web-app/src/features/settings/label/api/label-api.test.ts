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
const { apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut } = vi.hoisted(() => ({ apiMessageDelete: vi.fn(), apiMessageGet: vi.fn(), apiMessagePost: vi.fn(), apiMessagePut: vi.fn() }));
vi.mock('@/core/http/api-message', () => ({ apiMessageDelete, apiMessageGet, apiMessagePost, apiMessagePut }));
import { deleteLabel, findCanonicalLabel, loadLabels, saveLabel } from './label-api';

describe('label API', () => {
  beforeEach(() => vi.clearAllMocks());
  it('uses the established label endpoints', async () => {
    apiMessageGet.mockResolvedValue({ content: [], totalElements: 0 });
    apiMessagePost.mockResolvedValue(undefined);
    apiMessagePut.mockResolvedValue(undefined);
    apiMessageDelete.mockResolvedValue(undefined);
    await loadLabels({ search: '', pageIndex: 0, pageSize: 20 });
    await saveLabel({ name: 'env' }, true);
    await saveLabel({ id: 4, name: 'env', type: 1 }, false);
    await deleteLabel(4);
    expect(apiMessageGet).toHaveBeenCalledWith('/api/label?pageIndex=0&pageSize=20');
    expect(apiMessagePost).toHaveBeenCalledWith('/api/label', { name: 'env', tagValue: '', description: '', type: 1 });
    expect(apiMessagePut).toHaveBeenCalledWith('/api/label', { id: 4, name: 'env', tagValue: '', description: '', type: 1 });
    expect(apiMessageDelete).toHaveBeenCalledWith('/api/label?ids=4');
  });

  it('finds only an exact server record across paginated fuzzy search results', async () => {
    apiMessageGet
      .mockResolvedValueOnce({
        content: [{ id: 2, name: 'environment', tagValue: 'prod' }],
        totalElements: 2,
        totalPages: 2,
        number: 0,
        size: 100
      })
      .mockResolvedValueOnce({
        content: [{ id: 7, name: 'env', tagValue: 'prod', creator: 'server' }],
        totalElements: 2,
        totalPages: 2,
        number: 1,
        size: 100
      });

    await expect(findCanonicalLabel({ id: 7, name: ' env ', tagValue: ' prod ' }))
      .resolves.toMatchObject({ id: 7, name: 'env', tagValue: 'prod', creator: 'server' });
    expect(apiMessageGet).toHaveBeenNthCalledWith(1, '/api/label?pageIndex=0&pageSize=100&search=env');
    expect(apiMessageGet).toHaveBeenNthCalledWith(2, '/api/label?pageIndex=1&pageSize=100&search=env');
  });
});
