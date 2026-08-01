/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalFormActions, OperationalSection } from '@/shared/operational-page';

import type { MonitorEditorDraft } from '../model/monitor-editor-model';
import { MonitorEditorCoreFields } from './monitor-editor-core-fields';
import { monitorEditorFieldLabels } from './monitor-editor-field-labels';
import type { MonitorEditorFormController } from './monitor-editor-form-model';
import { MonitorGrafanaFields } from './monitor-grafana-fields';
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
  const [metadataVisible, setMetadataVisible] = useState(() => hasMonitorMetadata(draft));
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
      <OperationalSection title={t('monitor.editor.connection')}>
        <div className={styles.form}>
          <MonitorEditorCoreFields mode={mode} controller={controller} draft={draft} />
          <MonitorEditorParamSections context={context} />
        </div>
      </OperationalSection>
      <div className={styles.metadataDisclosure}>
        <Button
          type="text"
          aria-expanded={metadataVisible}
          disabled={controller.state.busy}
          onClick={() => setMetadataVisible(value => !value)}
        >
          {t(metadataVisible ? 'monitor.editor.hideMetadata' : 'monitor.editor.showMetadata')}
        </Button>
      </div>
      {metadataVisible ? (
        <OperationalSection title={t('monitor.editor.metadata')}>
          <div className={styles.form}>
            <MonitorEditorMetadataFields controller={controller} draft={draft} labels={labels} />
            <MonitorGrafanaFields
              draft={draft}
              update={controller.actions.updateGrafana}
              disabled={controller.state.busy}
            />
          </div>
        </OperationalSection>
      ) : null}
      <MonitorEditorActions controller={controller} />
    </>
  );
}

/**
 * Existing ownership data stays visible while a new empty monitor keeps optional
 * metadata out of the connection task's first viewport.
 */
function hasMonitorMetadata(draft: MonitorEditorDraft) {
  return Boolean(
    Object.keys(draft.monitor.labels ?? {}).length ||
    Object.keys(draft.monitor.annotations ?? {}).length ||
    draft.monitor.description?.trim() ||
    draft.grafanaDashboard.enabled
  );
}

function MonitorEditorActions({ controller }: { controller: MonitorEditorFormController }) {
  const { t } = useTranslation();
  const { busy, command } = controller.state;
  return (
    <OperationalFormActions>
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
    </OperationalFormActions>
  );
}
