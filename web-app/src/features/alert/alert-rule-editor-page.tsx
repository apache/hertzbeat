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

import { Alert, Button, Input, InputNumber, Select, Spin, Switch, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertRuleDataType, AlertRuleDraft, AlertRuleKind } from './alert-rule-model';
import styles from './alert-rule-editor-page.module.css';
import {
  useAlertRuleEditorController, type AlertRuleEditorDetailState, type AlertRuleEditorFailure,
  type AlertRulePreviewState
} from './controller/use-alert-rule-editor-controller';

function AlertRuleFields({ draft, update, changeKind }: {
  draft: AlertRuleDraft;
  update: (patch: Partial<AlertRuleDraft>) => void;
  changeKind: (kind: AlertRuleKind) => void;
}) {
  const { t } = useTranslation();
  const kinds: AlertRuleKind[] = ['realtime', 'periodic'];
  const dataTypes: AlertRuleDataType[] = draft.kind === 'periodic' ? ['metric', 'log', 'trace'] : ['metric', 'log'];
  return (
    <div className={styles.form}>
      <label>{t('alertRules.name')}
        <Input value={draft.name} onChange={event => update({ name: event.target.value })} />
      </label>
      <label>{t('alertRules.kind.label')}
        <Select value={draft.kind} onChange={changeKind}
          options={kinds.map(value => ({ value, label: t(`alertRules.kind.${value}`) }))} />
      </label>
      <label>{t('alertRules.dataType.label')}
        <Select value={draft.dataType} onChange={dataType => update({ dataType })}
          options={dataTypes.map(value => ({ value, label: t(`alertRules.dataType.${value}`) }))} />
      </label>
      <label>{t('alertRules.enabled')}
        <Switch checked={draft.enable} onChange={enable => update({ enable })} />
      </label>
      <label className={styles.wide}>{t('alertRules.expression')}
        <Input.TextArea rows={5} value={draft.expr} onChange={event => update({ expr: event.target.value })} />
      </label>
      <label className={styles.wide}>{t('alertRules.template')}
        <Input.TextArea rows={3} value={draft.template} onChange={event => update({ template: event.target.value })} />
      </label>
      <label className={styles.wide}>{t('alertRules.labels')}
        <Input value={draft.labelsText} placeholder={t('alertRules.labelsPlaceholder')}
          onChange={event => update({ labelsText: event.target.value })} />
      </label>
      {draft.kind === 'periodic' && <label>{t('alertRules.period')}
        <InputNumber min={1} value={draft.period} onChange={period => update({ period })} />
      </label>}
      <label>{t('alertRules.times')}
        <InputNumber min={1} value={draft.times} onChange={times => update({ times })} />
      </label>
    </div>
  );
}

function DetailEvidence({ state, retry }: { state: AlertRuleEditorDetailState; retry: () => unknown }) {
  const { t } = useTranslation();
  if (state.kind === 'ready') return null;
  if (state.kind === 'loading') return <Spin />;
  const message = state.kind === 'missing' ? t('common.notFound.description')
    : state.kind === 'unavailable' ? t('common.unavailable') : t('common.routeError.description');
  return <Alert type="error" showIcon message={message}
    action={<Button size="small" onClick={() => { void retry(); }}>{t('common.retry')}</Button>} />;
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
  return <Alert type="error" showIcon
    message={failure === 'missing' ? t('common.notFound.description')
      : failure === 'unavailable' ? t('common.unavailable') : t('alertRules.saveFailed')} />;
}

export function AlertRuleEditorPage({ mode }: { mode: 'new' | 'edit' }) {
  const { t } = useTranslation();
  const controller = useAlertRuleEditorController(mode);
  const { command, detail, draft, preview, saveFailure } = controller.state;
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <Typography.Title level={2}>{t(mode === 'new' ? 'alertRules.new' : 'alertRules.edit')}</Typography.Title>
        <Typography.Text type="secondary">{t('alertRules.editorDescription')}</Typography.Text>
      </header>
      <DetailEvidence state={detail} retry={controller.retryDetail} />
      {detail.kind === 'ready' && draft && <>
        <SaveEvidence failure={saveFailure} />
        <AlertRuleFields draft={draft} update={controller.updateDraft} changeKind={controller.changeKind} />
        <PreviewEvidence state={preview} />
        <div className={styles.actions}>
          <Button disabled={command === 'saving'} onClick={controller.cancel}>{t('common.cancel')}</Button>
          <Button loading={preview.kind === 'loading'} disabled={command === 'saving'}
            onClick={() => { void controller.preview(); }}>{t('alertRules.preview')}</Button>
          <Button type="primary" loading={command === 'saving'} onClick={() => { void controller.save(); }}>{t('common.save')}</Button>
        </div>
      </>}
    </div>
  );
}
