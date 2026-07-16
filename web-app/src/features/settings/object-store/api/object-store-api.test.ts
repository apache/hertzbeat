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

const { apiMessageGet, apiMessagePost } = vi.hoisted(() => ({ apiMessageGet: vi.fn(), apiMessagePost: vi.fn() }));
vi.mock('@/core/http/api-message', () => ({ apiMessageGet, apiMessagePost }));

import { loadObjectStore, saveObjectStore } from './object-store-api';

describe('object store API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the established general configuration endpoint', async () => {
    apiMessageGet.mockResolvedValueOnce({ type: 'DATABASE', config: {} });
    apiMessagePost.mockResolvedValue('Update config success');
    await expect(loadObjectStore()).resolves.toEqual({ type: 'DATABASE', config: {} });
    await expect(saveObjectStore({ type: 'FILE', config: {} })).resolves.toBe('Update config success');
    await expect(saveObjectStore({
      type: 'OBS',
      config: {
        accessKey: ' access ',
        secretKey: ' secret ',
        bucketName: ' bucket ',
        endpoint: ' https://obs.cn-north-4.myhuaweicloud.com ',
        savePath: ' hertzbeat '
      }
    })).resolves.toBe('Update config success');
    expect(apiMessageGet).toHaveBeenCalledWith('/api/config/oss');
    expect(apiMessagePost).toHaveBeenCalledWith('/api/config/oss', { type: 'FILE', config: {} });
    expect(apiMessagePost).toHaveBeenLastCalledWith('/api/config/oss', {
      type: 'OBS',
      config: {
        accessKey: 'access',
        secretKey: 'secret',
        bucketName: 'bucket',
        endpoint: 'https://obs.cn-north-4.myhuaweicloud.com',
        savePath: 'hertzbeat'
      }
    });
    expect(apiMessagePost.mock.calls[1]?.[0]).not.toContain('secret');
  });
});
