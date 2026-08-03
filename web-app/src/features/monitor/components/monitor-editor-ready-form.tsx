/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalFormActions, OperationalSection } from '@/shared/operational-page';

import type { MonitorEditorCommandFeedback, MonitorEditorDraft } from '../model/monitor-editor-model';
import { MonitorEditorAppPicker } from './monitor-editor-app-picker';
import {
  MonitorEditorCollectionFields,
  MonitorEditorNameField,
  MonitorEditorSourceFields
} from './monitor-editor-core-fields';
import { monitorEditorFieldLabels } from './monitor-editor-field-labels';
import type { MonitorEditorFormController } from './monitor-editor-form-model';
import { MonitorGrafanaFields } from './monitor-grafana-fields';
import { MonitorEditorMetadataFields } from './monitor-editor-metadata-fields';
import {
  MonitorEditorApplicationParams,
  MonitorEditorDiscoveryParams,
  MonitorEditorHostParam
} from './monitor-editor-param-sections';
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
  const [appPickerOpen, setAppPickerOpen] = useState(false);
  const labels = monitorEditorFieldLabels(t);
  const context = {
    draft,
    controller,
    validationIssues: controller.state.validationIssues,
    language: i18n.language,
    labels,
    invalidMessage: t('monitor.editor.invalidField')
  };
  return (
    <>
      <MonitorEditorValidationSummary
        issues={controller.state.validationIssues}
        defines={controller.state.defines}
        language={i18n.language}
      />
      <OperationalSection title={t('monitor.editor.connection')}>
        <div className={`${styles.formRail} ${styles.form}`}>
          <MonitorEditorSourceFields
            mode={mode}
            controller={controller}
            draft={draft}
            onChangeApplication={() => setAppPickerOpen(true)}
          />
          <MonitorEditorHostParam context={context} />
          <MonitorEditorDiscoveryParams context={context} />
          <MonitorEditorNameField controller={controller} draft={draft} />
          <MonitorEditorApplicationParams context={context} />
          <MonitorEditorCollectionFields controller={controller} draft={draft} />
        </div>
      </OperationalSection>
      <div className={`${styles.formRail} ${styles.metadataDisclosure}`}>
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
          <div className={`${styles.formRail} ${styles.form}`}>
            <MonitorEditorMetadataFields controller={controller} draft={draft} labels={labels} />
            <MonitorGrafanaFields
              draft={draft}
              update={controller.actions.updateGrafana}
              disabled={controller.state.busy}
            />
          </div>
        </OperationalSection>
      ) : null}
      <MonitorEditorCommandResult feedback={controller.state.feedback} />
      <div className={`${styles.formRail} ${styles.formActions}`}>
        <MonitorEditorActions controller={controller} />
      </div>
      {mode === 'new' ? (
        <MonitorEditorAppPicker
          apps={controller.state.apps}
          open={appPickerOpen}
          onCancel={() => setAppPickerOpen(false)}
          onSelect={app => {
            setAppPickerOpen(false);
            controller.actions.changeSource({ app, scrape: 'static' });
          }}
        />
      ) : null}
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
        aria-label={t('monitor.editor.detect')}
        loading={command === 'detecting'}
        disabled={busy}
        onClick={() => void controller.actions.detect()}
      >
        {t('monitor.editor.detect')}
      </Button>
      <Button
        aria-label={t('common.save')}
        type="primary"
        loading={command === 'saving'}
        disabled={busy}
        onClick={() => void controller.actions.save()}
      >
        {t('common.save')}
      </Button>
    </OperationalFormActions>
  );
}

function MonitorEditorCommandResult({ feedback }: { feedback: MonitorEditorCommandFeedback | null }) {
  const { t } = useTranslation();
  if (!feedback) return null;
  const successful = feedback === 'detect-success';
  const uncertain = feedback === 'save-unknown';
  return (
    <div className={`${styles.formRail} ${styles.commandFeedback}`}>
      <Alert
        role={successful || uncertain ? 'status' : 'alert'}
        showIcon
        type={commandFeedbackType(feedback)}
        message={t(commandFeedbackMessageKey(feedback))}
      />
    </div>
  );
}

function commandFeedbackMessageKey(feedback: MonitorEditorCommandFeedback) {
  if (feedback === 'detect-success') return 'monitor.editor.detectSuccess';
  if (feedback === 'detect-failed') return 'monitor.editor.detectFailed';
  if (feedback === 'save-unknown') return 'monitor.editor.saveUnknown';
  return 'monitor.editor.saveFailed';
}

function commandFeedbackType(feedback: MonitorEditorCommandFeedback) {
  if (feedback === 'detect-success') return 'success' as const;
  if (feedback === 'save-unknown') return 'warning' as const;
  return 'error' as const;
}
