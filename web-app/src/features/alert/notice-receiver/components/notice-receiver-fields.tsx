/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Checkbox, Input, InputNumber, Select, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  noticeReceiverLarkReceiveTypes,
  noticeReceiverAgentIdMax,
  noticeReceiverWebhookAuthTypes,
  type FeiShuReceiveType,
  type NoticeReceiverDraft,
  type NoticeReceiverSecretKey,
  type ReceiverFieldDefinition,
  type WebHookAuthType
} from '../model/notice-receiver-model';
import styles from './notice-receiver-editor.module.css';

export function NoticeReceiverField({
  definition,
  draft,
  busy,
  update,
  setSecretCleared
}: {
  definition: ReceiverFieldDefinition;
  draft: NoticeReceiverDraft;
  busy: boolean;
  update: (patch: Partial<NoticeReceiverDraft>) => void;
  setSecretCleared: (key: NoticeReceiverSecretKey, cleared: boolean) => void;
}) {
  const { t } = useTranslation();
  if (!fieldIsVisible(definition, draft)) return null;
  const secretKey = definition.secret ? (definition.key as NoticeReceiverSecretKey) : null;
  const configured = secretKey ? draft.configuredSecrets.includes(secretKey) : false;
  const cleared = secretKey ? draft.clearSecrets.includes(secretKey) : false;
  return (
    <label className={styles.field}>
      {t(definition.labelKey)}
      <ReceiverControl
        definition={definition}
        draft={draft}
        busy={busy}
        update={update}
        configured={configured}
        cleared={cleared}
      />
      {secretKey && configured ? (
        <span className={styles.secretState}>
          <Typography.Text type="secondary">{t('noticeReceivers.secret.configured')}</Typography.Text>
          <Checkbox
            checked={cleared}
            disabled={busy}
            onChange={event => setSecretCleared(secretKey, event.target.checked)}
          >
            {t('noticeReceivers.secret.clearSaved')}
          </Checkbox>
        </span>
      ) : null}
    </label>
  );
}

type ReceiverControlProps = {
  definition: ReceiverFieldDefinition;
  draft: NoticeReceiverDraft;
  busy: boolean;
  update: (patch: Partial<NoticeReceiverDraft>) => void;
  configured: boolean;
  cleared: boolean;
};

function ReceiverControl(props: ReceiverControlProps) {
  const { definition } = props;
  if (definition.kind === 'webhookAuth') return <WebhookAuthControl {...props} />;
  if (definition.kind === 'larkReceiveType') return <LarkReceiveTypeControl {...props} />;
  if (definition.kind === 'number') return <NumberReceiverControl {...props} />;
  if (definition.secret) return <SecretReceiverControl {...props} />;
  return (
    <Input
      type={definition.kind}
      disabled={props.busy}
      value={String(props.draft[definition.key] ?? '')}
      onChange={event => props.update({ [definition.key]: event.target.value })}
    />
  );
}

function WebhookAuthControl({ draft, busy, update }: ReceiverControlProps) {
  return (
    <Select
      value={draft.hookAuthType}
      disabled={busy}
      options={noticeReceiverWebhookAuthTypes.map(item => ({ value: item, label: item }))}
      onChange={(hookAuthType: WebHookAuthType) => update({ hookAuthType })}
    />
  );
}

function LarkReceiveTypeControl({ draft, busy, update }: ReceiverControlProps) {
  const { t } = useTranslation();
  return (
    <Select
      value={draft.larkReceiveType}
      disabled={busy}
      options={noticeReceiverLarkReceiveTypes.map(item => ({
        value: item,
        label: t(`noticeReceivers.larkReceiveTypes.${item}`)
      }))}
      onChange={(larkReceiveType: FeiShuReceiveType) => update({ larkReceiveType })}
    />
  );
}

function NumberReceiverControl({ draft, busy, update }: ReceiverControlProps) {
  return (
    <InputNumber
      min={0}
      max={noticeReceiverAgentIdMax}
      disabled={busy}
      value={draft.agentId}
      onChange={agentId => update({ agentId })}
    />
  );
}

function SecretReceiverControl({ definition, draft, busy, update, configured, cleared }: ReceiverControlProps) {
  const { t } = useTranslation();
  return (
    <Input.Password
      autoComplete="new-password"
      disabled={busy || cleared}
      value={String(draft[definition.key] ?? '')}
      placeholder={t(secretPlaceholderKey(configured, cleared))}
      onChange={event => update({ [definition.key]: event.target.value })}
    />
  );
}

function fieldIsVisible(field: ReceiverFieldDefinition, draft: NoticeReceiverDraft) {
  if (field.key === 'hookAuthToken') return draft.hookAuthType !== 'None';
  if (draft.type !== 14) return true;
  if (field.key === 'userId') return draft.larkReceiveType === 0;
  if (field.key === 'chatId') return draft.larkReceiveType === 1;
  if (field.key === 'partyId') return draft.larkReceiveType === 2;
  return true;
}

function secretPlaceholderKey(configured: boolean, cleared: boolean) {
  if (cleared) return 'noticeReceivers.secret.clearPending';
  return configured ? 'noticeReceivers.secret.retainHint' : 'noticeReceivers.secret.enterHint';
}
