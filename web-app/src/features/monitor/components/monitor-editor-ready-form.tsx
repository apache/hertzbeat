/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalFormActions, OperationalStatePanel } from '@/shared/operational-page';

import type { MonitorEditorCommandFeedback, MonitorEditorDraft } from '../model/monitor-editor-model';
import { MonitorEditorAppPicker } from './monitor-editor-app-picker';
import { monitorEditorFieldLabels } from './monitor-editor-field-labels';
import type { MonitorEditorFormController } from './monitor-editor-form-model';
import { MonitorEditorConnectionSection, MonitorEditorMetadataSection } from './monitor-editor-ready-sections';
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
      <MonitorEditorConnectionSection
        mode={mode}
        controller={controller}
        draft={draft}
        context={context}
        onChangeApplication={() => setAppPickerOpen(true)}
      />
      <MonitorEditorMetadataSection
        controller={controller}
        draft={draft}
        labels={labels}
        visible={metadataVisible}
        toggle={() => setMetadataVisible(value => !value)}
      />
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
  if (typeof feedback !== 'string') {
    return (
      <div className={`${styles.formRail} ${styles.commandFeedback}`}>
        <OperationalStatePanel
          kind={commandFailureState(feedback.failure)}
          title={t(feedback.action === 'detect' ? 'monitor.editor.detectFailed' : 'monitor.editor.saveFailed')}
          description={t(`monitor.editor.failure.${feedback.failure}`)}
        />
      </div>
    );
  }
  return (
    <div className={`${styles.formRail} ${styles.commandFeedback}`}>
      <Alert
        role="status"
        showIcon
        type={commandFeedbackType(feedback)}
        message={t(feedback === 'detect-success' ? 'monitor.editor.detectSuccess' : 'monitor.editor.saveUnknown')}
      />
    </div>
  );
}

function commandFeedbackType(feedback: MonitorEditorCommandFeedback) {
  if (feedback === 'detect-success') return 'success' as const;
  return 'warning' as const;
}

function commandFailureState(failure: Extract<MonitorEditorCommandFeedback, { kind: 'failure' }>['failure']) {
  if (failure === 'permission') return 'permission' as const;
  if (failure === 'unavailable') return 'unavailable' as const;
  return 'error' as const;
}
