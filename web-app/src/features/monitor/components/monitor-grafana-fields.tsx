/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { App, Button, Input, Switch, Upload } from 'antd';
import { useTranslation } from 'react-i18next';

import type { MonitorEditorDraft } from '../model/monitor-editor-model';
import type { MonitorEditorFormController } from './monitor-editor-form-model';
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
      <label>
        {t('monitor.editor.grafanaEnabled')}
        <Switch
          checked={draft.grafanaDashboard.enabled}
          disabled={disabled}
          onChange={enabled => update({ enabled })}
        />
      </label>
      {draft.grafanaDashboard.enabled && (
        <label className={styles.wide}>
          {t('monitor.editor.grafanaTemplate')}
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
