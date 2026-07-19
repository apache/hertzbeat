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
import { useTranslation } from 'react-i18next';

import type { AlertSilenceDraft } from './alert-silence-model';
import styles from './alert-silence-editor.module.css';
import { AlertSilenceScheduleFields } from './alert-silence-schedule-fields';

interface AlertSilenceEditorProps {
  draft: AlertSilenceDraft;
  saving: boolean;
  update: (patch: Partial<AlertSilenceDraft>) => void;
  replace: (draft: AlertSilenceDraft) => void;
  close: () => void;
  submit: () => void;
}

export function AlertSilenceEditor(props: AlertSilenceEditorProps) {
  const { draft, saving, update, replace, close, submit } = props;
  const { t } = useTranslation();
  return (
    <Modal
      open
      width={680}
      maskClosable={false}
      title={t(draft.id ? 'alertSilences.edit' : 'alertSilences.new')}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      cancelButtonProps={{ disabled: saving }}
      keyboard={!saving}
      onCancel={close}
      onOk={submit}
    >
      <div className={styles.form}>
        <label className={`${styles.field} ${styles.wide}`}>
          {t('alertSilences.name')}
          <Input disabled={saving} value={draft.name} onChange={event => update({ name: event.target.value })} />
        </label>
        <label className={styles.field}>
          {t('alertSilences.matchAll')}
          <Switch disabled={saving} checked={draft.matchAll} onChange={matchAll => update({ matchAll })} />
        </label>
        <label className={styles.field}>
          {t('alertSilences.enabled')}
          <Switch disabled={saving} checked={draft.enable} onChange={enable => update({ enable })} />
        </label>
        {!draft.matchAll && (
          <label className={`${styles.field} ${styles.wide}`}>
            {t('alertSilences.labels')}
            <Input.TextArea
              rows={2}
              disabled={saving}
              value={draft.labelsText}
              placeholder={t('alertSilences.matcherPlaceholder')}
              onChange={event => update({ labelsText: event.target.value })}
            />
            <span className={styles.hint}>{t('alertSilences.labelsHelp')}</span>
          </label>
        )}
        <AlertSilenceScheduleFields disabled={saving} draft={draft} update={update} replace={replace} />
      </div>
    </Modal>
  );
}
