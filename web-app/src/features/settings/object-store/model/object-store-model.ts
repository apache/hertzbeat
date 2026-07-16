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

import {
  buildObjectStorePayload,
  type ObjectStoreConfig,
  type ObjectStoreType,
  type ObjectStoreWireConfig
} from '../api/object-store-api';

export type ObjectStoreDraft = {
  type: ObjectStoreType;
  config: ObjectStoreConfig;
};

export const objectStoreResourceId = 'current' as const;

export type ObjectStoreResourceRecord = ObjectStoreDraft & {
  id: typeof objectStoreResourceId;
};

export class ObjectStoreResourceContractError extends Error {
  constructor() {
    super('Object Store resource response is invalid');
    this.name = 'ObjectStoreResourceContractError';
  }
}

export type { ObjectStoreConfig, ObjectStoreType } from '../api/object-store-api';

export const objectStoreTypeDefinitions = [
  { value: 'DATABASE', labelKey: 'objectStore.type.database' },
  { value: 'FILE', labelKey: 'objectStore.type.file' },
  { value: 'OBS', labelKey: 'objectStore.type.obs' }
] as const satisfies readonly { value: ObjectStoreType; labelKey: string }[];

const obsFields = ['accessKey', 'secretKey', 'bucketName', 'endpoint', 'savePath'] as const;

function normalizeObjectStoreType(type?: string | null): ObjectStoreType {
  return type === 'FILE' || type === 'OBS' ? type : 'DATABASE';
}

export function createObjectStoreDraft(config?: ObjectStoreWireConfig | null): ObjectStoreDraft {
  return {
    type: normalizeObjectStoreType(config?.type),
    config: { ...(config?.config ?? {}) }
  };
}

export function createObjectStoreResourceRecord(
  config?: ObjectStoreWireConfig | null
): ObjectStoreResourceRecord {
  if (config == null) {
    return { id: objectStoreResourceId, type: 'DATABASE', config: {} };
  }
  if (typeof config !== 'object' || Array.isArray(config)) {
    throw new ObjectStoreResourceContractError();
  }
  if (config.type !== 'DATABASE' && config.type !== 'FILE' && config.type !== 'OBS') {
    throw new ObjectStoreResourceContractError();
  }
  if (config.config != null && !isPlainRecord(config.config)) {
    throw new ObjectStoreResourceContractError();
  }
  return {
    id: objectStoreResourceId,
    type: config.type,
    config: { ...(config.config ?? {}) }
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

export function changeObjectStoreType(config: ObjectStoreDraft, type: ObjectStoreType): ObjectStoreDraft {
  const normalized = normalizeObjectStoreType(type);
  if (config.type === normalized) return { ...config, type: normalized };
  return {
    type: normalized,
    config: normalized === 'OBS'
      ? { accessKey: '', secretKey: '', bucketName: '', endpoint: '', savePath: 'hertzbeat' }
      : {}
  };
}

export function updateObjectStoreField(config: ObjectStoreDraft, key: keyof ObjectStoreConfig, value: string): ObjectStoreDraft {
  return { ...config, config: { ...config.config, [key]: value } };
}

export function validateObjectStoreDraft(config: ObjectStoreDraft) {
  if (config.type !== 'OBS') return [];
  const missing = obsFields.filter(field => !String(config.config[field] ?? '').trim());
  const endpoint = String(config.config.endpoint ?? '').trim();
  if (endpoint && !isSupportedObsEndpoint(endpoint)) missing.push('endpoint');
  return missing;
}

function isSupportedObsEndpoint(endpoint: string) {
  try {
    return new URL(endpoint).hostname.endsWith('.myhuaweicloud.com');
  } catch {
    return false;
  }
}

export function isObjectStoreDirty(config: ObjectStoreDraft, baseline: ObjectStoreDraft) {
  return JSON.stringify(buildObjectStorePayload(config)) !== JSON.stringify(buildObjectStorePayload(baseline));
}
