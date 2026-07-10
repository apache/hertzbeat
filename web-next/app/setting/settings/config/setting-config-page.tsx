'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { HzInlineFeedback } from '@hertzbeat/ui';
import { ClientWorkbench } from '../../../../components/workbench/client-workbench';
import { useI18n } from '../../../../components/providers/i18n-provider';
import { SettingsConsoleTitle } from '../../../../components/settings/settings-console-shell';
import {
  SettingsForm,
  SettingsFormActionHelp,
  SettingsFormActions,
  SettingsFormField,
  SettingsFormSelect
} from '../../../../components/settings/settings-form';
import { Button } from '../../../../components/ui/button';
import { hzOpsCatalogVisual } from '../../../../lib/hz-ops-visual';
import { apiMessageGet, apiMessagePost } from '../../../../lib/api-client';
import { loadSystemConfigData, persistSystemConfig } from '../../../../lib/setting-config/controller';
import {
  canSaveSystemConfig,
  buildTimezoneOptionLabel,
  SYSTEM_CONFIG_LOCALE_OPTIONS,
  SYSTEM_CONFIG_THEME_OPTIONS,
  readAndClearSystemConfigApplyFeedback,
  resolveConfigSaveFeedback,
  resolveSystemConfigDraft,
  isSystemConfigDirty,
  updateSystemConfigField,
  updateSystemConfigTimezone,
  writeSystemConfigApplyFeedback,
  type SaveTone
} from '../../../../lib/setting-config/view-model';
import { applyWorkbenchTheme, reloadWorkbenchWindow } from '../../../../lib/workbench-theme';
import type { SystemConfig, TimezoneOption } from '../../../../lib/types';

type ConfigData = {
  config: SystemConfig;
  timezones: TimezoneOption[];
};

const coldConfigVisual = hzOpsCatalogVisual;

const SETTING_CONFIG_SETTLED_CACHE_TTL_MS = 10_000;

const coldPrimaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-[#f8fafc]';

const coldSecondaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#4e74f8] hover:bg-[#151b28] hover:text-white disabled:cursor-not-allowed disabled:opacity-50';

type SystemConfigTranslator = (key: string, vars?: Record<string, string>) => string;

function systemConfigFieldHelp(t: SystemConfigTranslator, fieldKey: string, label: string) {
  return {
    label: t('settings.system-config.field.help-aria', { field: label }),
    body: t(`${fieldKey}.help`),
    impact: t(`${fieldKey}.impact`)
  };
}

function systemConfigApplyHelp(t: SystemConfigTranslator) {
  const actionLabel = t('settings.system-config.ok');
  return {
    label: t('settings.system-config.action.help-aria', { action: actionLabel }),
    body: t('settings.system-config.action.apply.help'),
    impact: t('settings.system-config.action.apply.impact')
  };
}

function systemConfigDiscardHelp(t: SystemConfigTranslator) {
  const actionLabel = t('settings.system-config.action.discard');
  return {
    label: t('settings.system-config.action.help-aria', { action: actionLabel }),
    body: t('settings.system-config.action.discard.help'),
    impact: t('settings.system-config.action.discard.impact')
  };
}

function systemConfigRequirement(t: SystemConfigTranslator, tone: 'required' | 'optional') {
  return {
    tone,
    label: t(`settings.form.field.requirement.${tone}`)
  };
}

function systemConfigInputMode(t: SystemConfigTranslator, mode: 'manual' | 'selection') {
  return {
    mode,
    label: t(`settings.form.field.input-mode.${mode}`)
  };
}

export default function SettingConfigPage() {
  const { t, setLocale } = useI18n();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<SystemConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveTone, setSaveTone] = useState<SaveTone>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const settingConfigCacheKey = useMemo(
    () => ['setting-config', '/config/system', '/config/timezones', reloadVersion].join(':'),
    [reloadVersion]
  );

  useEffect(() => {
    const persistedFeedback = readAndClearSystemConfigApplyFeedback();
    if (!persistedFeedback) return;
    setSaveMessage(persistedFeedback.message);
    setSaveTone(persistedFeedback.tone);
  }, []);

  const load = useCallback(async (): Promise<ConfigData> => {
    void reloadVersion;
    return loadSystemConfigData(apiMessageGet);
  }, [reloadVersion]);
  const isMcpFocus = searchParams.get('focus') === 'mcp';

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('setting.settings.config.loading')}
      cacheKey={settingConfigCacheKey}
      cacheSettledTtlMs={SETTING_CONFIG_SETTLED_CACHE_TTL_MS}
    >
      {data => {
        const config = resolveSystemConfigDraft(draft, data.config || {});
        const baselineConfig = resolveSystemConfigDraft(null, data.config || {});
        const saveFeedback = resolveConfigSaveFeedback(saveMessage, saveTone);
        const canSave = canSaveSystemConfig(config);
        const isDirty = isSystemConfigDirty(config, baselineConfig);
        const canSubmit = canSave && isDirty;
        const saveDisabledReason = !canSave ? 'invalid' : !isDirty ? 'unchanged' : undefined;
        const localeLabel = t('settings.system-config.locale');
        const timezoneLabel = t('settings.system-config.timezone');
        const themeLabel = t('settings.system-config.theme');

        function updateDraft(nextConfig: SystemConfig) {
          setDraft(nextConfig);
          setSaveMessage(null);
          setSaveTone(null);
        }

        async function save() {
          if (!canSubmit) {
            if (canSave && !isDirty) {
              setSaveMessage(t('settings.system-config.no-changes'));
              setSaveTone('info');
            }
            return;
          }

          const applySuccessMessage = t('common.notify.apply-success');
          setSaving(true);
          setSaveMessage(null);
          setSaveTone(null);
          try {
            setSaveMessage(
              await persistSystemConfig(apiMessagePost, config, applySuccessMessage, {
                setLocale,
                applyTheme: applyWorkbenchTheme,
                reload: () => {
                  writeSystemConfigApplyFeedback(applySuccessMessage, 'success');
                  reloadWorkbenchWindow(window.location);
                }
              })
            );
            setSaveTone('success');
            setReloadVersion(version => version + 1);
          } catch (error) {
            setSaveMessage(error instanceof Error ? error.message : t('common.notify.apply-fail'));
            setSaveTone('error');
          } finally {
            setSaving(false);
          }
        }

        return (
          <div
            data-setting-config-surface="otlp-hertzbeat-ui-system-config"
            data-setting-config-style-baseline={coldConfigVisual.canvasName}
            data-setting-config-layout="full-width-settings-form"
            className="space-y-4"
          >
            <SettingsConsoleTitle>{t('settings.system-config')}</SettingsConsoleTitle>
            {isMcpFocus ? (
              <HzInlineFeedback
                tone="info"
                title={t('settings.system-config.mcp-focus.title')}
                description={t('settings.system-config.mcp-focus.description')}
                variant="embedded"
                data-setting-config-focus-feedback="mcp-compat-route"
                data-setting-config-focus-feedback-owner="hertzbeat-ui-inline-feedback"
              />
            ) : null}
            <SettingsForm
              data-setting-config-form="hertzbeat-ui-settings-form"
              data-setting-config-form-nesting-contract="flat-inside-settings-console-content"
              data-setting-config-apply-contract="angular-apply-notify-reload"
              data-setting-config-runtime-locale="underscore-to-hyphen"
              className="min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
              onSubmit={event => {
                event.preventDefault();
                if (!saving && canSave) {
                  void save();
                }
              }}
            >
              <SettingsFormField
                label={localeLabel}
                help={systemConfigFieldHelp(t, 'settings.system-config.locale', localeLabel)}
                requirement={systemConfigRequirement(t, 'required')}
                inputMode={systemConfigInputMode(t, 'selection')}
              >
                <SettingsFormSelect
                  value={config.locale || ''}
                  data-setting-config-select-contract="angular-400px-centered-bold"
                  data-setting-config-select-kind="locale"
                  onChange={e => updateDraft(updateSystemConfigField(draft || data.config || {}, 'locale', e.target.value))}
                >
                  {SYSTEM_CONFIG_LOCALE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </SettingsFormSelect>
              </SettingsFormField>

              <SettingsFormField
                label={timezoneLabel}
                help={systemConfigFieldHelp(t, 'settings.system-config.timezone', timezoneLabel)}
                requirement={systemConfigRequirement(t, 'required')}
                inputMode={systemConfigInputMode(t, 'selection')}
              >
                <SettingsFormSelect
                  value={config.timeZoneId || ''}
                  searchable
                  searchPlaceholder={t('settings.system-config.timezone')}
                  data-setting-config-select-contract="angular-400px-centered-bold"
                  data-setting-config-timezone-search-contract="angular-nz-show-search"
                  data-setting-config-timezone-dropdown-width-contract="angular-dropdown-match-select-width-false"
                  data-setting-config-select-kind="timezone"
                  onChange={e => updateDraft(updateSystemConfigTimezone(draft || data.config || {}, e.target.value))}
                >
                  {data.timezones.map(zone => (
                    <option key={zone.zoneId} value={zone.zoneId}>
                      {buildTimezoneOptionLabel(zone)}
                    </option>
                  ))}
                </SettingsFormSelect>
              </SettingsFormField>

              <SettingsFormField
                label={themeLabel}
                help={systemConfigFieldHelp(t, 'settings.system-config.theme', themeLabel)}
                requirement={systemConfigRequirement(t, 'required')}
                inputMode={systemConfigInputMode(t, 'selection')}
              >
                <SettingsFormSelect
                  value={config.theme || ''}
                  data-setting-config-select-contract="angular-400px-centered-bold"
                  data-setting-config-select-kind="theme"
                  onChange={e => updateDraft(updateSystemConfigField(draft || data.config || {}, 'theme', e.target.value))}
                >
                  {SYSTEM_CONFIG_THEME_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </SettingsFormSelect>
              </SettingsFormField>

              {saveFeedback ? (
                <HzInlineFeedback
                  tone={saveTone === 'success' ? 'success' : saveTone === 'info' ? 'info' : 'critical'}
                  title={saveFeedback.message}
                  variant="embedded"
                  data-setting-config-apply-feedback="angular-apply-notify"
                  data-setting-config-apply-feedback-owner="hertzbeat-ui-inline-feedback"
                />
              ) : null}

              <SettingsFormActions data-setting-config-actions="standard-equal-buttons">
                <span className="inline-flex items-center gap-1">
                  <Button
                    type="button"
                    variant="default"
                    className={coldSecondaryButtonClassName}
                    disabled={saving || !isDirty}
                    data-setting-config-command-action="discard"
                    data-setting-config-discard="local-draft-reset"
                    data-setting-config-discard-dirty={isDirty ? 'changed' : 'unchanged'}
                    data-setting-config-discard-disabled-reason={!isDirty ? 'unchanged' : undefined}
                    onClick={() => {
                      setDraft(null);
                      setSaveMessage(null);
                      setSaveTone(null);
                    }}
                  >
                    {t('settings.system-config.action.discard')}
                  </Button>
                  <SettingsFormActionHelp id="system-config-discard" {...systemConfigDiscardHelp(t)} />
                </span>
                <span className="inline-flex items-center gap-1">
                  {canSave && !isDirty ? (
                    <span
                      className="text-[11px] font-medium text-[#9fb0cc]"
                      data-setting-config-unchanged-feedback="true"
                    >
                      {t('settings.system-config.no-changes')}
                    </span>
                  ) : null}
                  <Button
                    type="submit"
                    variant="default"
                    className={coldPrimaryButtonClassName}
                    disabled={saving || !canSubmit}
                    data-setting-config-command-action="apply"
                    data-setting-config-save-dirty={isDirty ? 'changed' : 'unchanged'}
                    data-setting-config-save-disabled-reason={saveDisabledReason}
                  >
                    {saving ? t('common.saving') : t('settings.system-config.ok')}
                  </Button>
                  <SettingsFormActionHelp id="system-config-apply" {...systemConfigApplyHelp(t)} />
                </span>
              </SettingsFormActions>
            </SettingsForm>
          </div>
        );
      }}
    </ClientWorkbench>
  );
}
