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

import { Button, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  AlertRuleDatasourceEvidence,
  AlertRuleDetailEvidence,
  AlertRulePreviewEvidence,
  AlertRuleSaveEvidence,
  AlertRuleSaveRecoveryEvidence
} from '../components/alert-rule-editor-evidence';
import { AlertRuleFields } from '../components/alert-rule-fields';
import { useAlertRuleEditorController } from '../controller/use-alert-rule-editor-controller';
import styles from '../shared/alert-rule-editor.module.css';

export function AlertRuleEditorPage({ mode }: { mode: 'new' | 'edit' }) {
  const { t } = useTranslation();
  const controller = useAlertRuleEditorController(mode);
  const { command, datasource, detail, draft, preview, recovery, saveFailure } = controller.state;
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <Typography.Title level={2}>{t(mode === 'new' ? 'alertRules.new' : 'alertRules.edit')}</Typography.Title>
        <Typography.Text type="secondary">{t('alertRules.editorDescription')}</Typography.Text>
      </header>
      <AlertRuleDetailEvidence state={detail} retry={controller.retryDetail} />
      {detail.kind === 'ready' && draft && (
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
          <AlertRuleFields
            draft={draft}
            busy={command === 'saving' || recovery !== undefined}
            datasource={datasource}
            metricTarget={controller.state.metricTarget}
            update={controller.updateDraft}
            changeDataType={controller.changeDataType}
            changeKind={controller.changeKind}
            changeMetricApplication={controller.changeMetricApplication}
            changeMetricAuthoringMode={controller.changeMetricAuthoringMode}
            changeMetricExpertCondition={controller.changeMetricExpertCondition}
            changeMetricStructuredCondition={controller.changeMetricStructuredCondition}
            changeMetricTarget={controller.changeMetricTarget}
            retryMetricTargetApps={controller.retryMetricTargetApps}
            retryMetricTargetHierarchy={controller.retryMetricTargetHierarchy}
          />
          <AlertRulePreviewEvidence state={preview} />
          <div className={styles.actions}>
            <Button disabled={command === 'saving'} onClick={controller.cancel}>
              {t('common.cancel')}
            </Button>
            <Button
              loading={preview.kind === 'loading'}
              disabled={command === 'saving' || recovery !== undefined}
              onClick={() => {
                void controller.preview();
              }}
            >
              {t('alertRules.preview')}
            </Button>
            <Button
              type="primary"
              loading={command === 'saving' && !recovery}
              disabled={recovery !== undefined}
              onClick={() => {
                void controller.save();
              }}
            >
              {t('common.save')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
