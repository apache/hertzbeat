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

/** Safe configuration returned by reads. It must never represent secret plaintext. */
export type ObjectStoreReadConfig = {
  accessKey?: string;
  bucketName?: string;
  endpoint?: string;
  savePath?: string;
  secretConfigured?: boolean;
};

export type ObjectStoreReadModel = {
  type: ObjectStoreType;
  config: ObjectStoreReadConfig;
};

/** Editable configuration whose secret exists only in the current browser session. */
export type ObjectStoreDraftConfig = {
  accessKey?: string;
  secretKey?: string;
  bucketName?: string;
  endpoint?: string;
  savePath?: string;
};

export type ObjectStoreDraft = {
  type: ObjectStoreType;
  config: ObjectStoreDraftConfig;
};

export const objectStoreResourceId = 'current' as const;

export type ObjectStoreResourceRecord = ObjectStoreReadModel & {
  id: typeof objectStoreResourceId;
};

export class ObjectStoreResourceContractError extends Error {
  constructor() {
    super('Object Store resource response is invalid');
    this.name = 'ObjectStoreResourceContractError';
  }
}

export class ObjectStoreDraftContractError extends Error {
  constructor() {
    super('Object Store draft is invalid');
    this.name = 'ObjectStoreDraftContractError';
  }
}

export const objectStoreTypeDefinitions = [
  { value: 'DATABASE', labelKey: 'objectStore.type.database' },
  { value: 'FILE', labelKey: 'objectStore.type.file' },
  { value: 'OBS', labelKey: 'objectStore.type.obs' }
] as const satisfies readonly { value: ObjectStoreType; labelKey: string }[];

export const objectStoreObsFieldNames = [
  'accessKey',
  'secretKey',
  'bucketName',
  'endpoint',
  'savePath'
] as const satisfies readonly (keyof ObjectStoreDraftConfig)[];

const secretPlaceholderSentinels = new Set([
  '__keep__',
  '<masked>',
  '[masked]',
  '<redacted>',
  '[redacted]'
]);

function normalizeObjectStoreType(type?: ObjectStoreType | null): ObjectStoreType {
  return type === 'FILE' || type === 'OBS' ? type : 'DATABASE';
}

export function createObjectStoreDraft(config?: ObjectStoreReadModel | null): ObjectStoreDraft {
  const type = normalizeObjectStoreType(config?.type);
  if (type !== 'OBS') return { type, config: {} };
  return {
    type,
    config: {
      accessKey: config?.config.accessKey ?? '',
      // Read models deliberately carry only secretConfigured. A secret can enter
      // the draft only through this browser session's password input.
      secretKey: '',
      bucketName: config?.config.bucketName ?? '',
      endpoint: config?.config.endpoint ?? '',
      savePath: config?.config.savePath ?? 'hertzbeat'
    }
  };
}

export function createObjectStoreResourceRecord(
  config?: ObjectStoreReadModel | null
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
  if (!isPlainRecord(config.config)) {
    throw new ObjectStoreResourceContractError();
  }
  return {
    id: objectStoreResourceId,
    type: config.type,
    config: copyReadConfig(config.config)
  };
}

function copyReadConfig(value: ObjectStoreReadConfig): ObjectStoreReadConfig {
  return {
    ...(value.accessKey === undefined ? {} : { accessKey: value.accessKey }),
    ...(value.bucketName === undefined ? {} : { bucketName: value.bucketName }),
    ...(value.endpoint === undefined ? {} : { endpoint: value.endpoint }),
    ...(value.savePath === undefined ? {} : { savePath: value.savePath }),
    ...(value.secretConfigured === undefined ? {} : { secretConfigured: value.secretConfigured })
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

export function updateObjectStoreField(config: ObjectStoreDraft, key: keyof ObjectStoreDraftConfig,
  value: string): ObjectStoreDraft {
  return { ...config, config: { ...config.config, [key]: value } };
}

export function validateObjectStoreDraft(config: ObjectStoreDraft) {
  if (config.type !== 'OBS') return [];
  const missing = objectStoreObsFieldNames.filter(field => !String(config.config[field] ?? '').trim());
  if (!missing.includes('secretKey') && isSecretPlaceholder(String(config.config.secretKey))) {
    missing.push('secretKey');
  }
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
  return JSON.stringify(normalizeObjectStoreDraft(config)) !== JSON.stringify(normalizeObjectStoreDraft(baseline));
}

export function normalizeObjectStoreDraft(config: ObjectStoreDraft): ObjectStoreDraft {
  if (config.type !== 'OBS') return { type: config.type, config: {} };
  return {
    type: 'OBS',
    config: Object.fromEntries(objectStoreObsFieldNames.map(field => [
      field,
      String(config.config[field] ?? '').trim()
    ]))
  };
}

function isSecretPlaceholder(value: string) {
  const normalized = value.trim().toLowerCase();
  return /^[*•]+$/.test(normalized)
    || secretPlaceholderSentinels.has(normalized);
}
