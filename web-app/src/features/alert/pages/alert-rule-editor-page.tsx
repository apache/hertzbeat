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

import { Alert, Button, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  AlertRuleDatasourceEvidence,
  AlertRuleDetailEvidence,
  AlertRulePreviewEvidence,
  AlertRuleSaveEvidence,
  AlertRuleSaveRecoveryEvidence
} from '../components/alert-rule-editor-evidence';
import { AlertRuleFields } from '../components/alert-rule-fields';
import { useAlertRuleActionCapabilities } from '../controller/use-alert-rule-action-capabilities';
import { useAlertRuleEditorController } from '../controller/use-alert-rule-editor-controller';
import { validateAlertRuleDraft, type AlertRuleDraft } from '../model/alert-rule-model';
import styles from '../shared/alert-rule-editor.module.css';
import { AlertRuleListPage } from './alert-rule-list-page';

export function AlertRuleEditorPage({ mode }: { mode: 'new' | 'edit' }) {
  const { t } = useTranslation();
  const capabilities = useAlertRuleActionCapabilities();
  if (capabilities.canWrite) return <AlertRuleEditorWorkspacePage mode={mode} />;
  return (
    <Alert
      type="warning"
      showIcon
      message={t('common.permission.roleRequiredTitle')}
      description={t('common.permission.roleRequiredDescription')}
    />
  );
}

function AlertRuleEditorWorkspacePage({ mode }: { mode: 'new' | 'edit' }) {
  const { t } = useTranslation();
  const controller = useAlertRuleEditorController(mode);
  const { detail, draft } = controller.state;
  const cancel = controller.cancel;
  const [validationAttempted, setValidationAttempted] = useState(false);
  const missingNewStrategy = mode === 'new' && controller.state.requestedKind === null;
  useEffect(() => {
    if (missingNewStrategy) cancel();
  }, [cancel, missingNewStrategy]);
  const busy = controller.state.command === 'saving' || controller.state.recovery !== undefined;
  useAlertRuleDialogEscape({ busy, cancel, enabled: !missingNewStrategy });
  if (missingNewStrategy) return <AlertRuleListPage />;
  const titleKey = resolveEditorTitleKey(mode, controller.state.requestedKind ?? draft?.kind ?? 'realtime');
  return (
    <>
      <AlertRuleListPage />
      <Modal
        open
        centered={false}
        closable={!busy}
        footer={
          detail.kind === 'ready' && draft ? (
            <AlertRuleEditorActions controller={controller} validate={() => setValidationAttempted(true)} />
          ) : null
        }
        keyboard={false}
        maskClosable={false}
        rootClassName="hb-alert-rule-dialog-root"
        title={t(titleKey)}
        width="70%"
        onCancel={() => {
          if (!busy) cancel();
        }}
      >
        <div className={styles.editorDialogBody}>
          <AlertRuleDetailEvidence state={detail} retry={controller.retryDetail} />
          {detail.kind === 'ready' && draft && (
            <AlertRuleEditorWorkspace controller={controller} draft={draft} validationAttempted={validationAttempted} />
          )}
        </div>
      </Modal>
    </>
  );
}

function useAlertRuleDialogEscape({ busy, cancel, enabled }: { busy: boolean; cancel: () => void; enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || busy) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target && !target.closest('.hb-alert-rule-dialog-root')) return;
      const sqlEditor = target?.closest('[data-hb-alert-sql-editor="codemirror"]');
      if (sqlEditor?.querySelector('.cm-tooltip-autocomplete')) return;
      event.preventDefault();
      event.stopPropagation();
      cancel();
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [busy, cancel, enabled]);
}

function resolveEditorTitleKey(mode: 'new' | 'edit', kind: AlertRuleDraft['kind']) {
  if (mode === 'new') return kind === 'periodic' ? 'alertRules.newPeriodic' : 'alertRules.newRealtime';
  return kind === 'periodic' ? 'alertRules.editPeriodic' : 'alertRules.editRealtime';
}

type AlertRuleEditorController = ReturnType<typeof useAlertRuleEditorController>;

function AlertRuleEditorWorkspace({
  controller,
  draft,
  validationAttempted
}: {
  controller: AlertRuleEditorController;
  draft: AlertRuleDraft;
  validationAttempted: boolean;
}) {
  const { command, datasource, preview, recovery, saveFailure } = controller.state;
  const busy = command === 'saving' || recovery !== undefined;
  const invalidFields = validationAttempted ? validateAlertRuleDraft(draft) : [];
  return (
    <>
      {recovery ? (
        <AlertRuleSaveRecoveryEvidence
          recovery={recovery}
          retrying={command === 'saving'}
          retry={controller.retrySave}
        />
      ) : (
        <AlertRuleSaveEvidence failure={saveFailure} />
      )}
      <AlertRuleDatasourceEvidence state={datasource} retry={controller.retryDatasource} />
      <AlertRuleEditorForm controller={controller} draft={draft} busy={busy} invalidFields={invalidFields} />
      <AlertRulePreviewEvidence state={preview} />
    </>
  );
}

function AlertRuleEditorForm({
  controller,
  draft,
  busy,
  invalidFields
}: {
  controller: AlertRuleEditorController;
  draft: AlertRuleDraft;
  busy: boolean;
  invalidFields: ReturnType<typeof validateAlertRuleDraft>;
}) {
  return (
    <AlertRuleFields
      draft={draft}
      busy={busy}
      invalidFields={invalidFields}
      datasource={controller.state.datasource}
      metricBindings={controller.state.metricBindings}
      metricTarget={controller.state.metricTarget}
      labelSuggestions={controller.state.labelSuggestions}
      update={controller.updateDraft}
      changeDataType={controller.changeDataType}
      changeMetricAuthoringMode={controller.changeMetricAuthoringMode}
      changeMetricBindingIds={controller.changeMetricBindingIds}
      changeMetricBindingLabels={controller.changeMetricBindingLabels}
      changeMetricExpertCondition={controller.changeMetricExpertCondition}
      changeMetricStructuredCondition={controller.changeMetricStructuredCondition}
      changeMetricTarget={controller.changeMetricTarget}
      openMetricBindings={controller.openMetricBindings}
      cancelMetricBindings={controller.cancelMetricBindings}
      confirmMetricBindings={controller.confirmMetricBindings}
      retryMetricBindings={controller.retryMetricBindings}
      retryMetricTargetApps={controller.retryMetricTargetApps}
      retryMetricTargetHierarchy={controller.retryMetricTargetHierarchy}
      preview={controller.preview}
      previewLoading={controller.state.preview.kind === 'loading'}
    />
  );
}

function AlertRuleEditorActions({
  controller,
  validate
}: {
  controller: AlertRuleEditorController;
  validate: () => void;
}) {
  const { t } = useTranslation();
  const { canSave, command, recovery } = controller.state;
  return (
    <div className={styles.actions}>
      <Button disabled={command === 'saving'} onClick={controller.cancel}>
        {t('common.cancel')}
      </Button>
      <Button
        type="primary"
        loading={command === 'saving' && !recovery}
        disabled={!canSave || recovery !== undefined}
        onClick={() => {
          validate();
          void controller.save();
        }}
      >
        {t('alertRules.confirm')}
      </Button>
    </div>
  );
}
