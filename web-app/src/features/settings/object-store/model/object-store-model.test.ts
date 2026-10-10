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

import { buildObjectStorePayload } from '../api/object-store-api';
import {
  canProveAmbiguousObjectStoreSave,
  changeObjectStoreType,
  createObjectStoreDraft,
  createObjectStoreResourceRecord,
  isObjectStoreDirty,
  objectStoreResourceId,
  objectStoreSaveConverged,
  userCanWriteObjectStore,
  validateObjectStoreDraft
} from './object-store-model';

describe('object store model', () => {
  it.each([
    [['ADMIN'], true],
    [['USER'], false],
    [['GUEST'], false],
    [[], false]
  ] as const)('maps roles %j to Object Store write capability %j', (roles, expected) => {
    expect(userCanWriteObjectStore(roles)).toBe(expected);
  });

  it('normalizes missing and unsupported configurations to database storage', () => {
    expect(createObjectStoreDraft()).toEqual({
      type: 'DATABASE',
      config: {},
      configuredSecrets: []
    });
    expect(createObjectStoreDraft({ type: 'OTHER', config: { stale: true } } as never)).toEqual({
      type: 'DATABASE',
      config: {},
      configuredSecrets: []
    });
  });

  it('resets provider-owned fields and supplies the master save path default', () => {
    const obs = changeObjectStoreType({ type: 'FILE', config: { stale: true } } as never, 'OBS');
    expect(obs).toEqual({
      type: 'OBS',
      config: { accessKey: '', secretKey: '', bucketName: '', endpoint: '', savePath: 'hertzbeat' },
      configuredSecrets: []
    });
    expect(changeObjectStoreType(obs, 'FILE')).toEqual({
      type: 'FILE',
      config: {},
      configuredSecrets: []
    });
  });

  it('requires every empty OBS field and trims the persisted payload', () => {
    const draft = changeObjectStoreType(createObjectStoreDraft(), 'OBS');
    expect(validateObjectStoreDraft(draft)).toEqual(['accessKey', 'secretKey', 'bucketName', 'endpoint']);
    const configured = {
      type: 'OBS' as const,
      configuredSecrets: [],
      config: {
        accessKey: ' ak ',
        secretKey: ' sk ',
        bucketName: ' bucket ',
        endpoint: ' https://obs.cn-north-4.myhuaweicloud.com ',
        savePath: ' hertzbeat/data '
      }
    };
    expect(validateObjectStoreDraft(configured)).toEqual([]);
    expect(buildObjectStorePayload(configured)).toEqual({
      type: 'OBS',
      config: {
        accessKey: 'ak',
        secretKey: 'sk',
        bucketName: 'bucket',
        endpoint: 'https://obs.cn-north-4.myhuaweicloud.com',
        savePath: 'hertzbeat/data'
      },
      clearSecrets: []
    });
    expect(
      validateObjectStoreDraft({
        ...configured,
        config: { ...configured.config, endpoint: 'https://obs.example.com' }
      })
    ).toEqual(['endpoint']);
    expect(
      validateObjectStoreDraft({
        ...configured,
        config: { ...configured.config, endpoint: 'http://obs.cn-north-4.myhuaweicloud.com' }
      })
    ).toEqual(['endpoint']);
    expect(
      validateObjectStoreDraft({
        ...configured,
        config: { ...configured.config, endpoint: 'https://obs.cn-north-4.myhuaweicloud.com/path' }
      })
    ).toEqual(['endpoint']);
  });

  it('compares normalized drafts instead of object identity', () => {
    const baseline = { type: 'FILE' as const, config: {}, configuredSecrets: [] };
    expect(isObjectStoreDirty(createObjectStoreDraft(baseline), baseline)).toBe(false);
    expect(isObjectStoreDirty(changeObjectStoreType(baseline, 'DATABASE'), baseline)).toBe(true);
  });

  it('owns the stable singleton resource identity used by Refine', () => {
    expect(objectStoreResourceId).toBe('current');
    expect(
      createObjectStoreResourceRecord({
        type: 'OBS',
        config: { bucketName: 'bucket' },
        configuredSecrets: ['accessKey', 'secretKey']
      })
    ).toEqual({
      id: 'current',
      type: 'OBS',
      config: { bucketName: 'bucket' },
      configuredSecrets: ['accessKey', 'secretKey']
    });
  });

  it('creates an editable OBS draft without copying a configured server secret', () => {
    const record = createObjectStoreResourceRecord({
      type: 'OBS',
      config: {
        bucketName: 'bucket'
      },
      configuredSecrets: ['accessKey', 'secretKey']
    });

    const draft = createObjectStoreDraft(record);

    expect(draft.config.accessKey).toBe('');
    expect(draft.config.secretKey).toBe('');
    expect(record.config).not.toHaveProperty('accessKey');
    expect(record.config).not.toHaveProperty('secretKey');
  });

  it('treats reread secret presence as evidence, never proof of an OBS plaintext replacement', () => {
    const draft = {
      type: 'OBS' as const,
      configuredSecrets: ['accessKey', 'secretKey'] as ('accessKey' | 'secretKey')[],
      config: {
        accessKey: 'ak',
        secretKey: 'runtime-only-secret',
        bucketName: 'bucket',
        endpoint: 'https://obs.cn-north-4.myhuaweicloud.com',
        savePath: 'hertzbeat'
      }
    };
    const reread = createObjectStoreResourceRecord({
      type: 'OBS',
      config: {
        bucketName: 'bucket',
        endpoint: 'https://obs.cn-north-4.myhuaweicloud.com',
        savePath: 'hertzbeat'
      },
      configuredSecrets: ['accessKey', 'secretKey']
    });

    expect(canProveAmbiguousObjectStoreSave(draft)).toBe(false);
    expect(objectStoreSaveConverged(draft, reread)).toBe(false);
    expect(JSON.stringify(reread)).not.toContain('runtime-only-secret');
    expect(reread.config).not.toHaveProperty('secretKey');
  });

  it('keeps both credentials fresh-entry-only and omits preserved values from writes', () => {
    const record = createObjectStoreResourceRecord({
      type: 'OBS',
      config: {
        bucketName: 'bucket',
        endpoint: 'https://obs.cn-north-4.myhuaweicloud.com',
        savePath: 'hertzbeat'
      },
      configuredSecrets: ['accessKey', 'secretKey']
    } as never);
    const draft = createObjectStoreDraft(record);

    expect(draft).toMatchObject({
      config: { accessKey: '', secretKey: '' },
      configuredSecrets: ['accessKey', 'secretKey']
    });
    expect(buildObjectStorePayload(draft)).toEqual({
      type: 'OBS',
      config: {
        bucketName: 'bucket',
        endpoint: 'https://obs.cn-north-4.myhuaweicloud.com',
        savePath: 'hertzbeat'
      },
      clearSecrets: []
    });
  });

  it('uses redacted GET only to prove an OBS edit that omitted both credentials', () => {
    const baseline = createObjectStoreResourceRecord({
      type: 'OBS',
      config: {
        bucketName: 'bucket',
        endpoint: 'https://obs.cn-north-4.myhuaweicloud.com',
        savePath: 'hertzbeat'
      },
      configuredSecrets: ['accessKey', 'secretKey']
    });
    const draft = {
      ...createObjectStoreDraft(baseline),
      config: { ...createObjectStoreDraft(baseline).config, savePath: 'hertzbeat/data' }
    };
    const reread = {
      ...baseline,
      config: { ...baseline.config, savePath: 'hertzbeat/data' }
    };

    expect(canProveAmbiguousObjectStoreSave(draft)).toBe(true);
    expect(objectStoreSaveConverged(draft, reread)).toBe(true);
  });

  it('rejects malformed non-null wire records without echoing their contents', () => {
    const malformed = [
      { type: 'OTHER', config: { secretKey: 'private-unknown-type' } },
      { type: 'OBS', config: ['private-array-config'] },
      { type: 'FILE', config: 'private-string-config' }
    ];

    for (const value of malformed) {
      let error: unknown;
      try {
        createObjectStoreResourceRecord(value as never);
      } catch (reason) {
        error = reason;
      }
      expect(error).toBeInstanceOf(Error);
      expect(JSON.stringify(error)).not.toContain('private-');
    }
  });
});
