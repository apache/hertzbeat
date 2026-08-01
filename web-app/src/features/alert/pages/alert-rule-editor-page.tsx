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

import { Alert, Button, Typography } from 'antd';
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
import type { AlertRuleDraft } from '../model/alert-rule-model';
import styles from '../shared/alert-rule-editor.module.css';

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
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <Typography.Title level={2}>{t(mode === 'new' ? 'alertRules.new' : 'alertRules.edit')}</Typography.Title>
        <Typography.Text type="secondary">{t('alertRules.editorDescription')}</Typography.Text>
      </header>
      <AlertRuleDetailEvidence state={detail} retry={controller.retryDetail} />
      {detail.kind === 'ready' && draft && <AlertRuleEditorWorkspace controller={controller} draft={draft} />}
    </div>
  );
}

type AlertRuleEditorController = ReturnType<typeof useAlertRuleEditorController>;

function AlertRuleEditorWorkspace({
  controller,
  draft
}: {
  controller: AlertRuleEditorController;
  draft: AlertRuleDraft;
}) {
  const { command, datasource, preview, recovery, saveFailure } = controller.state;
  const busy = command === 'saving' || recovery !== undefined;
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
      <AlertRuleEditorForm controller={controller} draft={draft} busy={busy} />
      <AlertRulePreviewEvidence state={preview} />
      <AlertRuleEditorActions controller={controller} />
    </>
  );
}

function AlertRuleEditorForm({
  controller,
  draft,
  busy
}: {
  controller: AlertRuleEditorController;
  draft: AlertRuleDraft;
  busy: boolean;
}) {
  return (
    <AlertRuleFields
      draft={draft}
      busy={busy}
      datasource={controller.state.datasource}
      metricBindings={controller.state.metricBindings}
      metricTarget={controller.state.metricTarget}
      update={controller.updateDraft}
      changeDataType={controller.changeDataType}
      changeKind={controller.changeKind}
      changeMetricApplication={controller.changeMetricApplication}
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
    />
  );
}

function AlertRuleEditorActions({ controller }: { controller: AlertRuleEditorController }) {
  const { t } = useTranslation();
  const { canSave, command, preview, recovery } = controller.state;
  return (
    <div className={styles.actions}>
      <Button disabled={command === 'saving'} onClick={controller.cancel}>
        {t('common.cancel')}
      </Button>
      <Button
        loading={preview.kind === 'loading'}
        disabled={!canSave || command === 'saving' || recovery !== undefined}
        onClick={() => {
          void controller.preview();
        }}
      >
        {t('alertRules.preview')}
      </Button>
      <Button
        type="primary"
        loading={command === 'saving' && !recovery}
        disabled={!canSave || recovery !== undefined}
        onClick={() => {
          void controller.save();
        }}
      >
        {t('common.save')}
      </Button>
    </div>
  );
}
