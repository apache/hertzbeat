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
import { ObjectStoreResourceContractError } from '../model/object-store-model';

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

  it('removes the server secret before returning the read model', async () => {
    apiMessageGet.mockResolvedValueOnce({
      type: 'OBS',
      config: {
        accessKey: 'ak',
        secretKey: 'private-server-secret',
        bucketName: 'bucket',
        endpoint: 'https://obs.cn-north-4.myhuaweicloud.com',
        savePath: 'hertzbeat'
      }
    });

    const result = await loadObjectStore();

    expect(result).toEqual({
      type: 'OBS',
      config: {
        accessKey: 'ak',
        secretConfigured: true,
        bucketName: 'bucket',
        endpoint: 'https://obs.cn-north-4.myhuaweicloud.com',
        savePath: 'hertzbeat'
      }
    });
    expect(JSON.stringify(result)).not.toContain('private-server-secret');
    expect(JSON.stringify(result)).not.toContain('secretKey');
  });

  it.each([
    { type: 'OTHER', config: { secretKey: 'private-type-secret' } },
    { type: 'OBS', config: ['private-array-secret'] },
    { type: 'OBS', config: { accessKey: 42, secretKey: 'private-field-secret' } }
  ])('rejects malformed read contracts without echoing secret material', async wire => {
    apiMessageGet.mockResolvedValueOnce(wire);

    let error: unknown;
    try {
      await loadObjectStore();
    } catch (reason) {
      error = reason;
    }

    expect(error).toBeInstanceOf(ObjectStoreResourceContractError);
    expect(JSON.stringify(error)).not.toContain('private-');
  });

  it('rejects malformed mutation responses', async () => {
    apiMessagePost.mockResolvedValue({ message: 'Update config success' });

    await expect(saveObjectStore({ type: 'FILE', config: {} }))
      .rejects.toBeInstanceOf(ObjectStoreResourceContractError);
  });

  it.each(['', '   ', '******', '••••••', '__KEEP__', '<masked>', '[REDACTED]'])(
    'rejects OBS writes without a newly entered secret: %j',
    async secretKey => {
      await expect(saveObjectStore({
        type: 'OBS',
        config: {
          accessKey: 'ak',
          secretKey,
          bucketName: 'bucket',
          endpoint: 'https://obs.cn-north-4.myhuaweicloud.com',
          savePath: 'hertzbeat'
        }
      })).rejects.toBeInstanceOf(Error);
      expect(apiMessagePost).not.toHaveBeenCalled();
    }
  );
});
