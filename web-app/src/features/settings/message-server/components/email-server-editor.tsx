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
import styles from './message-server-editors.module.css';

type EmailDraftUpdate = (patch: Partial<EmailServerDraft>) => void;

type EmailServerEditorProps = {
  draft: EmailServerDraft;
  saving: boolean;
  update: EmailDraftUpdate;
  setSecretCleared: (cleared: boolean) => void;
  close: () => void;
  submit: () => void;
};

function EmailConnectionFields({ draft, update }: { draft: EmailServerDraft; update: EmailDraftUpdate }) {
  const { t } = useTranslation();
  return (
    <>
      <label className={styles.field}>
        {t('messageServer.email.host')}
        <Input value={draft.emailHost} onChange={event => update({ emailHost: event.target.value })} />
      </label>
      <label className={styles.field}>
        {t('messageServer.email.port')}
        <InputNumber
          min={1}
          max={65_535}
          value={draft.emailPort}
          onChange={emailPort => update({ emailPort: emailPort ?? 0 })}
        />
      </label>
      <label className={styles.field}>
        {t('messageServer.email.username')}
        <Input
          type="email"
          value={draft.emailUsername}
          onChange={event => update({ emailUsername: event.target.value })}
        />
      </label>
    </>
  );
}

function ConfiguredEmailSecret({ cleared, setCleared }: { cleared: boolean; setCleared: (cleared: boolean) => void }) {
  const { t } = useTranslation();
  return (
    <div className={styles.secretControls}>
      <Typography.Text type="secondary">{t('messageServer.secret.configured')}</Typography.Text>
      <Checkbox checked={cleared} onChange={event => setCleared(event.target.checked)}>
        {t('messageServer.secret.clearSaved')}
      </Checkbox>
    </div>
  );
}

function EmailSecretField({
  draft,
  update,
  setSecretCleared
}: {
  draft: EmailServerDraft;
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
          placeholder={placeholder}
          onChange={event => update({ emailPassword: event.target.value })}
        />
      </label>
      {configured && <ConfiguredEmailSecret cleared={cleared} setCleared={setSecretCleared} />}
    </>
  );
}

function EmailDeliveryOptions({ draft, update }: { draft: EmailServerDraft; update: EmailDraftUpdate }) {
  const { t } = useTranslation();
  return (
    <>
      <label className={styles.switchField}>
        <span>{t('messageServer.email.ssl')}</span>
        <Switch checked={draft.emailSsl} onChange={emailSsl => update({ emailSsl })} />
      </label>
      <label className={styles.switchField}>
        <span>{t('messageServer.email.starttls')}</span>
        <Switch checked={draft.emailStarttls} onChange={emailStarttls => update({ emailStarttls })} />
      </label>
      <label className={styles.switchField}>
        <span>{t('messageServer.enabled')}</span>
        <Switch checked={draft.enable} onChange={enable => update({ enable })} />
      </label>
    </>
  );
}

function EmailServerFields({
  draft,
  update,
  setSecretCleared
}: Pick<EmailServerEditorProps, 'draft' | 'update' | 'setSecretCleared'>) {
  return (
    <div className={styles.form}>
      <EmailConnectionFields draft={draft} update={update} />
      <EmailSecretField draft={draft} update={update} setSecretCleared={setSecretCleared} />
      <EmailDeliveryOptions draft={draft} update={update} />
    </div>
  );
}

export function EmailServerEditor({ draft, saving, update, setSecretCleared, close, submit }: EmailServerEditorProps) {
  const { t } = useTranslation();
  return (
    <Modal
      open
      width={700}
      maskClosable={false}
      title={t('messageServer.email.edit')}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      onCancel={close}
      onOk={submit}
    >
      <EmailServerFields draft={draft} update={update} setSecretCleared={setSecretCleared} />
    </Modal>
  );
}
