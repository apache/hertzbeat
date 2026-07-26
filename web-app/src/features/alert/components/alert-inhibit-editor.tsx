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

import type { AlertInhibitDraft } from '../model/alert-inhibit-model';
import styles from '../shared/alert-policy-page.module.css';
import type { AlertInhibitFailure } from '../model/alert-inhibit-model';
import type { AlertInhibitPrefillState, AlertInhibitRecovery as RecoveryState } from '../model/alert-inhibit-state';
import { AlertInhibitRecovery } from './alert-inhibit-recovery';

type AlertInhibitEditorProps = {
  draft: AlertInhibitDraft;
  busy: boolean;
  saving: boolean;
  failure: AlertInhibitFailure | undefined;
  prefill: AlertInhibitPrefillState;
  recovery: RecoveryState | undefined;
  retrying: boolean;
  labelKeys: string[];
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

function AlertInhibitFields({
  draft,
  busy,
  labelKeys,
  update
}: Pick<AlertInhibitEditorProps, 'draft' | 'busy' | 'labelKeys' | 'update'>) {
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
          options={labelKeys.map(value => ({ value, label: value }))}
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

function AlertInhibitPrefillEvidence({ state }: { state: AlertInhibitPrefillState }) {
  const { t } = useTranslation();
  if (state === 'idle' || state === 'loading') return null;
  return <Alert type={prefillAlertType(state)} showIcon message={t(`alertInhibits.entityPrefill.${state}`)} />;
}

function prefillAlertType(state: Exclude<AlertInhibitPrefillState, 'idle' | 'loading'>) {
  if (state === 'received') return 'success';
  if (state === 'manual') return 'info';
  return state === 'unavailable' ? 'warning' : 'error';
}

export function AlertInhibitEditor({
  draft,
  busy,
  saving,
  failure,
  prefill,
  recovery,
  retrying,
  labelKeys,
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
      {!draft.id && <AlertInhibitPrefillEvidence state={prefill} />}
      {recovery ? (
        <AlertInhibitRecovery recovery={recovery} retrying={retrying} retry={retry} />
      ) : failure ? (
        <Alert
          type="error"
          showIcon
          message={failure === 'unavailable' ? t('common.unavailable') : t('alertInhibits.saveFailed')}
        />
      ) : null}
      <AlertInhibitFields draft={draft} busy={busy} labelKeys={labelKeys} update={update} />
    </Modal>
  );
}
