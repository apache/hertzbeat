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

import { Alert, Button, Spin, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import styles from './alert-rule-editor-page.module.css';
import { AlertRuleFields } from './components/alert-rule-fields';
import {
  useAlertRuleEditorController,
  type AlertRuleEditorDetailState,
  type AlertRuleEditorFailure,
  type AlertRulePreviewState,
  type AlertRuleSaveRecovery
} from './controller/use-alert-rule-editor-controller';

function DetailEvidence({ state, retry }: { state: AlertRuleEditorDetailState; retry: () => unknown }) {
  const { t } = useTranslation();
  if (state.kind === 'ready') return null;
  if (state.kind === 'loading') return <Spin />;
  const message = t(detailFailureMessageKey(state.kind));
  return (
    <Alert
      type="error"
      showIcon
      message={message}
      action={
        <Button
          size="small"
          onClick={() => {
            void retry();
          }}
        >
          {t('common.retry')}
        </Button>
      }
    />
  );
}

function PreviewEvidence({ state }: { state: AlertRulePreviewState }) {
  const { t } = useTranslation();
  if (state.kind === 'idle' || state.kind === 'loading') return null;
  if (state.kind === 'unavailable') return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (state.kind === 'error') return <Alert type="error" showIcon message={t('alertRules.previewFailed')} />;
  if (state.kind === 'empty') return <Alert type="warning" showIcon message={t('alertRules.previewEmpty')} />;
  return <Alert type="success" showIcon message={t('alertRules.previewSuccess', { count: state.records.length })} />;
}

function SaveEvidence({ failure }: { failure: AlertRuleEditorFailure | undefined }) {
  const { t } = useTranslation();
  if (!failure) return null;
  return <Alert type="error" showIcon message={t(saveFailureMessageKey(failure))} />;
}

function SaveRecovery({
  recovery,
  retrying,
  retry
}: {
  recovery: AlertRuleSaveRecovery | undefined;
  retrying: boolean;
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  if (!recovery) return null;
  const message = recovery.failure === 'unavailable' ? t('common.unavailable') : t('common.routeError.description');
  return (
    <Alert
      type="warning"
      showIcon
      message={message}
      action={
        recovery.retryable ? (
          <Button size="small" disabled={retrying} onClick={() => void retry()}>
            {t('common.retry')}
          </Button>
        ) : undefined
      }
    />
  );
}

function detailFailureMessageKey(failure: AlertRuleEditorFailure) {
  if (failure === 'missing') return 'common.notFound.description';
  if (failure === 'unavailable') return 'common.unavailable';
  return 'common.routeError.description';
}

function saveFailureMessageKey(failure: AlertRuleEditorFailure) {
  if (failure === 'missing') return 'common.notFound.description';
  if (failure === 'unavailable') return 'common.unavailable';
  return 'alertRules.saveFailed';
}

export function AlertRuleEditorPage({ mode }: { mode: 'new' | 'edit' }) {
  const { t } = useTranslation();
  const controller = useAlertRuleEditorController(mode);
  const { command, detail, draft, preview, recovery, saveFailure } = controller.state;
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <Typography.Title level={2}>{t(mode === 'new' ? 'alertRules.new' : 'alertRules.edit')}</Typography.Title>
        <Typography.Text type="secondary">{t('alertRules.editorDescription')}</Typography.Text>
      </header>
      <DetailEvidence state={detail} retry={controller.retryDetail} />
      {detail.kind === 'ready' && draft && (
        <>
          {recovery ? (
            <SaveRecovery recovery={recovery} retrying={command === 'saving'} retry={controller.retrySave} />
          ) : (
            <SaveEvidence failure={saveFailure} />
          )}
          <AlertRuleFields
            draft={draft}
            busy={command === 'saving' || recovery !== undefined}
            update={controller.updateDraft}
            changeKind={controller.changeKind}
          />
          <PreviewEvidence state={preview} />
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
