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

function formatObjectStoreFact(value: unknown, fallback: string) {
  const text = value == null ? '' : String(value).trim();
  return text || fallback;
}

export function buildObjectStoreFacts(config: ObjectStoreConfig, t: Translator) {
  const storeConfig = (config.config || {}) as Record<string, unknown>;
  const emptyValue = t('common.none');
  return [
    { label: t('common.workspace'), value: 'setting/settings/object-store' },
    { label: t('setting.object-store.fact.type'), value: formatObjectStoreFact(config.type, emptyValue) },
    { label: t('setting.object-store.fact.bucket'), value: formatObjectStoreFact(storeConfig.bucketName, emptyValue) },
    { label: t('setting.object-store.fact.endpoint'), value: formatObjectStoreFact(storeConfig.endpoint, emptyValue) }
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

function sortObjectStoreRecord(record: Record<string, unknown>) {
  return Object.keys(record)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = record[key];
      return result;
    }, {});
}

export function serializeObjectStoreConfig(config: ObjectStoreConfig) {
  const normalized = resolveObjectStoreDraft(null, config);
  return JSON.stringify({
    type: normalizeObjectStoreType(normalized.type),
    config: sortObjectStoreRecord((normalized.config || {}) as Record<string, unknown>)
  });
}

export function isObjectStoreDraftDirty(draft: ObjectStoreConfig | null, config: ObjectStoreConfig) {
  if (!draft) return false;
  return serializeObjectStoreConfig(draft) !== serializeObjectStoreConfig(config || {});
}

export function isObsObjectStore(config: ObjectStoreConfig) {
  return normalizeObjectStoreType(config.type) === 'OBS';
}

export function buildObjectStoreMissingFields(config: ObjectStoreConfig, t: Translator) {
  if (!isObsObjectStore(config)) {
    return [];
  }

  const obs = (config.config || {}) as Record<string, unknown>;
  const fields: string[] = [];

  if (!String(obs.accessKey || '').trim()) fields.push(t('settings.object-store.obs.accessKey'));
  if (!String(obs.secretKey || '').trim()) fields.push(t('settings.object-store.obs.secretKey'));
  if (!String(obs.bucketName || '').trim()) fields.push(t('settings.object-store.obs.bucketName'));
  if (!String(obs.endpoint || '').trim()) fields.push(t('settings.object-store.obs.endpoint'));

  return fields;
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
  return ['accessKey', 'secretKey', 'bucketName', 'endpoint'].every(key => String(obs[key] || '').trim().length > 0);
}
