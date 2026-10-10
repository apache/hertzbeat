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

import { Checkbox, Input, InputNumber, Modal, Switch, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { EmailServerDraft } from '../model/message-server-model';
import type { MessageServerEditorRecovery } from './message-server-editor-recovery';
import styles from './message-server-editors.module.css';
import { MessageServerSaveRecovery } from './message-server-save-recovery';

type EmailDraftUpdate = (patch: Partial<EmailServerDraft>) => void;

type EmailServerEditorProps = {
  draft: EmailServerDraft;
  saving: boolean;
  locked?: boolean;
  recovery?: MessageServerEditorRecovery | null;
  update: EmailDraftUpdate;
  setSecretCleared: (cleared: boolean) => void;
  close: () => void;
  submit: () => void;
};

function EmailConnectionFields({
  draft,
  disabled,
  update
}: {
  draft: EmailServerDraft;
  disabled: boolean;
  update: EmailDraftUpdate;
}) {
  const { t } = useTranslation();
  return (
    <>
      <label className={styles.field}>
        {t('messageServer.email.host')}
        <Input
          disabled={disabled}
          value={draft.emailHost}
          onChange={event => update({ emailHost: event.target.value })}
        />
      </label>
      <label className={styles.field}>
        {t('messageServer.email.port')}
        <InputNumber
          min={1}
          max={65_535}
          disabled={disabled}
          value={draft.emailPort}
          onChange={emailPort => update({ emailPort: emailPort ?? 0 })}
        />
      </label>
      <label className={styles.field}>
        {t('messageServer.email.username')}
        <Input
          type="email"
          disabled={disabled}
          value={draft.emailUsername}
          onChange={event => update({ emailUsername: event.target.value })}
        />
      </label>
    </>
  );
}

function ConfiguredEmailSecret({
  cleared,
  disabled,
  setCleared
}: {
  cleared: boolean;
  disabled: boolean;
  setCleared: (cleared: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.secretControls}>
      <Typography.Text type="secondary">{t('messageServer.secret.configured')}</Typography.Text>
      <Checkbox disabled={disabled} checked={cleared} onChange={event => setCleared(event.target.checked)}>
        {t('messageServer.secret.clearSaved')}
      </Checkbox>
    </div>
  );
}

function EmailSecretField({
  draft,
  disabled,
  update,
  setSecretCleared
}: {
  draft: EmailServerDraft;
  disabled: boolean;
  update: EmailDraftUpdate;
  setSecretCleared: (cleared: boolean) => void;
}) {
  const { t } = useTranslation();
  const configured = draft.configuredSecrets.includes('emailPassword');
  const cleared = draft.clearSecrets.includes('emailPassword');
  let placeholder = t('messageServer.secret.enterHint');
  if (configured) placeholder = t('messageServer.secret.retainHint');
  if (cleared) placeholder = t('messageServer.secret.clearPending');

  return (
    <>
      <label className={styles.field}>
        {t('messageServer.email.password')}
        <Input.Password
          // Configured secret metadata never becomes the value of this replacement-only input.
          value={draft.emailPassword}
          disabled={disabled}
          placeholder={placeholder}
          onChange={event => update({ emailPassword: event.target.value })}
        />
      </label>
      {configured && <ConfiguredEmailSecret cleared={cleared} disabled={disabled} setCleared={setSecretCleared} />}
    </>
  );
}

function EmailDeliveryOptions({
  draft,
  disabled,
  update
}: {
  draft: EmailServerDraft;
  disabled: boolean;
  update: EmailDraftUpdate;
}) {
  const { t } = useTranslation();
  return (
    <>
      <label className={styles.switchField}>
        <span>{t('messageServer.email.ssl')}</span>
        <Switch disabled={disabled} checked={draft.emailSsl} onChange={emailSsl => update({ emailSsl })} />
      </label>
      <label className={styles.switchField}>
        <span>{t('messageServer.email.starttls')}</span>
        <Switch
          disabled={disabled}
          checked={draft.emailStarttls}
          onChange={emailStarttls => update({ emailStarttls })}
        />
      </label>
      <label className={styles.switchField}>
        <span>{t('messageServer.enabled')}</span>
        <Switch disabled={disabled} checked={draft.enable} onChange={enable => update({ enable })} />
      </label>
    </>
  );
}

function EmailServerFields({
  draft,
  disabled,
  update,
  setSecretCleared
}: Pick<EmailServerEditorProps, 'draft' | 'update' | 'setSecretCleared'> & { disabled: boolean }) {
  return (
    <div className={styles.form}>
      <EmailConnectionFields draft={draft} disabled={disabled} update={update} />
      <EmailSecretField draft={draft} disabled={disabled} update={update} setSecretCleared={setSecretCleared} />
      <EmailDeliveryOptions draft={draft} disabled={disabled} update={update} />
    </div>
  );
}

export function EmailServerEditor({
  draft,
  saving,
  locked,
  recovery,
  update,
  setSecretCleared,
  close,
  submit
}: EmailServerEditorProps) {
  const { t } = useTranslation();
  const editorLocked = locked ?? saving;
  return (
    <Modal
      open
      width={700}
      maskClosable={false}
      closable={!editorLocked}
      keyboard={!editorLocked}
      title={t('messageServer.email.edit')}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      cancelButtonProps={{ disabled: editorLocked }}
      okButtonProps={{ disabled: editorLocked }}
      onCancel={() => {
        if (!editorLocked) close();
      }}
      onOk={() => {
        if (!editorLocked) submit();
      }}
    >
      {recovery && !saving && <MessageServerSaveRecovery recovery={recovery} />}
      <EmailServerFields draft={draft} disabled={editorLocked} update={update} setSecretCleared={setSecretCleared} />
    </Modal>
  );
}
