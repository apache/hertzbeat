/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Checkbox, Input, InputNumber, Modal, Select, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  activeNoticeReceiverDefinition,
  receiverTypeDefinitions,
  type FeiShuReceiveType,
  type NoticeReceiverDraft,
  type NoticeReceiverSecretKey,
  type NoticeReceiverType,
  type ReceiverFieldDefinition,
  type WebHookAuthType
} from '../model/notice-receiver-model';
import styles from './notice-receiver-editor.module.css';

function fieldIsVisible(field: ReceiverFieldDefinition, draft: NoticeReceiverDraft) {
  if (field.key === 'hookAuthToken') return draft.hookAuthType !== 'None';
  if (draft.type !== 14) return true;
  if (field.key === 'userId') return draft.larkReceiveType === 0;
  if (field.key === 'chatId') return draft.larkReceiveType === 1;
  if (field.key === 'partyId') return draft.larkReceiveType === 2;
  return true;
}

function ReceiverField({ definition, draft, update, setSecretCleared }: {
  definition: ReceiverFieldDefinition;
  draft: NoticeReceiverDraft;
  update: (patch: Partial<NoticeReceiverDraft>) => void;
  setSecretCleared: (key: NoticeReceiverSecretKey, cleared: boolean) => void;
}) {
  const { t } = useTranslation();
  if (!fieldIsVisible(definition, draft)) return null;
  const secretKey = definition.secret ? definition.key as NoticeReceiverSecretKey : null;
  const configured = secretKey ? draft.configuredSecrets.includes(secretKey) : false;
  const cleared = secretKey ? draft.clearSecrets.includes(secretKey) : false;
  return (
    <label className={styles.field}>
      {t(definition.labelKey)}
      <ReceiverControl definition={definition} draft={draft} update={update} configured={configured} cleared={cleared} />
      {secretKey && configured ? (
        <span className={styles.secretState}>
          <Typography.Text type="secondary">{t('noticeReceivers.secret.configured')}</Typography.Text>
          <Checkbox checked={cleared} onChange={event => setSecretCleared(secretKey, event.target.checked)}>
            {t('noticeReceivers.secret.clearSaved')}
          </Checkbox>
        </span>
      ) : null}
    </label>
  );
}

function ReceiverControl({ definition, draft, update, configured, cleared }: {
  definition: ReceiverFieldDefinition;
  draft: NoticeReceiverDraft;
  update: (patch: Partial<NoticeReceiverDraft>) => void;
  configured: boolean;
  cleared: boolean;
}) {
  const { t } = useTranslation();
  const value = draft[definition.key];
  if (definition.kind === 'webhookAuth') {
    return <Select value={draft.hookAuthType} options={['None', 'Basic', 'Bearer'].map(item => ({ value: item, label: item }))}
      onChange={(hookAuthType: WebHookAuthType) => update({ hookAuthType })} />;
  }
  if (definition.kind === 'larkReceiveType') {
    return <Select value={draft.larkReceiveType} options={[0, 1, 2, 3].map(item => ({
      value: item, label: t(`noticeReceivers.larkReceiveTypes.${item}`)
    }))} onChange={(larkReceiveType: FeiShuReceiveType) => update({ larkReceiveType })} />;
  }
  if (definition.kind === 'number') {
    return <InputNumber min={0} value={typeof value === 'number' ? value : null}
      onChange={agentId => update({ agentId })} />;
  }
  if (definition.secret) {
    return <Input.Password autoComplete="new-password" disabled={cleared} value={String(value ?? '')}
      placeholder={t(secretPlaceholderKey(configured, cleared))}
      onChange={event => update({ [definition.key]: event.target.value })} />;
  }
  return <Input type={definition.kind} value={String(value ?? '')}
    onChange={event => update({ [definition.key]: event.target.value })} />;
}

function secretPlaceholderKey(configured: boolean, cleared: boolean) {
  if (cleared) return 'noticeReceivers.secret.clearPending';
  return configured ? 'noticeReceivers.secret.retainHint' : 'noticeReceivers.secret.enterHint';
}

export function NoticeReceiverEditor({ draft, saving, testing, update, selectType, setSecretCleared, close, submit, test }: {
  draft: NoticeReceiverDraft;
  saving: boolean;
  testing: boolean;
  update: (patch: Partial<NoticeReceiverDraft>) => void;
  selectType: (type: NoticeReceiverType) => void;
  setSecretCleared: (key: NoticeReceiverSecretKey, cleared: boolean) => void;
  close: () => void;
  submit: () => void;
  test: () => void;
}) {
  const { t } = useTranslation();
  const definition = activeNoticeReceiverDefinition(draft.type);
  return (
    <Modal open width={760} maskClosable={false} title={t(draft.id ? 'noticeReceivers.edit' : 'noticeReceivers.new')}
      okText={t('common.save')} cancelText={t('common.cancel')} confirmLoading={saving} onCancel={close} onOk={submit}>
      <div className={styles.form}>
        <label className={`${styles.field} ${styles.wide}`}>
          {t('noticeReceivers.name')}
          <Input value={draft.name} onChange={event => update({ name: event.target.value })} />
        </label>
        <label className={`${styles.field} ${styles.wide}`}>
          {t('noticeReceivers.type')}
          <Select showSearch optionFilterProp="label" value={draft.type}
            options={receiverTypeDefinitions.map(item => ({ value: item.type, label: t(item.labelKey) }))}
            onChange={(type: NoticeReceiverType) => selectType(type)} />
        </label>
        {definition.fields.map(item => <ReceiverField key={item.key} definition={item} draft={draft}
          update={update} setSecretCleared={setSecretCleared} />)}
        <Button className={`${styles.test} ${styles.wide}`} loading={testing} onClick={test}>
          {t('noticeReceivers.test')}
        </Button>
      </div>
    </Modal>
  );
}
