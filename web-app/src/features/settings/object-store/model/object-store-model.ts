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
export type ObjectStoreSecretName = 'accessKey' | 'secretKey';

/** Safe configuration returned by reads. It must never represent secret plaintext. */
export type ObjectStoreReadConfig = {
  bucketName?: string;
  endpoint?: string;
  savePath?: string;
};

export type ObjectStoreReadModel = {
  type: ObjectStoreType;
  config: ObjectStoreReadConfig;
  configuredSecrets: ObjectStoreSecretName[];
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
  configuredSecrets: ObjectStoreSecretName[];
};

export const objectStoreResourceId = 'current' as const;

export type ObjectStoreResourceRecord = ObjectStoreReadModel & {
  id: typeof objectStoreResourceId;
};

export type ObjectStoreSaveRecovery = { phase: 'proof' } | { phase: 'commit-uncertain' };

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
export const objectStoreSecretNames = ['accessKey', 'secretKey'] as const satisfies readonly ObjectStoreSecretName[];

export function userCanWriteObjectStore(roles: readonly string[]) {
  return roles.includes('ADMIN');
}

const secretPlaceholderSentinels = new Set(['__keep__', '<masked>', '[masked]', '<redacted>', '[redacted]']);

function normalizeObjectStoreType(type?: ObjectStoreType | null): ObjectStoreType {
  return type === 'FILE' || type === 'OBS' ? type : 'DATABASE';
}

export function createObjectStoreDraft(config?: ObjectStoreReadModel | null): ObjectStoreDraft {
  const type = normalizeObjectStoreType(config?.type);
  if (type !== 'OBS') return { type, config: {}, configuredSecrets: [] };
  return {
    type,
    config: {
      accessKey: '',
      // Redacted reads carry only configuredSecrets evidence. Credential
      // plaintext can enter the draft only through this browser session.
      secretKey: '',
      bucketName: config?.config.bucketName ?? '',
      endpoint: config?.config.endpoint ?? '',
      savePath: config?.config.savePath ?? 'hertzbeat'
    },
    configuredSecrets: [...(config?.configuredSecrets ?? [])]
  };
}

export function createObjectStoreResourceRecord(config: ObjectStoreReadModel): ObjectStoreResourceRecord {
  if (typeof config !== 'object' || Array.isArray(config)) {
    throw new ObjectStoreResourceContractError();
  }
  if (config.type !== 'DATABASE' && config.type !== 'FILE' && config.type !== 'OBS') {
    throw new ObjectStoreResourceContractError();
  }
  if (!isPlainRecord(config.config)) {
    throw new ObjectStoreResourceContractError();
  }
  if (
    !Array.isArray(config.configuredSecrets) ||
    config.configuredSecrets.some(secret => !objectStoreSecretNames.includes(secret))
  ) {
    throw new ObjectStoreResourceContractError();
  }
  return {
    id: objectStoreResourceId,
    type: config.type,
    config: copyReadConfig(config.config),
    configuredSecrets: [...config.configuredSecrets]
  };
}

function copyReadConfig(value: ObjectStoreReadConfig): ObjectStoreReadConfig {
  return {
    ...(value.bucketName === undefined ? {} : { bucketName: value.bucketName }),
    ...(value.endpoint === undefined ? {} : { endpoint: value.endpoint }),
    ...(value.savePath === undefined ? {} : { savePath: value.savePath })
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
    config:
      normalized === 'OBS' ? { accessKey: '', secretKey: '', bucketName: '', endpoint: '', savePath: 'hertzbeat' } : {},
    configuredSecrets: []
  };
}

export function updateObjectStoreField(
  config: ObjectStoreDraft,
  key: keyof ObjectStoreDraftConfig,
  value: string
): ObjectStoreDraft {
  return { ...config, config: { ...config.config, [key]: value } };
}

export function validateObjectStoreDraft(config: ObjectStoreDraft) {
  if (config.type !== 'OBS') return [];
  const missing = objectStoreObsFieldNames.filter(field => {
    if (!objectStoreSecretNames.includes(field as ObjectStoreSecretName)) {
      return !String(config.config[field] ?? '').trim();
    }
    const secret = field as ObjectStoreSecretName;
    const fresh = String(config.config[secret] ?? '');
    return (!fresh.trim() && !config.configuredSecrets.includes(secret)) || isSecretPlaceholder(fresh);
  });
  const endpoint = String(config.config.endpoint ?? '').trim();
  if (endpoint && !isSupportedObsEndpoint(endpoint)) missing.push('endpoint');
  return missing;
}

function isSupportedObsEndpoint(endpoint: string) {
  try {
    const parsed = new URL(endpoint);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname.endsWith('.myhuaweicloud.com') &&
      parsed.username === '' &&
      parsed.password === '' &&
      parsed.search === '' &&
      parsed.hash === '' &&
      (parsed.pathname === '' || parsed.pathname === '/')
    );
  } catch {
    return false;
  }
}

export function isObjectStoreDirty(config: ObjectStoreDraft, baseline: ObjectStoreDraft) {
  return JSON.stringify(buildComparableDraft(config)) !== JSON.stringify(buildComparableDraft(baseline));
}

/** OBS secret plaintext is write-only, so an ambiguous replacement cannot be proved by GET. */
export function canProveAmbiguousObjectStoreSave(draft: ObjectStoreDraft) {
  return draft.type !== 'OBS' || objectStoreSecretNames.every(secret => !String(draft.config[secret] ?? '').trim());
}

export function objectStoreSaveConverged(draft: ObjectStoreDraft, record: ObjectStoreResourceRecord) {
  if (!canProveAmbiguousObjectStoreSave(draft) || draft.type !== record.type) return false;
  if (draft.type !== 'OBS') return true;
  const current = normalizeObjectStoreDraft(draft);
  if (
    current.config.bucketName !== record.config.bucketName ||
    current.config.endpoint !== record.config.endpoint ||
    current.config.savePath !== record.config.savePath
  ) {
    return false;
  }
  return objectStoreSecretNames.every(
    secret => draft.configuredSecrets.includes(secret) === record.configuredSecrets.includes(secret)
  );
}

export function normalizeObjectStoreDraft(config: ObjectStoreDraft): ObjectStoreDraft {
  if (config.type !== 'OBS') return { type: config.type, config: {}, configuredSecrets: [] };
  return {
    type: 'OBS',
    config: Object.fromEntries(
      objectStoreObsFieldNames.map(field => [field, String(config.config[field] ?? '').trim()])
    ),
    configuredSecrets: [...config.configuredSecrets]
  };
}

function buildComparableDraft(config: ObjectStoreDraft) {
  const normalized = normalizeObjectStoreDraft(config);
  if (normalized.type !== 'OBS') return normalized;
  return {
    type: normalized.type,
    config: normalized.config
  };
}

function isSecretPlaceholder(value: string) {
  const normalized = value.trim().toLowerCase();
  return /^[*•]+$/.test(normalized) || secretPlaceholderSentinels.has(normalized);
}
