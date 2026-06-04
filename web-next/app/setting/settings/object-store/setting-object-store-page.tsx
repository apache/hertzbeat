'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { HzInlineFeedback } from '@hertzbeat/ui';
import { ClientWorkbench } from '../../../../components/workbench/client-workbench';
import { useI18n } from '../../../../components/providers/i18n-provider';
import { SettingsConsoleTitle } from '../../../../components/settings/settings-console-shell';
import {
  SettingsForm,
  SettingsFormActions,
  SettingsFormField,
  SettingsFormInput,
  SettingsFormSelect
} from '../../../../components/settings/settings-form';
import { Button } from '../../../../components/ui/button';
import { hzOpsCatalogVisual } from '../../../../lib/hz-ops-visual';
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

const coldObjectStoreVisual = hzOpsCatalogVisual;

const SETTING_OBJECT_STORE_SETTLED_CACHE_TTL_MS = 10_000;

const coldPrimaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-[#f8fafc]';

export default function SettingObjectStorePage() {
  const { t } = useI18n();
  const [draft, setDraft] = useState<ObjectStoreConfig | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'error' | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const settingObjectStoreCacheKey = useMemo(
    () => ['setting-object-store', '/config/oss', reloadVersion].join(':'),
    [reloadVersion]
  );

  const load = useCallback(async () => {
    void reloadVersion;
    return loadObjectStoreConfig(apiMessageGet);
  }, [reloadVersion]);

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('setting.settings.object-store.loading')}
      cacheKey={settingObjectStoreCacheKey}
      cacheSettledTtlMs={SETTING_OBJECT_STORE_SETTLED_CACHE_TTL_MS}
    >
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
            setMessage(t('common.notify.apply-success'));
            setMessageTone('success');
            setReloadVersion(version => version + 1);
          } catch (error) {
            setMessage(error instanceof Error ? error.message : t('common.notify.apply-fail'));
            setMessageTone('error');
          } finally {
            setSaving(false);
          }
        }

        return (
          <div
            data-setting-object-store-page="otlp-hertzbeat-ui-object-store"
            data-setting-object-store-style-baseline={coldObjectStoreVisual.canvasName}
            data-setting-object-store-layout="full-width-settings-form"
            data-setting-object-store-type-change-contract="angular-reset-config-on-type-change"
            data-setting-object-store-provider-select-contract="angular-centered-bold-dropdown"
            className="space-y-4"
          >
            <SettingsConsoleTitle>{t('settings.object-store')}</SettingsConsoleTitle>
            <SettingsForm
              data-setting-object-store-form="hertzbeat-ui-settings-form"
              data-setting-object-store-apply-contract="angular-apply-notify"
              onSubmit={event => {
                event.preventDefault();
                if (!saving && canSave) {
                  void save();
                }
              }}
            >
              <div data-setting-object-store-provider="hertzbeat-ui-provider-select">
                <SettingsFormField label={t('settings.object-store.type')}>
                  <SettingsFormSelect
                    data-setting-object-store-provider-select="angular-centered-bold-dropdown"
                    data-setting-object-store-type-change="angular-reset-config-on-type-change"
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
                <div data-setting-object-store-obs-fields="hertzbeat-ui-obs-fields" className="contents">
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
                <HzInlineFeedback
                  tone={messageTone === 'success' ? 'success' : 'critical'}
                  title={message}
                  variant="embedded"
                  data-setting-object-store-apply-feedback="angular-apply-notify"
                  data-setting-object-store-apply-feedback-owner="hertzbeat-ui-inline-feedback"
                />
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
