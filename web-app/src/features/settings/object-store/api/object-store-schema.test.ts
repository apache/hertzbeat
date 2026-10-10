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

import { describe, expect, it } from 'vitest';

import { ObjectStoreDraftContractError, ObjectStoreResourceContractError } from '../model/object-store-model';
import {
  parseObjectStoreDraft,
  parseObjectStoreMutationResult,
  parseObjectStoreReadModel
} from './object-store-schema';

describe('object store response schema', () => {
  it('accepts a complete draft at the unknown-value boundary', () => {
    const draft = {
      type: 'OBS' as const,
      configuredSecrets: [],
      config: {
        accessKey: 'ak',
        secretKey: 'sk',
        bucketName: 'bucket',
        endpoint: 'https://example.test',
        savePath: 'hertzbeat'
      }
    };

    expect(parseObjectStoreDraft(draft)).toEqual(draft);
    expect(() => parseObjectStoreDraft(Object.create(draft) as unknown)).toThrow(ObjectStoreDraftContractError);
  });

  it.each([
    { type: 'OBS', config: new Date() },
    { type: 'OBS', config: [] },
    { type: 'OBS', config: {}, unexpected: 'private-extra-field' }
  ])('rejects malformed draft variables without echoing them', value => {
    let error: unknown;
    try {
      parseObjectStoreDraft(value);
    } catch (reason) {
      error = reason;
    }

    expect(error).toBeInstanceOf(ObjectStoreDraftContractError);
    expect(JSON.stringify(error)).not.toContain('private-extra-field');
  });

  it('accepts the exact redacted OBS response and its configuredSecrets name', () => {
    const wire = {
      type: 'OBS',
      config: {
        bucketName: 'bucket',
        endpoint: 'https://obs.cn-north-4.myhuaweicloud.com',
        savePath: 'hertzbeat'
      },
      configuredSecrets: ['accessKey', 'secretKey']
    };

    expect(parseObjectStoreReadModel(wire)).toEqual({
      type: 'OBS',
      config: wire.config,
      configuredSecrets: ['accessKey', 'secretKey']
    });
    expect(parseObjectStoreMutationResult(wire)).toEqual({
      type: 'OBS',
      config: wire.config,
      configuredSecrets: ['accessKey', 'secretKey']
    });
  });

  it.each(['DATABASE', 'FILE'] as const)('accepts the exact redacted %s response', type => {
    expect(parseObjectStoreReadModel({ type, config: null, configuredSecrets: [] })).toEqual({
      type,
      config: {},
      configuredSecrets: []
    });
  });

  it.each([
    { type: 'OBS', config: { bucketName: 'bucket', endpoint: 'endpoint', savePath: 'path' } },
    {
      type: 'OBS',
      config: {
        accessKey: 'private-access',
        bucketName: 'bucket',
        endpoint: 'endpoint',
        savePath: 'path'
      },
      configuredSecrets: ['accessKey']
    },
    {
      type: 'OBS',
      config: {
        secretKey: 'private-secret',
        bucketName: 'bucket',
        endpoint: 'endpoint',
        savePath: 'path'
      },
      configuredSecrets: ['secretKey']
    },
    { type: 'FILE', config: {}, configuredSecrets: [] },
    { type: 'OBS', config: ['private-array-secret'], configuredSecrets: [] },
    { type: 'OBS', config: { bucketName: 'bucket', endpoint: 42, savePath: 'path' }, configuredSecrets: [] }
  ])('fails closed without echoing malformed response data', wire => {
    let error: unknown;
    try {
      parseObjectStoreReadModel(wire);
    } catch (reason) {
      error = reason;
    }

    expect(error).toBeInstanceOf(ObjectStoreResourceContractError);
    expect(JSON.stringify(error)).not.toContain('private-');
  });
});
