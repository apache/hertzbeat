import type { ObjectStoreConfig } from '@/lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export const OBJECT_STORE_TYPE_OPTIONS = [
  { value: 'DATABASE', labelKey: 'settings.object-store.type.database' },
  { value: 'FILE', labelKey: 'settings.object-store.type.file' },
  { value: 'OBS', labelKey: 'settings.object-store.type.obs' }
] as const;

export function normalizeObjectStoreType(type?: string | null) {
  if (type === 'FILE' || type === 'OBS') {
    return type;
  }
  return 'DATABASE';
}

export function buildObjectStoreFacts(config: ObjectStoreConfig, _t: Translator) {
  const storeConfig = (config.config || {}) as Record<string, unknown>;
  return [
    { label: 'Workspace', value: 'setting/settings/object-store' },
    { label: 'Type', value: config.type || '-' },
    { label: 'Bucket', value: String(storeConfig.bucketName || '-') },
    { label: 'Endpoint', value: String(storeConfig.endpoint || '-') }
  ];
}

export function resolveObjectStoreDraft(draft: ObjectStoreConfig | null, config: ObjectStoreConfig) {
  const source = draft || config || {};

  return {
    ...source,
    type: normalizeObjectStoreType(source.type),
    config: {
      ...(source.config || {})
    }
  };
}

export function isObsObjectStore(config: ObjectStoreConfig) {
  return normalizeObjectStoreType(config.type) === 'OBS';
}

export function updateObjectStoreType(config: ObjectStoreConfig, type: string): ObjectStoreConfig {
  const normalized = normalizeObjectStoreType(type);

  if (normalizeObjectStoreType(config.type) === normalized) {
    return {
      ...config,
      type: normalized
    };
  }

  return {
    ...config,
    type: normalized,
    config: {}
  };
}

export function updateObjectStoreField(config: ObjectStoreConfig, key: string, value: string): ObjectStoreConfig {
  return {
    ...config,
    config: {
      ...(config.config || {}),
      [key]: value
    }
  };
}

export function canSaveObjectStore(config: ObjectStoreConfig) {
  if (!isObsObjectStore(config)) {
    return true;
  }

  const obs = (config.config || {}) as Record<string, unknown>;
  return ['accessKey', 'secretKey', 'bucketName', 'endpoint', 'savePath'].every(key => String(obs[key] || '').trim().length > 0);
}
