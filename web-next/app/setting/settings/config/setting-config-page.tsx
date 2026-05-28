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
  SettingsFormSelect
} from '../../../../components/settings/settings-form';
import { Button } from '../../../../components/ui/button';
import { coldOpsCatalogVisual } from '../../../../lib/cold-ops-visual';
import { apiMessageGet, apiMessagePost } from '../../../../lib/api-client';
import { loadSystemConfigData, persistSystemConfig } from '../../../../lib/setting-config/controller';
import {
  canSaveSystemConfig,
  buildTimezoneOptionLabel,
  SYSTEM_CONFIG_LOCALE_OPTIONS,
  SYSTEM_CONFIG_THEME_OPTIONS,
  resolveConfigSaveFeedback,
  resolveSystemConfigDraft,
  updateSystemConfigField,
  updateSystemConfigTimezone,
  type SaveTone
} from '../../../../lib/setting-config/view-model';
import { applyWorkbenchTheme, reloadWorkbenchWindow } from '../../../../lib/workbench-theme';
import type { SystemConfig, TimezoneOption } from '../../../../lib/types';

type ConfigData = {
  config: SystemConfig;
  timezones: TimezoneOption[];
};

const coldConfigVisual = coldOpsCatalogVisual;

const SETTING_CONFIG_SETTLED_CACHE_TTL_MS = 10_000;

const coldPrimaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-[#f8fafc]';

export default function SettingConfigPage() {
  const { t, setLocale } = useI18n();
  const [draft, setDraft] = useState<SystemConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveTone, setSaveTone] = useState<SaveTone>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const settingConfigCacheKey = useMemo(
    () => ['setting-config', '/config/system', '/config/timezones', reloadVersion].join(':'),
    [reloadVersion]
  );

  const load = useCallback(async (): Promise<ConfigData> => {
    void reloadVersion;
    return loadSystemConfigData(apiMessageGet);
  }, [reloadVersion]);

  return (
    <ClientWorkbench
      load={load}
      loadingCopy={t('setting.settings.config.loading')}
      cacheKey={settingConfigCacheKey}
      cacheSettledTtlMs={SETTING_CONFIG_SETTLED_CACHE_TTL_MS}
    >
      {data => {
        const config = resolveSystemConfigDraft(draft, data.config || {});
        const saveFeedback = resolveConfigSaveFeedback(saveMessage, saveTone);
        const canSave = canSaveSystemConfig(config);

        async function save() {
          setSaving(true);
          setSaveMessage(null);
            setSaveTone(null);
          try {
            setSaveMessage(
              await persistSystemConfig(apiMessagePost, config, t('common.notify.apply-success'), {
                setLocale,
                applyTheme: applyWorkbenchTheme,
                reload: () => reloadWorkbenchWindow(window.location)
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
            data-setting-config-surface="otlp-cold-system-config"
            data-setting-config-style-baseline={coldConfigVisual.canvasName}
            data-setting-config-layout="full-width-settings-form"
            className="space-y-4"
          >
            <SettingsConsoleTitle>{t('settings.system-config')}</SettingsConsoleTitle>
            <SettingsForm
              data-setting-config-form="cold-settings-form"
              data-setting-config-apply-contract="angular-apply-notify-reload"
              data-setting-config-runtime-locale="underscore-to-hyphen"
              onSubmit={event => {
                event.preventDefault();
                if (!saving && canSave) {
                  void save();
                }
              }}
            >
              <SettingsFormField label={t('settings.system-config.locale')}>
                <SettingsFormSelect
                  value={config.locale || ''}
                  data-setting-config-select-contract="angular-400px-centered-bold"
                  data-setting-config-select-kind="locale"
                  onChange={e => setDraft(prev => updateSystemConfigField(prev || data.config || {}, 'locale', e.target.value))}
                >
                  {SYSTEM_CONFIG_LOCALE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </SettingsFormSelect>
              </SettingsFormField>

              <SettingsFormField label={t('settings.system-config.timezone')}>
                <SettingsFormSelect
                  value={config.timeZoneId || ''}
                  searchable
                  searchPlaceholder={t('settings.system-config.timezone')}
                  data-setting-config-select-contract="angular-400px-centered-bold"
                  data-setting-config-timezone-search-contract="angular-nz-show-search"
                  data-setting-config-timezone-dropdown-width-contract="angular-dropdown-match-select-width-false"
                  data-setting-config-select-kind="timezone"
                  onChange={e => setDraft(prev => updateSystemConfigTimezone(prev || data.config || {}, e.target.value))}
                >
                  {data.timezones.map(zone => (
                    <option key={zone.zoneId} value={zone.zoneId}>
                      {buildTimezoneOptionLabel(zone)}
                    </option>
                  ))}
                </SettingsFormSelect>
              </SettingsFormField>

              <SettingsFormField label={t('settings.system-config.theme')}>
                <SettingsFormSelect
                  value={config.theme || ''}
                  data-setting-config-select-contract="angular-400px-centered-bold"
                  data-setting-config-select-kind="theme"
                  onChange={e => setDraft(prev => updateSystemConfigField(prev || data.config || {}, 'theme', e.target.value))}
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
                  tone={saveTone === 'success' ? 'success' : 'critical'}
                  title={saveFeedback.message}
                  variant="embedded"
                  data-setting-config-apply-feedback="angular-apply-notify"
                  data-setting-config-apply-feedback-owner="hertzbeat-ui-inline-feedback"
                />
              ) : null}

              <SettingsFormActions data-setting-config-actions="standard-equal-buttons">
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
