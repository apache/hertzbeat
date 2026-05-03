'use client';

import React, { useCallback, useState } from 'react';
import { ClientWorkbench } from '../../../../components/workbench/client-workbench';
import { useI18n } from '../../../../components/providers/i18n-provider';
import { SettingsConsoleTitle } from '../../../../components/settings/settings-console-shell';
import {
  SettingsForm,
  SettingsFormActions,
  SettingsFormFeedback,
  SettingsFormField,
  SettingsFormInput,
  SettingsFormSelect
} from '../../../../components/settings/settings-form';
import { Button } from '../../../../components/ui/button';
import { coldOpsCatalogVisual } from '../../../../lib/cold-ops-visual';
import { apiMessageGet, apiMessagePost } from '../../../../lib/api-client';
import { loadObjectStoreConfig, saveObjectStoreConfig } from '../../../../lib/object-store/controller';
import {
  OBJECT_STORE_TYPE_OPTIONS,
  canSaveObjectStore,
  isObsObjectStore,
  resolveObjectStoreDraft,
  updateObjectStoreField,
  updateObjectStoreType
} from '../../../../lib/object-store/view-model';
import type { ObjectStoreConfig } from '../../../../lib/types';

const coldObjectStoreVisual = coldOpsCatalogVisual;

const coldPrimaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-[#f8fafc]';

export default function SettingObjectStorePage() {
  const { t } = useI18n();
  const [draft, setDraft] = useState<ObjectStoreConfig | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'error' | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    return loadObjectStoreConfig(apiMessageGet);
  }, []);

  return (
    <ClientWorkbench load={load} loadingCopy="正在加载文件服务配置。">
      {data => {
        const config = resolveObjectStoreDraft(draft, data.config || {});
        const obs = (config.config || {}) as Record<string, unknown>;
        const showObsFields = isObsObjectStore(config);
        const canSave = canSaveObjectStore(config);

        async function save() {
          setSaving(true);
          setMessage(null);
          setMessageTone(null);
          try {
            await saveObjectStoreConfig(apiMessagePost, config);
            setMessage(t('common.save-success'));
            setMessageTone('success');
          } catch (error) {
            setMessage(error instanceof Error ? error.message : t('common.save-failed'));
            setMessageTone('error');
          } finally {
            setSaving(false);
          }
        }

        return (
          <div
            data-setting-object-store-page="otlp-cold-object-store"
            data-setting-object-store-style-baseline={coldObjectStoreVisual.canvasName}
            data-setting-object-store-layout="full-width-settings-form"
            className="space-y-4"
          >
            <SettingsConsoleTitle>{t('settings.object-store')}</SettingsConsoleTitle>
            <SettingsForm
              data-setting-object-store-form="cold-settings-form"
              onSubmit={event => {
                event.preventDefault();
                if (!saving && canSave) {
                  void save();
                }
              }}
            >
              <div data-setting-object-store-provider="cold-provider-select">
                <SettingsFormField label={t('settings.object-store.type')}>
                  <SettingsFormSelect
                    value={config.type || 'DATABASE'}
                    onChange={e => setDraft(prev => updateObjectStoreType(prev || data.config || {}, e.target.value))}
                  >
                    {OBJECT_STORE_TYPE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </option>
                    ))}
                  </SettingsFormSelect>
                </SettingsFormField>
              </div>

              {showObsFields ? (
                <div data-setting-object-store-obs-fields="cold-obs-fields" className="contents">
                  <SettingsFormField label={t('settings.object-store.obs.accessKey')}>
                    <SettingsFormInput
                      placeholder={t('settings.object-store.obs.accessKey.placeholder')}
                      value={String(obs.accessKey || '')}
                      onChange={e =>
                        setDraft(prev => updateObjectStoreField(prev || data.config || {}, 'accessKey', e.target.value))
                      }
                    />
                  </SettingsFormField>

                  <SettingsFormField label={t('settings.object-store.obs.secretKey')}>
                    <SettingsFormInput
                      placeholder={t('settings.object-store.obs.secretKey.placeholder')}
                      value={String(obs.secretKey || '')}
                      onChange={e =>
                        setDraft(prev => updateObjectStoreField(prev || data.config || {}, 'secretKey', e.target.value))
                      }
                    />
                  </SettingsFormField>

                  <SettingsFormField label={t('settings.object-store.obs.bucketName')}>
                    <SettingsFormInput
                      placeholder={t('settings.object-store.obs.bucketName.placeholder')}
                      value={String(obs.bucketName || '')}
                      onChange={e =>
                        setDraft(prev => updateObjectStoreField(prev || data.config || {}, 'bucketName', e.target.value))
                      }
                    />
                  </SettingsFormField>

                  <SettingsFormField label={t('settings.object-store.obs.endpoint')}>
                    <SettingsFormInput
                      placeholder={t('settings.object-store.obs.endpoint.placeholder')}
                      value={String(obs.endpoint || '')}
                      onChange={e =>
                        setDraft(prev => updateObjectStoreField(prev || data.config || {}, 'endpoint', e.target.value))
                      }
                    />
                  </SettingsFormField>

                  <SettingsFormField label={t('settings.object-store.obs.savePath')}>
                    <SettingsFormInput
                      placeholder={t('settings.object-store.obs.savePath.placeholder')}
                      value={String(obs.savePath || '')}
                      onChange={e =>
                        setDraft(prev => updateObjectStoreField(prev || data.config || {}, 'savePath', e.target.value))
                      }
                    />
                  </SettingsFormField>
                </div>
              ) : null}

              {message ? (
                <SettingsFormFeedback className={messageTone === 'success' ? 'text-emerald-300' : 'text-rose-300'}>
                  {message}
                </SettingsFormFeedback>
              ) : null}

              <SettingsFormActions data-setting-object-store-actions="standard-equal-buttons">
                <Button type="submit" variant="default" className={coldPrimaryButtonClassName} disabled={saving || !canSave}>
                  {saving ? t('common.saving') : t('settings.system-config.ok')}
                </Button>
              </SettingsFormActions>
            </SettingsForm>
          </div>
        );
      }}
    </ClientWorkbench>
  );
}
