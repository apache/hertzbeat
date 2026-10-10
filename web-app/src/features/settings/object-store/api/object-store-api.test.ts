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
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessageGet,
  apiMessagePost
}));

import { ApiMessageError } from '@/core/http/api-message';

import { loadObjectStore, saveObjectStore } from './object-store-api';

describe('object store API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('consumes authoritative redacted GET and POST responses', async () => {
    const database = { type: 'DATABASE', config: null, configuredSecrets: [] };
    const file = { type: 'FILE', config: null, configuredSecrets: [] };
    apiMessageGet.mockResolvedValueOnce(database);
    apiMessagePost.mockResolvedValue(file);
    await expect(loadObjectStore()).resolves.toEqual({ type: 'DATABASE', config: {}, configuredSecrets: [] });
    await expect(saveObjectStore({ type: 'FILE', config: {}, configuredSecrets: [] })).resolves.toEqual({
      type: 'FILE',
      config: {},
      configuredSecrets: []
    });
    await expect(
      saveObjectStore({
        type: 'OBS',
        configuredSecrets: [],
        config: {
          accessKey: ' access ',
          secretKey: ' secret ',
          bucketName: ' bucket ',
          endpoint: ' https://obs.cn-north-4.myhuaweicloud.com ',
          savePath: ' hertzbeat '
        }
      })
    ).resolves.toEqual({ type: 'FILE', config: {}, configuredSecrets: [] });
    expect(apiMessageGet).toHaveBeenCalledWith('/api/config/oss');
    expect(apiMessagePost).toHaveBeenCalledWith('/api/config/oss', { type: 'FILE', config: {}, clearSecrets: [] });
    expect(apiMessagePost).toHaveBeenLastCalledWith('/api/config/oss', {
      type: 'OBS',
      config: {
        accessKey: 'access',
        secretKey: 'secret',
        bucketName: 'bucket',
        endpoint: 'https://obs.cn-north-4.myhuaweicloud.com',
        savePath: 'hertzbeat'
      },
      clearSecrets: []
    });
    expect(apiMessagePost.mock.calls[1]?.[0]).not.toContain('secret');
  });

  it('rejects a response that contains either server credential instead of stripping it', async () => {
    apiMessageGet.mockResolvedValueOnce({
      type: 'OBS',
      config: {
        accessKey: 'private-server-access',
        secretKey: 'private-server-secret',
        bucketName: 'bucket',
        endpoint: 'https://obs.cn-north-4.myhuaweicloud.com',
        savePath: 'hertzbeat'
      },
      configuredSecrets: ['accessKey', 'secretKey']
    });

    await expect(loadObjectStore()).rejects.toMatchObject({
      kind: 'invalid',
      writeOutcome: 'uncertain'
    });
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

    expect(error).toMatchObject({ kind: 'invalid', writeOutcome: 'uncertain' });
    expect(JSON.stringify(error)).not.toContain('private-');
  });

  it('rejects malformed mutation responses', async () => {
    apiMessagePost.mockResolvedValue('Update config success');

    await expect(saveObjectStore({ type: 'FILE', config: {}, configuredSecrets: [] })).rejects.toMatchObject({
      kind: 'invalid',
      writeOutcome: 'uncertain'
    });
  });

  it.each(['', '   ', '******', '••••••', '__KEEP__', '<masked>', '[REDACTED]'])(
    'rejects OBS writes without a newly entered secret: %j',
    async secretKey => {
      await expect(
        saveObjectStore({
          type: 'OBS',
          configuredSecrets: [],
          config: {
            accessKey: 'ak',
            secretKey,
            bucketName: 'bucket',
            endpoint: 'https://obs.cn-north-4.myhuaweicloud.com',
            savePath: 'hertzbeat'
          }
        })
      ).rejects.toMatchObject({ kind: 'invalid', writeOutcome: 'rejected' });
      expect(apiMessagePost).not.toHaveBeenCalled();
    }
  );

  it('normalizes transport evidence at every Object Store API operation boundary', async () => {
    const failure = () => new ApiMessageError('secretKey=private-network-evidence');
    const expected = { kind: 'unavailable', writeOutcome: 'uncertain' };
    apiMessageGet.mockRejectedValueOnce(failure());
    apiMessagePost.mockRejectedValueOnce(failure());

    await expect(loadObjectStore()).rejects.toMatchObject(expected);
    await expect(saveObjectStore({ type: 'FILE', config: {}, configuredSecrets: [] })).rejects.toMatchObject(expected);
  });
});
