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

const coldPrimaryButtonClassName =
  'h-8 min-w-[104px] rounded-[3px] border-[#31405c] bg-[#182238] px-3 text-[12px] font-semibold text-[#d8e4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4e74f8] hover:bg-[#202a42] hover:text-[#f8fafc]';

export default function SettingConfigPage() {
  const { t, setLocale } = useI18n();
  const [draft, setDraft] = useState<SystemConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveTone, setSaveTone] = useState<SaveTone>(null);

  const load = useCallback(async (): Promise<ConfigData> => {
    return loadSystemConfigData(apiMessageGet);
  }, []);

  return (
    <ClientWorkbench load={load} loadingCopy="正在加载系统配置。">
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
              await persistSystemConfig(apiMessagePost, config, t('common.save-success'), {
                setLocale,
                applyTheme: applyWorkbenchTheme,
                reload: () => reloadWorkbenchWindow(window.location)
              })
            );
            setSaveTone('success');
          } catch (error) {
            setSaveMessage(error instanceof Error ? error.message : t('common.save-failed'));
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
                <SettingsFormFeedback className={saveFeedback.className}>{saveFeedback.message}</SettingsFormFeedback>
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
