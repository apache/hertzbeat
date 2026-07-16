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

import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, App, Button, Empty, Input, InputNumber, Select, Spin, Switch, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { loadAlertRule, previewAlertRule, saveAlertRule } from './alert-rule-api';
import {
  alertRuleDraftFromDetail,
  createAlertRuleDraft,
  validateAlertRuleDraft,
  type AlertRuleDataType,
  type AlertRuleDraft,
  type AlertRuleKind
} from './alert-rule-model';
import styles from './alert-rule-editor-page.module.css';

type DraftUpdate = (patch: Partial<AlertRuleDraft>) => void;

function AlertRuleFields({ draft, update, changeKind }: {
  draft: AlertRuleDraft;
  update: DraftUpdate;
  changeKind: (kind: AlertRuleKind) => void;
}) {
  const { t } = useTranslation();
  const kinds: AlertRuleKind[] = ['realtime', 'periodic'];
  const dataTypes: AlertRuleDataType[] = draft.kind === 'periodic' ? ['metric', 'log', 'trace'] : ['metric', 'log'];
  return (
    <div className={styles.form}>
      <label>
        {t('alertRules.name')}
        <Input value={draft.name} onChange={event => update({ name: event.target.value })} />
      </label>
      <label>
        {t('alertRules.kind.label')}
        <Select
          value={draft.kind}
          onChange={changeKind}
          options={kinds.map(value => ({ value, label: t(`alertRules.kind.${value}`) }))}
        />
      </label>
      <label>
        {t('alertRules.dataType.label')}
        <Select
          value={draft.dataType}
          onChange={dataType => update({ dataType })}
          options={dataTypes.map(value => ({ value, label: t(`alertRules.dataType.${value}`) }))}
        />
      </label>
      <label>
        {t('alertRules.enabled')}
        <Switch checked={draft.enable} onChange={enable => update({ enable })} />
      </label>
      <label className={styles.wide}>
        {t('alertRules.expression')}
        <Input.TextArea rows={5} value={draft.expr} onChange={event => update({ expr: event.target.value })} />
      </label>
      <label className={styles.wide}>
        {t('alertRules.template')}
        <Input.TextArea rows={3} value={draft.template} onChange={event => update({ template: event.target.value })} />
      </label>
      <label className={styles.wide}>
        {t('alertRules.labels')}
        <Input
          value={draft.labelsText}
          placeholder={t('alertRules.labelsPlaceholder')}
          onChange={event => update({ labelsText: event.target.value })}
        />
      </label>
      {draft.kind === 'periodic' && (
        <label>
          {t('alertRules.period')}
          <InputNumber min={10} value={draft.period} onChange={period => update({ period: period ?? 300 })} />
        </label>
      )}
      <label>
        {t('alertRules.times')}
        <InputNumber min={1} value={draft.times} onChange={times => update({ times: times ?? 3 })} />
      </label>
    </div>
  );
}

function PreviewResult({ pending, failed, count }: { pending: boolean; failed: boolean; count: number | undefined }) {
  const { t } = useTranslation();
  if (pending) return null;
  if (failed) return <Alert type="error" showIcon message={t('alertRules.previewFailed')} />;
  if (count == null) return null;
  return (
    <Alert
      type={count > 0 ? 'success' : 'warning'}
      showIcon
      message={t(count > 0 ? 'alertRules.previewSuccess' : 'alertRules.previewEmpty', { count })}
    />
  );
}

function EditorForm({ mode, initial }: { mode: 'new' | 'edit'; initial: AlertRuleDraft }) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(initial);
  const save = useMutation({
    mutationFn: () => saveAlertRule(mode, draft),
    onSuccess: () => {
      void message.success(t('alertRules.saveSuccess'));
      void navigate('/alerts/rules');
    },
    onError: () => void message.error(t('alertRules.saveFailed'))
  });
  const preview = useMutation({ mutationFn: () => previewAlertRule(draft) });
  const update: DraftUpdate = patch => setDraft(current => ({ ...current, ...patch }));
  const changeKind = (kind: AlertRuleKind) => update({
    kind,
    dataType: kind === 'realtime' && draft.dataType === 'trace' ? 'metric' : draft.dataType
  });
  const submit = () => {
    if (validateAlertRuleDraft(draft).length > 0) {
      void message.warning(t('alertRules.validation'));
      return;
    }
    save.mutate();
  };
  const runPreview = () => {
    if (!draft.expr.trim()) {
      void message.warning(t('alertRules.expressionRequired'));
      return;
    }
    preview.mutate();
  };

  return (
    <>
      <AlertRuleFields draft={draft} update={update} changeKind={changeKind} />
      <PreviewResult pending={preview.isPending} failed={preview.isError} count={preview.data?.length} />
      <div className={styles.actions}>
        <Button onClick={() => void navigate('/alerts/rules')}>{t('common.cancel')}</Button>
        <Button loading={preview.isPending} onClick={runPreview}>{t('alertRules.preview')}</Button>
        <Button type="primary" loading={save.isPending} onClick={submit}>{t('common.save')}</Button>
      </div>
    </>
  );
}

export function AlertRuleEditorPage({ mode }: { mode: 'new' | 'edit' }) {
  const { t } = useTranslation();
  const { ruleId = '' } = useParams();
  const detail = useQuery({
    queryKey: ['alert-rule', ruleId],
    queryFn: () => loadAlertRule(ruleId),
    enabled: mode === 'edit' && Boolean(ruleId)
  });
  if (detail.isError) return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (mode === 'edit' && detail.isPending) return <Spin />;
  if (mode === 'edit' && !detail.data) return <Empty description={t('alertRules.empty')} />;

  const initial = detail.data ? alertRuleDraftFromDetail(detail.data) : createAlertRuleDraft();
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <Typography.Title level={2}>{t(mode === 'new' ? 'alertRules.new' : 'alertRules.edit')}</Typography.Title>
        <Typography.Text type="secondary">{t('alertRules.editorDescription')}</Typography.Text>
      </header>
      <EditorForm key={`${mode}:${ruleId}`} mode={mode} initial={initial} />
    </div>
  );
}
