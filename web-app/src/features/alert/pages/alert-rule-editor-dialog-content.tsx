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

import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  AlertRuleDatasourceEvidence,
  AlertRulePreviewEvidence,
  AlertRuleSaveEvidence,
  AlertRuleSaveRecoveryEvidence
} from '../components/alert-rule-editor-evidence';
import { AlertRuleFields } from '../components/alert-rule-fields';
import type { useAlertRuleEditorController } from '../controller/use-alert-rule-editor-controller';
import { validateAlertRuleDraft, type AlertRuleDraft } from '../model/alert-rule-model';
import styles from '../shared/alert-rule-editor.module.css';

type AlertRuleEditorController = ReturnType<typeof useAlertRuleEditorController>;

export function AlertRuleEditorWorkspace({
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
      {draft.kind !== 'periodic' && <AlertRulePreviewEvidence state={preview} />}
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
      previewState={controller.state.preview}
    />
  );
}

export function AlertRuleEditorActions({
  controller,
  cancel,
  validate
}: {
  controller: AlertRuleEditorController;
  cancel: () => void;
  validate: () => void;
}) {
  const { t } = useTranslation();
  const { canSave, command, recovery } = controller.state;
  return (
    <div className={styles.actions}>
      <Button disabled={command === 'saving'} onClick={cancel}>
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
