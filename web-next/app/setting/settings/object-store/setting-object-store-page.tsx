'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { HzInlineFeedback } from '@hertzbeat/ui';
import { ClientWorkbench } from '../../../../components/workbench/client-workbench';
import { useI18n } from '../../../../components/providers/i18n-provider';
import { SettingsConsoleTitle } from '../../../../components/settings/settings-console-shell';
import {
  SettingsForm,
  SettingsFormActionHelp,
  SettingsFormActions,
  SettingsFormFeedback,
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
  buildObjectStoreMissingFields,
  canSaveObjectStore,
  isObjectStoreDraftDirty,
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

const coldSecondaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white disabled:cursor-not-allowed disabled:opacity-50';

type ObjectStoreTranslator = (key: string, vars?: Record<string, string>) => string;

function objectStoreFieldHelp(t: ObjectStoreTranslator, fieldKey: string, label: string) {
  return {
    label: t('settings.object-store.field.help-aria', { field: label }),
    body: t(`${fieldKey}.help`),
    impact: t(`${fieldKey}.impact`)
  };
}

function objectStoreApplyHelp(t: ObjectStoreTranslator) {
  const actionLabel = t('settings.system-config.ok');
  return {
    label: t('settings.object-store.action.help-aria', { action: actionLabel }),
    body: t('settings.object-store.action.apply.help'),
    impact: t('settings.object-store.action.apply.impact')
  };
}

function objectStoreDiscardHelp(t: ObjectStoreTranslator) {
  const actionLabel = t('settings.object-store.action.discard');
  return {
    label: t('settings.object-store.action.help-aria', { action: actionLabel }),
    body: t('settings.object-store.action.discard.help'),
    impact: t('settings.object-store.action.discard.impact')
  };
}

function objectStoreRequirement(t: ObjectStoreTranslator, tone: 'required' | 'optional') {
  return {
    tone,
    label: t(`settings.form.field.requirement.${tone}`)
  };
}

function objectStoreInputMode(t: ObjectStoreTranslator, mode: 'manual' | 'selection') {
  return {
    mode,
    label: t(`settings.form.field.input-mode.${mode}`)
  };
}

export default function SettingObjectStorePage() {
  const { t } = useI18n();
  const formAnchorRef = useRef<HTMLDivElement | null>(null);
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

  const resetFormScroll = useCallback(() => {
    window.requestAnimationFrame(() => {
      formAnchorRef.current?.scrollIntoView({ block: 'start' });
    });
  }, []);

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
        const isDirty = isObjectStoreDraftDirty(draft, data.config || {});
        const missingFields = buildObjectStoreMissingFields(config, t);
        const typeLabel = t('settings.object-store.type');
        const accessKeyLabel = t('settings.object-store.obs.accessKey');
        const secretKeyLabel = t('settings.object-store.obs.secretKey');
        const bucketNameLabel = t('settings.object-store.obs.bucketName');
        const endpointLabel = t('settings.object-store.obs.endpoint');
        const savePathLabel = t('settings.object-store.obs.savePath');

        async function save() {
          if (!isDirty) {
            return;
          }
          setSaving(true);
          setMessage(null);
          setMessageTone(null);
          try {
            await saveObjectStoreConfig(apiMessagePost, config);
            setDraft(null);
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

        function updateDraft(nextConfig: ObjectStoreConfig) {
          setDraft(nextConfig);
          setMessage(null);
          setMessageTone(null);
        }

        function updateProvider(type: string) {
          const nextConfig = updateObjectStoreType(draft || data.config || {}, type);
          updateDraft(nextConfig);
          if (!isObsObjectStore(nextConfig)) {
            resetFormScroll();
          }
        }

        function discardDraft() {
          setDraft(null);
          setMessage(null);
          setMessageTone(null);
          resetFormScroll();
        }

        return (
          <div
            ref={formAnchorRef}
            data-setting-object-store-page="otlp-hertzbeat-ui-object-store"
            data-setting-object-store-scroll-reset="draft-discard-provider-shrink"
            data-setting-object-store-style-baseline={coldObjectStoreVisual.canvasName}
            data-setting-object-store-layout="full-width-settings-form"
            data-setting-object-store-type-change-contract="angular-reset-config-on-type-change"
            data-setting-object-store-provider-select-contract="angular-centered-bold-dropdown"
            className="space-y-4"
          >
            <SettingsConsoleTitle>{t('settings.object-store')}</SettingsConsoleTitle>
            <SettingsForm
              data-setting-object-store-form="hertzbeat-ui-settings-form"
              data-setting-object-store-form-nesting-contract="flat-inside-settings-console-content"
              data-setting-object-store-apply-contract="angular-apply-notify"
              data-setting-object-store-dirty={isDirty ? 'true' : 'false'}
              className="min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
              onSubmit={event => {
                event.preventDefault();
                if (!saving && canSave && isDirty) {
                  void save();
                }
              }}
            >
              <div data-setting-object-store-provider="hertzbeat-ui-provider-select">
                <SettingsFormField
                  label={typeLabel}
                  requirement={objectStoreRequirement(t, 'required')}
                  inputMode={objectStoreInputMode(t, 'selection')}
                  help={objectStoreFieldHelp(t, 'settings.object-store.type', typeLabel)}
                >
                  <SettingsFormSelect
                    data-setting-object-store-provider-select="angular-centered-bold-dropdown"
                    data-setting-object-store-type-change="angular-reset-config-on-type-change"
                    value={config.type || 'DATABASE'}
                    onChange={e => updateProvider(e.target.value)}
                  >
                    {OBJECT_STORE_TYPE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </option>
                    ))}
                  </SettingsFormSelect>
                </SettingsFormField>
              </div>

              {!canSave && missingFields.length ? (
                <HzInlineFeedback
                  tone="warning"
                  title={t('settings.object-store.validation.required-fields-title', { count: String(missingFields.length) })}
                  description={
                    <span
                      className="block whitespace-normal break-words"
                      data-setting-object-store-validation-fields="wrapped-field-list"
                    >
                      {missingFields.join(', ')}
                    </span>
                  }
                  variant="embedded"
                  data-setting-object-store-validation-summary="missing-required-fields"
                  data-setting-object-store-validation-summary-owner="hertzbeat-ui-inline-feedback"
                  data-setting-object-store-validation-summary-layout="wrapped-description"
                />
              ) : null}

              {showObsFields ? (
                <div data-setting-object-store-obs-fields="hertzbeat-ui-obs-fields" className="contents">
                  <SettingsFormField
                    label={accessKeyLabel}
                    requirement={objectStoreRequirement(t, 'required')}
                    inputMode={objectStoreInputMode(t, 'manual')}
                    help={objectStoreFieldHelp(t, 'settings.object-store.obs.accessKey', accessKeyLabel)}
                  >
                    <SettingsFormInput
                      placeholder={t('settings.object-store.obs.accessKey.placeholder')}
                      value={String(obs.accessKey || '')}
                      onChange={e =>
                        updateDraft(updateObjectStoreField(draft || data.config || {}, 'accessKey', e.target.value))
                      }
                    />
                  </SettingsFormField>

                  <SettingsFormField
                    label={secretKeyLabel}
                    requirement={objectStoreRequirement(t, 'required')}
                    inputMode={objectStoreInputMode(t, 'manual')}
                    help={objectStoreFieldHelp(t, 'settings.object-store.obs.secretKey', secretKeyLabel)}
                  >
                    <SettingsFormInput
                      type="password"
                      autoComplete="new-password"
                      data-setting-object-store-secret-input="password"
                      placeholder={t('settings.object-store.obs.secretKey.placeholder')}
                      value={String(obs.secretKey || '')}
                      onChange={e =>
                        updateDraft(updateObjectStoreField(draft || data.config || {}, 'secretKey', e.target.value))
                      }
                    />
                  </SettingsFormField>

                  <SettingsFormField
                    label={bucketNameLabel}
                    requirement={objectStoreRequirement(t, 'required')}
                    inputMode={objectStoreInputMode(t, 'manual')}
                    help={objectStoreFieldHelp(t, 'settings.object-store.obs.bucketName', bucketNameLabel)}
                  >
                    <SettingsFormInput
                      placeholder={t('settings.object-store.obs.bucketName.placeholder')}
                      value={String(obs.bucketName || '')}
                      onChange={e =>
                        updateDraft(updateObjectStoreField(draft || data.config || {}, 'bucketName', e.target.value))
                      }
                    />
                  </SettingsFormField>

                  <SettingsFormField
                    label={endpointLabel}
                    requirement={objectStoreRequirement(t, 'required')}
                    inputMode={objectStoreInputMode(t, 'manual')}
                    help={objectStoreFieldHelp(t, 'settings.object-store.obs.endpoint', endpointLabel)}
                  >
                    <SettingsFormInput
                      placeholder={t('settings.object-store.obs.endpoint.placeholder')}
                      value={String(obs.endpoint || '')}
                      onChange={e =>
                        updateDraft(updateObjectStoreField(draft || data.config || {}, 'endpoint', e.target.value))
                      }
                    />
                  </SettingsFormField>

                  <SettingsFormField
                    label={savePathLabel}
                    requirement={objectStoreRequirement(t, 'optional')}
                    inputMode={objectStoreInputMode(t, 'manual')}
                    help={objectStoreFieldHelp(t, 'settings.object-store.obs.savePath', savePathLabel)}
                  >
                    <SettingsFormInput
                      placeholder={t('settings.object-store.obs.savePath.placeholder')}
                      value={String(obs.savePath || '')}
                      onChange={e =>
                        updateDraft(updateObjectStoreField(draft || data.config || {}, 'savePath', e.target.value))
                      }
                    />
                  </SettingsFormField>
                </div>
              ) : null}

              {message ? (
                <SettingsFormFeedback
                  tone={messageTone === 'success' ? 'success' : 'error'}
                  data-setting-object-store-apply-feedback="angular-apply-notify"
                  data-setting-object-store-apply-feedback-owner="hertzbeat-ui-settings-feedback"
                >
                  {message}
                </SettingsFormFeedback>
              ) : null}

              <SettingsFormActions data-setting-object-store-actions="standard-equal-buttons">
                <span className="inline-flex items-center gap-1">
                  <Button
                    type="button"
                    variant="default"
                    className={coldSecondaryButtonClassName}
                    disabled={saving || !isDirty}
                    data-setting-object-store-command-action="discard"
                    data-setting-object-store-discard="local-draft-reset"
                    data-setting-object-store-discard-dirty={isDirty ? 'changed' : 'unchanged'}
                    data-setting-object-store-discard-disabled-reason={!isDirty ? 'unchanged' : undefined}
                    onClick={discardDraft}
                  >
                    {t('settings.object-store.action.discard')}
                  </Button>
                  <SettingsFormActionHelp id="object-store-discard" {...objectStoreDiscardHelp(t)} />
                </span>
                <span className="inline-flex items-center gap-1">
                  <Button
                    type="submit"
                    variant="default"
                    className={coldPrimaryButtonClassName}
                    disabled={saving || !canSave || !isDirty}
                    data-setting-object-store-command-action="apply"
                    data-setting-object-store-apply-dirty={isDirty ? 'changed' : 'unchanged'}
                    data-setting-object-store-apply-disabled-reason={
                      saving ? 'saving' : !canSave ? 'invalid' : !isDirty ? 'unchanged' : undefined
                    }
                  >
                    {saving ? t('common.saving') : t('settings.system-config.ok')}
                  </Button>
                  <SettingsFormActionHelp id="object-store-apply" {...objectStoreApplyHelp(t)} />
                </span>
              </SettingsFormActions>
            </SettingsForm>
          </div>
        );
      }}
    </ClientWorkbench>
  );
}
