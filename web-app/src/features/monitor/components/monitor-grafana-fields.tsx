/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { App, Button, Input, Switch, Upload } from 'antd';
import { useTranslation } from 'react-i18next';

import type { MonitorEditorDraft } from '../model/monitor-editor-model';
import type { MonitorEditorFormController } from './monitor-editor-form-model';
import { MonitorEditorFieldLabel } from './monitor-editor-field-label';
import styles from './monitor-editor-form-view.module.css';

type MonitorGrafanaFieldsProps = {
  draft: MonitorEditorDraft;
  disabled: boolean;
  update: MonitorEditorFormController['actions']['updateGrafana'];
};

export function MonitorGrafanaFields({ draft, disabled, update }: MonitorGrafanaFieldsProps) {
  const { message } = App.useApp();
  const { t } = useTranslation();
  if (draft.monitor.app !== 'prometheus') return null;

  async function importTemplate(file: File) {
    try {
      const template = await file.text();
      update({ template });
      void message.success(t('monitor.editor.grafanaImportSuccess'));
    } catch {
      // File contents and native read errors stay inside the browser session.
      void message.error(t('monitor.editor.grafanaImportFailure'));
    }
  }

  return (
    <>
      <label className={styles.formRow}>
        <MonitorEditorFieldLabel help={t('monitor.editor.grafanaEnabledHelp')}>
          {t('monitor.editor.grafanaEnabled')}
        </MonitorEditorFieldLabel>
        <Switch
          checked={draft.grafanaDashboard.enabled}
          disabled={disabled}
          onChange={enabled => update({ enabled })}
        />
      </label>
      {draft.grafanaDashboard.enabled && (
        <label className={`${styles.formRow} ${styles.wide}`}>
          <MonitorEditorFieldLabel help={t('monitor.editor.grafanaTemplateHelp')}>
            {t('monitor.editor.grafanaTemplate')}
          </MonitorEditorFieldLabel>
          <Upload
            accept=".json,application/json"
            disabled={disabled}
            maxCount={1}
            showUploadList={false}
            beforeUpload={file => {
              // Returning false prevents rc-upload from sending the local file.
              void importTemplate(file);
              return false;
            }}
          >
            <Button disabled={disabled}>{t('monitor.editor.grafanaImport')}</Button>
          </Upload>
          <Input.TextArea
            rows={8}
            disabled={disabled}
            value={draft.grafanaDashboard.template ?? ''}
            onChange={event => update({ template: event.target.value })}
          />
        </label>
      )}
    </>
  );
}
