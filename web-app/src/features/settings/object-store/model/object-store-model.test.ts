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
  changeObjectStoreType,
  createObjectStoreDraft,
  createObjectStoreResourceRecord,
  isObjectStoreDirty,
  objectStoreResourceId,
  validateObjectStoreDraft
} from './object-store-model';

describe('object store model', () => {
  it('normalizes missing and unsupported configurations to database storage', () => {
    expect(createObjectStoreDraft()).toEqual({ type: 'DATABASE', config: {} });
    expect(createObjectStoreDraft({ type: 'OTHER', config: { stale: true } } as never))
      .toEqual({ type: 'DATABASE', config: {} });
  });

  it('resets provider-owned fields and supplies the master save path default', () => {
    const obs = changeObjectStoreType({ type: 'FILE', config: { stale: true } } as never, 'OBS');
    expect(obs).toEqual({ type: 'OBS', config: { accessKey: '', secretKey: '', bucketName: '', endpoint: '', savePath: 'hertzbeat' } });
    expect(changeObjectStoreType(obs, 'FILE')).toEqual({ type: 'FILE', config: {} });
  });

  it('requires every empty OBS field and trims the persisted payload', () => {
    const draft = changeObjectStoreType(createObjectStoreDraft(), 'OBS');
    expect(validateObjectStoreDraft(draft)).toEqual(['accessKey', 'secretKey', 'bucketName', 'endpoint']);
    const configured = { type: 'OBS' as const, config: { accessKey: ' ak ', secretKey: ' sk ', bucketName: ' bucket ', endpoint: ' https://obs.cn-north-4.myhuaweicloud.com ', savePath: ' hertzbeat/data ' } };
    expect(validateObjectStoreDraft(configured)).toEqual([]);
    expect(buildObjectStorePayload(configured)).toEqual({ type: 'OBS', config: { accessKey: 'ak', secretKey: 'sk', bucketName: 'bucket', endpoint: 'https://obs.cn-north-4.myhuaweicloud.com', savePath: 'hertzbeat/data' } });
    expect(validateObjectStoreDraft({
      ...configured,
      config: { ...configured.config, endpoint: 'https://obs.example.com' }
    })).toEqual(['endpoint']);
  });

  it('compares normalized drafts instead of object identity', () => {
    const baseline = { type: 'FILE' as const, config: {} };
    expect(isObjectStoreDirty(createObjectStoreDraft(baseline), baseline)).toBe(false);
    expect(isObjectStoreDirty(changeObjectStoreType(baseline, 'DATABASE'), baseline)).toBe(true);
  });

  it('owns the stable singleton resource identity used by Refine', () => {
    expect(objectStoreResourceId).toBe('current');
    expect(createObjectStoreResourceRecord({
      type: 'OBS',
      config: { accessKey: 'ak', secretConfigured: true, bucketName: 'bucket' }
    })).toEqual({
      id: 'current',
      type: 'OBS',
      config: { accessKey: 'ak', secretConfigured: true, bucketName: 'bucket' }
    });
    expect(createObjectStoreResourceRecord(null)).toEqual({
      id: 'current',
      type: 'DATABASE',
      config: {}
    });
  });

  it('creates an editable OBS draft without copying a configured server secret', () => {
    const record = createObjectStoreResourceRecord({
      type: 'OBS',
      config: {
        accessKey: 'ak',
        secretConfigured: true,
        bucketName: 'bucket'
      }
    });

    const draft = createObjectStoreDraft(record);

    expect(draft.config.secretKey).toBe('');
    expect(JSON.stringify(record)).not.toContain('secretKey');
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
