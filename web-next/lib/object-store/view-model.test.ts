import { describe, expect, it, vi } from 'vitest';
import {
  OBJECT_STORE_TYPE_OPTIONS,
  buildObjectStoreFacts,
  canSaveObjectStore,
  isObsObjectStore,
  normalizeObjectStoreType,
  resolveObjectStoreDraft,
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
    const scopedT = createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'common.workspace': '工作区',
        'common.none': '无对象存储值',
        'setting.object-store.fact.type': '类型',
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
      { label: '工作区', value: 'setting/settings/object-store' },
      { label: '类型', value: '无对象存储值' },
      { label: 'Bucket', value: '无对象存储值' },
      { label: 'Endpoint', value: '无对象存储值' }
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
    expect(canSaveObjectStore({ type: 'OBS', config: { accessKey: 'ak' } } as any)).toBe(false);
    expect(canSaveObjectStore({ type: 'FILE', config: {} } as any)).toBe(true);
  });

  it('keeps the provider options aligned with the current settings contract', () => {
    expect(OBJECT_STORE_TYPE_OPTIONS).toEqual([
      { value: 'DATABASE', labelKey: 'settings.object-store.type.database' },
      { value: 'FILE', labelKey: 'settings.object-store.type.file' },
      { value: 'OBS', labelKey: 'settings.object-store.type.obs' }
    ]);
  });
});
