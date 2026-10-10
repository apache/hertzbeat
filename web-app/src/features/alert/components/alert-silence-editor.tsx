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

import { Input, Modal, Switch } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { AlertLabelSuggestionState } from '../model/alert-label-suggestion-model';
import { validateAlertSilenceDraft, type AlertSilenceDraft } from '../model/alert-silence-model';
import type { AlertSilenceRecovery as RecoveryState } from '../model/alert-silence-page-model';
import styles from '../shared/alert-silence-editor.module.css';
import { AlertLabelMatcherEditor } from './alert-label-matcher-editor';
import { AlertSilenceFieldRow } from './alert-silence-field-row';
import { AlertSilenceScheduleFields } from './alert-silence-schedule-fields';
import { AlertSilenceRecovery } from './alert-silence-recovery';

interface AlertSilenceEditorProps {
  draft: AlertSilenceDraft;
  recovery: RecoveryState | null;
  labelSuggestions: AlertLabelSuggestionState;
  saving: boolean;
  writeLocked: boolean;
  update: (patch: Partial<AlertSilenceDraft>) => void;
  replace: (draft: AlertSilenceDraft) => void;
  close: () => void;
  retry: () => unknown;
  submit: () => void;
}

export function AlertSilenceEditor(props: AlertSilenceEditorProps) {
  const { draft, recovery, labelSuggestions, saving, writeLocked, update, replace, close, retry, submit } = props;
  const { t } = useTranslation();
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const invalidFields = submitAttempted ? validateAlertSilenceDraft(draft) : [];
  const submitDraft = () => {
    if (writeLocked) return;
    setSubmitAttempted(true);
    if (validateAlertSilenceDraft(draft).length === 0) submit();
  };
  return (
    <Modal
      open
      width="40%"
      rootClassName={styles.modal ?? ''}
      closable={!saving}
      maskClosable={false}
      title={t(draft.id ? 'alertSilences.edit' : 'alertSilences.createTitle')}
      okText={t('common.confirm')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      cancelButtonProps={{ disabled: saving }}
      okButtonProps={{ disabled: writeLocked }}
      keyboard={!saving}
      onCancel={close}
      onOk={submitDraft}
    >
      <AlertSilenceRecovery busy={saving} recovery={recovery} retry={retry} />
      <div className={styles.form}>
        <AlertSilenceFieldRow invalid={invalidFields.includes('name')} label={t('alertSilences.name')} required>
          <Input
            aria-label={t('alertSilences.name')}
            aria-invalid={invalidFields.includes('name')}
            disabled={writeLocked}
            {...(invalidFields.includes('name') ? { status: 'error' as const } : {})}
            value={draft.name}
            onChange={event => update({ name: event.target.value })}
          />
        </AlertSilenceFieldRow>
        <AlertSilenceFieldRow label={t('alertSilences.matchAll')} required>
          <Switch
            aria-label={t('alertSilences.matchAll')}
            disabled={writeLocked}
            checked={draft.matchAll}
            onChange={matchAll => update({ matchAll })}
          />
        </AlertSilenceFieldRow>
        {!draft.matchAll && (
          <AlertSilenceFieldRow invalid={invalidFields.includes('labels')} label={t('alertSilences.labels')} required>
            <AlertLabelMatcherEditor
              disabled={writeLocked}
              invalid={invalidFields.includes('labels')}
              suggestions={labelSuggestions}
              translationRoot="alertSilences"
              value={draft.labelsText}
              change={labelsText => update({ labelsText })}
            />
          </AlertSilenceFieldRow>
        )}
        <AlertSilenceScheduleFields
          disabled={writeLocked}
          draft={draft}
          invalidFields={invalidFields}
          update={update}
          replace={replace}
        />
        <AlertSilenceFieldRow label={t('alertSilences.enabled')} required>
          <Switch
            aria-label={t('alertSilences.enabled')}
            disabled={writeLocked}
            checked={draft.enable}
            onChange={enable => update({ enable })}
          />
        </AlertSilenceFieldRow>
      </div>
    </Modal>
  );
}
