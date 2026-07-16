/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, App, Button, Select, Skeleton, Typography } from "antd";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { resolveLocale } from "@/core/i18n/i18n";
import { persistSystemPreferences, readRuntimeTheme } from "@/core/runtime-preferences";

import styles from "./system-config-page.module.css";
import { SettingsNav } from '@/shared/settings/settings-nav';
import { loadSystemConfig, loadTimezones, saveSystemConfig } from "./system-config-api";
import {
  createSystemConfigDraft,
  isSystemConfigDirty,
  systemLocales,
  systemThemes,
  validateSystemConfigDraft,
  type SystemConfigDraft,
  type SystemLocale,
  type SystemTheme,
  type TimezoneOption,
} from "./system-config-model";

function runtimeDefaults(language?: string) {
  return {
    locale: resolveLocale(language),
    timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    theme: readRuntimeTheme(),
  };
}

function buildTimezoneOptions(timezones: TimezoneOption[] | undefined, currentTimeZoneId: string) {
  const options = (timezones ?? []).map((timezone) => ({
    value: timezone.zoneId,
    label: `${timezone.zoneId} (${timezone.offset}) ${timezone.displayName}`,
  }));
  if (currentTimeZoneId && !options.some((option) => option.value === currentTimeZoneId)) {
    options.unshift({ value: currentTimeZoneId, label: currentTimeZoneId });
  }
  return options;
}

function hasSystemConfigChanges(draft: SystemConfigDraft | null, baseline: SystemConfigDraft) {
  return draft ? isSystemConfigDirty(draft, baseline) : false;
}

function withRuntimeTheme(config: SystemConfigDraft | null | undefined, theme: SystemTheme) {
  return config ? { ...config, theme } : null;
}

type SystemConfigEditorProps = {
  current: SystemConfigDraft;
  timezoneOptions: Array<{ value: string; label: string }>;
  timezonesPending: boolean;
  timezonesFailed: boolean;
  dirty: boolean;
  valid: boolean;
  saving: boolean;
  onTimezoneRetry: () => void;
  onUpdate: <K extends keyof SystemConfigDraft>(field: K, value: SystemConfigDraft[K]) => void;
  onSave: () => void;
  onDiscard: () => void;
};

function SystemConfigEditor(props: SystemConfigEditorProps) {
  const { t } = useTranslation();
  const { current } = props;
  return (
    <>
      {props.timezonesFailed && (
        <Alert
          type="warning"
          showIcon
          title={t("systemConfig.timezonesUnavailable")}
          action={
            <Button size="small" onClick={props.onTimezoneRetry}>
              {t("common.retry")}
            </Button>
          }
        />
      )}
      <div className={styles.form}>
        <SystemConfigField label={t("systemConfig.locale.label")} help={t("systemConfig.locale.help")}>
          <Select<SystemLocale>
            value={current.locale || null}
            options={systemLocales.map((locale) => ({
              value: locale,
              label: t(`systemConfig.locale.${locale}`),
            }))}
            onChange={(value) => props.onUpdate("locale", value)}
          />
        </SystemConfigField>
        <SystemConfigField label={t("systemConfig.timezone.label")} help={t("systemConfig.timezone.help")}>
          <Select<string>
            value={current.timeZoneId || null}
            showSearch
            optionFilterProp="label"
            loading={props.timezonesPending}
            options={props.timezoneOptions}
            onChange={(value) => props.onUpdate("timeZoneId", value)}
          />
        </SystemConfigField>
        <SystemConfigField label={t("systemConfig.theme.label")} help={t("systemConfig.theme.help")}>
          <Select<SystemTheme>
            value={current.theme || null}
            options={systemThemes.map((theme) => ({
              value: theme,
              label: t(`systemConfig.theme.${theme}`),
            }))}
            onChange={(value) => props.onUpdate("theme", value)}
          />
        </SystemConfigField>
      </div>
      <div className={styles.actions}>
        <Button type="primary" loading={props.saving} disabled={!props.dirty || !props.valid} onClick={props.onSave}>
          {t("common.save")}
        </Button>
        <Button disabled={!props.dirty || props.saving} onClick={props.onDiscard}>
          {t("systemConfig.discard")}
        </Button>
        {!props.dirty && <Typography.Text type="secondary">{t("systemConfig.noChanges")}</Typography.Text>}
      </div>
    </>
  );
}

function SystemConfigField({ label, help, children }: { label: string; help: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <span className={styles.control}>
        {children}
        <Typography.Text type="secondary">{help}</Typography.Text>
      </span>
    </label>
  );
}

export function SystemConfigPage() {
  const { t, i18n } = useTranslation();
  const { message } = App.useApp();
  const config = useQuery({ queryKey: ["config", "system"], queryFn: loadSystemConfig });
  const timezones = useQuery({ queryKey: ["config", "timezones"], queryFn: loadTimezones });
  const [draft, setDraft] = useState<SystemConfigDraft | null>(null);
  const defaults = runtimeDefaults(i18n.resolvedLanguage);
  const baseline = createSystemConfigDraft(withRuntimeTheme(config.data, defaults.theme), defaults);
  const current = draft ?? baseline;
  const dirty = hasSystemConfigChanges(draft, baseline);
  const missing = validateSystemConfigDraft(current);
  const save = useMutation({
    mutationFn: saveSystemConfig,
    onSuccess: () => {
      persistSystemPreferences(current);
      void message.success(t("systemConfig.saveSuccess"));
      globalThis.location.reload();
    },
    onError: () => void message.error(t("systemConfig.saveFailed")),
  });

  const update = <K extends keyof SystemConfigDraft>(field: K, value: SystemConfigDraft[K]) => {
    setDraft({ ...current, [field]: value });
  };
  const timezoneOptions = buildTimezoneOptions(timezones.data, current.timeZoneId);

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <Typography.Title level={2}>{t("systemConfig.title")}</Typography.Title>
        <Typography.Text type="secondary">{t("systemConfig.description")}</Typography.Text>
      </header>
      <SettingsNav />
      {config.isError && (
        <Alert
          type="error"
          showIcon
          title={t("systemConfig.unavailable")}
          action={
            <Button size="small" onClick={() => void config.refetch()}>
              {t("common.retry")}
            </Button>
          }
        />
      )}
      {config.isPending && <Skeleton active paragraph={{ rows: 4 }} />}
      {config.isSuccess && (
        <SystemConfigEditor
          current={current}
          timezoneOptions={timezoneOptions}
          timezonesPending={timezones.isPending}
          timezonesFailed={timezones.isError}
          dirty={dirty}
          valid={missing.length === 0}
          saving={save.isPending}
          onTimezoneRetry={() => void timezones.refetch()}
          onUpdate={update}
          onSave={() => save.mutate(current)}
          onDiscard={() => setDraft(null)}
        />
      )}
    </div>
  );
}
