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

import { Alert, Button, Select, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
  systemLocales,
  systemThemes,
  type SystemConfigDraft,
  type SystemLocale,
  type SystemTheme
} from '../model/system-config-model';
import styles from './system-config-editor.module.css';

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

export function SystemConfigEditor(props: SystemConfigEditorProps) {
  const { t } = useTranslation();
  const { current } = props;
  return (
    <>
      {props.timezonesFailed && (
        <Alert type="warning" showIcon message={t('systemConfig.timezonesUnavailable')} action={
          <Button size="small" onClick={props.onTimezoneRetry}>{t('common.retry')}</Button>
        } />
      )}
      <div className={styles.form}>
        <SystemConfigField label={t('systemConfig.locale.label')} help={t('systemConfig.locale.help')}>
          <Select<SystemLocale>
            value={current.locale || null}
            options={systemLocales.map(locale => ({ value: locale, label: t(`systemConfig.locale.${locale}`) }))}
            onChange={value => props.onUpdate('locale', value)}
          />
        </SystemConfigField>
        <SystemConfigField label={t('systemConfig.timezone.label')} help={t('systemConfig.timezone.help')}>
          <Select<string>
            value={current.timeZoneId || null}
            showSearch
            optionFilterProp="label"
            loading={props.timezonesPending}
            options={props.timezoneOptions}
            onChange={value => props.onUpdate('timeZoneId', value)}
          />
        </SystemConfigField>
        <SystemConfigField label={t('systemConfig.theme.label')} help={t('systemConfig.theme.help')}>
          <Select<SystemTheme>
            value={current.theme || null}
            options={systemThemes.map(theme => ({ value: theme, label: t(`systemConfig.theme.${theme}`) }))}
            onChange={value => props.onUpdate('theme', value)}
          />
        </SystemConfigField>
      </div>
      <div className={styles.actions}>
        <Button type="primary" loading={props.saving} disabled={!props.dirty || !props.valid} onClick={props.onSave}>
          {t('common.save')}
        </Button>
        <Button disabled={!props.dirty || props.saving} onClick={props.onDiscard}>{t('systemConfig.discard')}</Button>
        {!props.dirty && <Typography.Text type="secondary">{t('systemConfig.noChanges')}</Typography.Text>}
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
