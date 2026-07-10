import { describe, expect, it, vi } from 'vitest';
import {
  OBJECT_STORE_TYPE_OPTIONS,
  buildObjectStoreFacts,
  buildObjectStoreMissingFields,
  canSaveObjectStore,
  isObsObjectStore,
  isObjectStoreDraftDirty,
  normalizeObjectStoreType,
  resolveObjectStoreDraft,
  serializeObjectStoreConfig,
  updateObjectStoreField,
  updateObjectStoreType
} from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock();

describe('object store view model', () => {
  it('builds facts from object store config', () => {
    expect(
      buildObjectStoreFacts(
        {
          type: 'OBS',
          config: { bucketName: 'hb-bucket', endpoint: 'https://obs.example.com' }
        } as any,
        t
      )
    ).toEqual([
      { label: 'Workspace', value: 'setting/settings/object-store' },
      { label: 'Type', value: 'OBS' },
      { label: 'Bucket', value: 'hb-bucket' },
      { label: 'Endpoint', value: 'https://obs.example.com' }
    ]);
  });

  it('uses localized empty fallbacks for missing object store facts', () => {
    const workspaceLabel = 'Workspace scope';
    const emptyObjectStoreValue = 'No object store value';
    const typeLabel = 'Store type';
    const scopedT = createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'common.workspace': workspaceLabel,
        'common.none': emptyObjectStoreValue,
        'setting.object-store.fact.type': typeLabel,
        'setting.object-store.fact.bucket': 'Bucket',
        'setting.object-store.fact.endpoint': 'Endpoint'
      }
    });

    expect(
      buildObjectStoreFacts(
        {
          type: '',
          config: { bucketName: '   ', endpoint: null }
        } as any,
        scopedT
      )
    ).toEqual([
      { label: workspaceLabel, value: 'setting/settings/object-store' },
      { label: typeLabel, value: emptyObjectStoreValue },
      { label: 'Bucket', value: emptyObjectStoreValue },
      { label: 'Endpoint', value: emptyObjectStoreValue }
    ]);
  });

  it('updates nested config fields immutably', () => {
    expect(
      updateObjectStoreField(
        { type: 'OBS', config: { bucketName: 'old' } } as any,
        'bucketName',
        'new'
      )
    ).toEqual({
      type: 'OBS',
      config: { bucketName: 'new' }
    });
  });

  it('normalizes type and resolves the current draft shape', () => {
    expect(normalizeObjectStoreType('OBS')).toBe('OBS');
    expect(normalizeObjectStoreType('something-else')).toBe('DATABASE');
    expect(resolveObjectStoreDraft(null, { type: 'FILE', config: { savePath: 'backup' } } as any)).toEqual({
      type: 'FILE',
      config: { savePath: 'backup' }
    });
  });

  it('resets nested config when the store type changes', () => {
    expect(
      updateObjectStoreType(
        {
          type: 'OBS',
          config: { accessKey: 'old' }
        } as any,
        'FILE'
      )
    ).toEqual({
      type: 'FILE',
      config: {}
    });
  });

  it('serializes configs with stable nested key order for dirty checks', () => {
    expect(serializeObjectStoreConfig({
      type: 'OBS',
      config: {
        bucketName: 'hb',
        endpoint: 'https://obs.example.com'
      }
    } as any)).toBe(serializeObjectStoreConfig({
      type: 'OBS',
      config: {
        endpoint: 'https://obs.example.com',
        bucketName: 'hb'
      }
    } as any));
  });

  it('detects whether an object-store draft changes persisted config', () => {
    const current = {
      type: 'DATABASE',
      config: {}
    } as any;

    expect(isObjectStoreDraftDirty(null, current)).toBe(false);
    expect(isObjectStoreDraftDirty({ type: 'DATABASE', config: {} } as any, current)).toBe(false);
    expect(isObjectStoreDraftDirty({ type: 'FILE', config: {} } as any, current)).toBe(true);
  });

  it('computes the OBS validation and type flags', () => {
    expect(isObsObjectStore({ type: 'OBS' } as any)).toBe(true);
    expect(isObsObjectStore({ type: 'FILE' } as any)).toBe(false);
    expect(
      canSaveObjectStore({
        type: 'OBS',
        config: {
          accessKey: 'ak',
          secretKey: 'sk',
          bucketName: 'bucket',
          endpoint: 'https://obs.example.com',
          savePath: 'hertzbeat'
        }
      } as any)
    ).toBe(true);
    expect(
      canSaveObjectStore({
        type: 'OBS',
        config: {
          accessKey: 'ak',
          secretKey: 'sk',
          bucketName: 'bucket',
          endpoint: 'https://obs.example.com',
          savePath: ''
        }
      } as any)
    ).toBe(true);
    expect(canSaveObjectStore({ type: 'OBS', config: { accessKey: 'ak' } } as any)).toBe(false);
    expect(canSaveObjectStore({ type: 'FILE', config: {} } as any)).toBe(true);
  });

  it('lists missing OBS required fields for disabled-save feedback', () => {
    expect(
      buildObjectStoreMissingFields({
        type: 'OBS',
        config: {}
      } as any, t)
    ).toEqual(['Access key', 'Secret key', 'Bucket', 'Endpoint']);

    expect(
      buildObjectStoreMissingFields({
        type: 'OBS',
        config: {
          accessKey: 'ak',
          secretKey: 'sk',
          bucketName: '   ',
          endpoint: ''
        }
      } as any, t)
    ).toEqual(['Bucket', 'Endpoint']);

    expect(buildObjectStoreMissingFields({ type: 'DATABASE', config: {} } as any, t)).toEqual([]);
  });

  it('keeps the provider options aligned with the current settings contract', () => {
    expect(OBJECT_STORE_TYPE_OPTIONS).toEqual([
      { value: 'DATABASE', labelKey: 'settings.object-store.type.database' },
      { value: 'FILE', labelKey: 'settings.object-store.type.file' },
      { value: 'OBS', labelKey: 'settings.object-store.type.obs' }
    ]);
  });
});
