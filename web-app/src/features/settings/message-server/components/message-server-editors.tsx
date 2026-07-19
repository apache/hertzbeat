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

import { Checkbox, Input, Modal, Select, Switch, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  activeSmsProviderValues,
  selectSmsProvider,
  setSmsSecretCleared,
  smsProviderDefinition,
  smsProviderDefinitions,
  updateSmsProviderField,
  type SmsProviderType,
  type SmsServerDraft
} from '../model/message-server-model';
import type { MessageServerEditorRecovery } from './message-server-editor-recovery';
import styles from './message-server-editors.module.css';
import { MessageServerSaveRecovery } from './message-server-save-recovery';

export { EmailServerEditor } from './email-server-editor';

type SmsProviderField = ReturnType<typeof smsProviderDefinition>['fields'][number];

function SmsProviderFields({
  draft,
  disabled,
  replace
}: {
  draft: SmsServerDraft;
  disabled: boolean;
  replace: (draft: SmsServerDraft) => void;
}) {
  const definition = smsProviderDefinition(draft.type);
  return definition.fields.map(field => {
    if (draft.type === 'unisms' && field.key === 'accessKeySecret' && draft.unisms.authMode !== 'hmac') return null;
    return <SmsProviderFieldEditor key={field.key} draft={draft} disabled={disabled} field={field} replace={replace} />;
  });
}

function SmsProviderFieldEditor({
  draft,
  disabled,
  field,
  replace
}: {
  draft: SmsServerDraft;
  disabled: boolean;
  field: SmsProviderField;
  replace: (draft: SmsServerDraft) => void;
}) {
  const { t } = useTranslation();
  const value = activeSmsProviderValues(draft)[field.key];
  const configured = field.secret && draft.configuredSecrets.includes(field.key);
  const cleared = field.secret && draft.clearSecrets.includes(field.key);
  return (
    <div className={styles.field}>
      <label>
        {t(field.labelKey)}
        <SmsProviderInput
          disabled={disabled}
          field={field}
          value={value}
          placeholder={smsSecretPlaceholder(configured, cleared, t)}
          change={next => replace(updateSmsProviderField(draft, field.key, next))}
        />
      </label>
      {configured && (
        <div className={styles.secretControls}>
          <Typography.Text type="secondary">{t('messageServer.secret.configured')}</Typography.Text>
          <Checkbox
            disabled={disabled}
            checked={cleared}
            onChange={event => replace(setSmsSecretCleared(draft, field.key, event.target.checked))}
          >
            {t('messageServer.secret.clearSaved')}
          </Checkbox>
        </div>
      )}
    </div>
  );
}

function SmsProviderInput({
  disabled,
  field,
  value,
  placeholder,
  change
}: {
  disabled: boolean;
  field: SmsProviderField;
  value: string | undefined;
  placeholder: string;
  change: (value: string) => void;
}) {
  const { t } = useTranslation();
  if (field.kind === 'authMode') {
    return (
      <Select<string>
        aria-label={t(field.labelKey)}
        disabled={disabled}
        value={value ?? 'simple'}
        options={[
          { value: 'simple', label: t('messageServer.sms.authModes.simple') },
          { value: 'hmac', label: t('messageServer.sms.authModes.hmac') }
        ]}
        onChange={change}
      />
    );
  }
  if (field.secret) {
    return (
      <Input.Password
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        onChange={event => change(event.target.value)}
      />
    );
  }
  return <Input disabled={disabled} value={value} onChange={event => change(event.target.value)} />;
}

function smsSecretPlaceholder(configured: boolean, cleared: boolean, t: (key: string) => string) {
  if (cleared) return t('messageServer.secret.clearPending');
  if (configured) return t('messageServer.secret.retainHint');
  return t('messageServer.secret.enterHint');
}

export function SmsServerEditor({
  draft,
  saving,
  locked,
  recovery,
  replace,
  close,
  submit
}: {
  draft: SmsServerDraft;
  saving: boolean;
  locked?: boolean;
  recovery?: MessageServerEditorRecovery | null;
  replace: (draft: SmsServerDraft) => void;
  close: () => void;
  submit: () => void;
}) {
  const { t } = useTranslation();
  const editorLocked = locked ?? saving;
  return (
    <Modal
      open
      width={720}
      maskClosable={false}
      closable={!editorLocked}
      keyboard={!editorLocked}
      title={t('messageServer.sms.edit')}
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
      <div className={styles.form}>
        <label className={`${styles.field} ${styles.wide}`}>
          {t('messageServer.sms.provider')}
          <Select
            aria-label={t('messageServer.sms.provider')}
            disabled={editorLocked}
            value={draft.type}
            options={smsProviderDefinitions.map(item => ({ value: item.type, label: t(item.labelKey) }))}
            onChange={(type: SmsProviderType) => replace(selectSmsProvider(draft, type))}
          />
        </label>
        <SmsProviderFields draft={draft} disabled={editorLocked} replace={replace} />
        <label className={`${styles.switchField} ${styles.wide}`}>
          <span>{t('messageServer.enabled')}</span>
          <Switch disabled={editorLocked} checked={draft.enable} onChange={enable => replace({ ...draft, enable })} />
        </label>
      </div>
    </Modal>
  );
}
