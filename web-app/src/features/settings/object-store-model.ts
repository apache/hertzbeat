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

export type ObjectStoreType = 'DATABASE' | 'FILE' | 'OBS';

export type ObjectStoreConfig = {
  accessKey?: string;
  secretKey?: string;
  bucketName?: string;
  endpoint?: string;
  savePath?: string;
  [key: string]: unknown;
};

export type ObjectStoreDraft = {
  type: ObjectStoreType;
  config: ObjectStoreConfig;
};

export const objectStoreTypeDefinitions = [
  { value: 'DATABASE', labelKey: 'objectStore.type.database' },
  { value: 'FILE', labelKey: 'objectStore.type.file' },
  { value: 'OBS', labelKey: 'objectStore.type.obs' }
] as const satisfies readonly { value: ObjectStoreType; labelKey: string }[];

const obsFields = ['accessKey', 'secretKey', 'bucketName', 'endpoint', 'savePath'] as const;

function normalizeObjectStoreType(type?: string | null): ObjectStoreType {
  return type === 'FILE' || type === 'OBS' ? type : 'DATABASE';
}

export function createObjectStoreDraft(config?: { type?: string | null; config?: ObjectStoreConfig | null } | null): ObjectStoreDraft {
  return {
    type: normalizeObjectStoreType(config?.type),
    config: { ...(config?.config ?? {}) }
  };
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

export function buildObjectStorePayload(config: ObjectStoreDraft): ObjectStoreDraft {
  if (config.type !== 'OBS') return { type: config.type, config: {} };
  return {
    type: 'OBS',
    config: Object.fromEntries(obsFields.map(field => [field, String(config.config[field] ?? '').trim()]))
  };
}

export function isObjectStoreDirty(config: ObjectStoreDraft, baseline: ObjectStoreDraft) {
  return JSON.stringify(buildObjectStorePayload(config)) !== JSON.stringify(buildObjectStorePayload(baseline));
}
