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

import { Alert, Input, Modal, Select, Switch } from 'antd';
import { useTranslation } from 'react-i18next';

import type { AlertInhibitDraft } from '../alert-inhibit-model';
import styles from '../alert-policy-page.module.css';
import type { AlertInhibitFailure } from '../controller/use-alert-inhibit-controller';
import type { AlertInhibitRecovery as RecoveryState } from '../controller/use-alert-inhibit-operation-controller';
import { AlertInhibitRecovery } from './alert-inhibit-recovery';

const COMMON_LABELS = ['alertname', 'instance', 'job', 'severity', 'service', 'host', 'env'];

type AlertInhibitEditorProps = {
  draft: AlertInhibitDraft;
  busy: boolean;
  saving: boolean;
  failure: AlertInhibitFailure | undefined;
  recovery: RecoveryState | undefined;
  retrying: boolean;
  update: (patch: Partial<AlertInhibitDraft>) => void;
  close: () => void;
  submit: () => unknown;
  retry: () => unknown;
};

type MatcherFieldProps = {
  disabled: boolean;
  label: string;
  help: string;
  value: string;
  update: (value: string) => void;
};

function MatcherField({ disabled, label, help, value, update }: MatcherFieldProps) {
  const { t } = useTranslation();
  return (
    <label className={styles.wide}>
      {label}
      <Input.TextArea
        disabled={disabled}
        rows={2}
        value={value}
        placeholder={t('alertInhibits.matcherPlaceholder')}
        onChange={event => update(event.target.value)}
      />
      <span className={styles.hint}>{help}</span>
    </label>
  );
}

function AlertInhibitFields({ draft, busy, update }: Pick<AlertInhibitEditorProps, 'draft' | 'busy' | 'update'>) {
  const { t } = useTranslation();
  return (
    <div className={styles.form}>
      <label className={styles.wide}>
        {t('alertInhibits.name')}
        <Input disabled={busy} value={draft.name} onChange={event => update({ name: event.target.value })} />
      </label>
      <MatcherField
        disabled={busy}
        label={t('alertInhibits.sourceLabels')}
        help={t('alertInhibits.sourceHelp')}
        value={draft.sourceLabelsText}
        update={value => update({ sourceLabelsText: value })}
      />
      <MatcherField
        disabled={busy}
        label={t('alertInhibits.targetLabels')}
        help={t('alertInhibits.targetHelp')}
        value={draft.targetLabelsText}
        update={value => update({ targetLabelsText: value })}
      />
      <label className={styles.wide}>
        {t('alertInhibits.equalLabels')}
        <Select
          disabled={busy}
          mode="tags"
          maxCount={10}
          value={draft.equalLabels}
          tokenSeparators={[',']}
          options={COMMON_LABELS.map(value => ({ value, label: value }))}
          onChange={equalLabels => update({ equalLabels })}
        />
        <span className={styles.hint}>{t('alertInhibits.equalHelp')}</span>
      </label>
      <label>
        {t('alertInhibits.enabled')}
        <Switch checked={draft.enable} disabled={busy} onChange={enable => update({ enable })} />
      </label>
    </div>
  );
}

export function AlertInhibitEditor({
  draft,
  busy,
  saving,
  failure,
  recovery,
  retrying,
  update,
  close,
  submit,
  retry
}: AlertInhibitEditorProps) {
  const { t } = useTranslation();
  return (
    <Modal
      open
      maskClosable={false}
      title={t(draft.id ? 'alertInhibits.edit' : 'alertInhibits.new')}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      closable={!busy}
      keyboard={!busy}
      cancelButtonProps={{ disabled: busy }}
      okButtonProps={{ disabled: busy }}
      onCancel={() => {
        if (!busy) close();
      }}
      onOk={() => {
        if (!busy) void submit();
      }}
    >
      {recovery ? (
        <AlertInhibitRecovery recovery={recovery} retrying={retrying} retry={retry} />
      ) : failure ? (
        <Alert
          type="error"
          showIcon
          message={failure === 'unavailable' ? t('common.unavailable') : t('alertInhibits.saveFailed')}
        />
      ) : null}
      <AlertInhibitFields draft={draft} busy={busy} update={update} />
    </Modal>
  );
}
