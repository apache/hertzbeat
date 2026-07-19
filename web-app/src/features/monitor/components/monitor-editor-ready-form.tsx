/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import type { MonitorEditorDraft } from '../model/monitor-editor-model';
import { MonitorEditorCoreFields, MonitorGrafanaFields } from './monitor-editor-core-fields';
import { monitorEditorFieldLabels } from './monitor-editor-field-labels';
import type { MonitorEditorFormController } from './monitor-editor-form-model';
import { MonitorEditorMetadataFields } from './monitor-editor-metadata-fields';
import { MonitorEditorParamSections } from './monitor-editor-param-sections';
import { MonitorEditorValidationSummary } from './monitor-editor-validation-summary';
import styles from './monitor-editor-form-view.module.css';

export function ReadyMonitorEditorForm({
  mode,
  controller,
  draft
}: {
  mode: 'new' | 'edit';
  controller: MonitorEditorFormController;
  draft: MonitorEditorDraft;
}) {
  const { t, i18n } = useTranslation();
  const labels = monitorEditorFieldLabels(t);
  const context = {
    draft,
    controller,
    validationIssues: controller.state.validationIssues,
    language: i18n.language,
    labels
  };
  return (
    <>
      <MonitorEditorValidationSummary
        issues={controller.state.validationIssues}
        defines={controller.state.defines}
        language={i18n.language}
      />
      <div className={styles.form}>
        <MonitorEditorCoreFields mode={mode} controller={controller} draft={draft} />
        <MonitorEditorParamSections context={context} />
        <MonitorEditorMetadataFields controller={controller} draft={draft} labels={labels} />
        <MonitorGrafanaFields
          draft={draft}
          update={controller.actions.updateGrafana}
          disabled={controller.state.busy}
        />
      </div>
      <MonitorEditorActions controller={controller} />
    </>
  );
}

function MonitorEditorActions({ controller }: { controller: MonitorEditorFormController }) {
  const { t } = useTranslation();
  const { busy, command } = controller.state;
  return (
    <div className={styles.actions}>
      <Button onClick={controller.actions.cancel}>{t('common.cancel')}</Button>
      <Button
        loading={command === 'detecting'}
        disabled={busy && command !== 'detecting'}
        onClick={() => void controller.actions.detect()}
      >
        {t('monitor.editor.detect')}
      </Button>
      <Button
        type="primary"
        loading={command === 'saving'}
        disabled={busy && command !== 'saving'}
        onClick={() => void controller.actions.save()}
      >
        {t('common.save')}
      </Button>
    </div>
  );
}
