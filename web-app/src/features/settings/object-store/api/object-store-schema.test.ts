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
import { parseObjectStoreDraft, parseObjectStoreReadModel } from './object-store-schema';

describe('object store response schema', () => {
  it('accepts a complete draft at the unknown-value boundary', () => {
    const draft = {
      type: 'OBS' as const,
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

  it.each([
    ['plaintext', 'private-schema-secret', true],
    ['trimmed plaintext', ' private-trimmed-secret ', true],
    ['empty', '', false],
    ['blank', '   ', false]
  ])('replaces an OBS %s wire secret with non-sensitive configured evidence', (_label, secretKey, configured) => {
    const result = parseObjectStoreReadModel({
      type: 'OBS',
      config: {
        accessKey: 'ak',
        secretKey,
        bucketName: 'bucket'
      }
    });

    expect(result).toEqual({
      type: 'OBS',
      config: { accessKey: 'ak', bucketName: 'bucket', secretConfigured: configured }
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('secretKey');
    if (secretKey.trim()) expect(serialized).not.toContain(secretKey.trim());
  });

  it('reports an absent OBS wire secret without inventing configured state', () => {
    expect(parseObjectStoreReadModel({ type: 'OBS', config: {} })).toEqual({
      type: 'OBS',
      config: { secretConfigured: false }
    });
  });

  it.each([{ type: 'DATABASE' }, { type: 'FILE', config: null }, { type: 'DATABASE', config: undefined }])(
    'normalizes a missing legacy config object for $type',
    wire => {
      expect(parseObjectStoreReadModel(wire)).toEqual({ type: wire.type, config: {} });
    }
  );

  it.each([
    { type: 'OTHER', config: { secretKey: 'private-type-secret' } },
    { type: 'OBS', config: ['private-array-secret'] },
    { type: 'OBS', config: { endpoint: 42, secretKey: 'private-field-secret' } }
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
