'use client';

import React from 'react';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import {
  AlertAuthoringRequiredMark
} from './alert-authoring-primitives';
import { getNoticeReceiverVisibleFieldKeys, isNoticeReceiverFieldRequired, getAlertNoticeProductCopy } from '../../lib/alert-notice/view-model';
import type { NoticeReceiverDraft } from '../../lib/alert-notice/controller';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;
type ReceiverFieldKey = Exclude<keyof NoticeReceiverDraft, 'id' | 'name' | 'type'>;

const NOTICE_RECEIVER_TYPE_OPTIONS = [
  { value: '0', labelKey: 'alert.notice.type.sms' },
  { value: '1', labelKey: 'alert.notice.type.email' },
  { value: '2', labelKey: 'alert.notice.type.url' },
  { value: '3', labelKey: 'alert.notice.type.wechat' },
  { value: '4', labelKey: 'alert.notice.type.WeCom-robot' },
  { value: '5', labelKey: 'alert.notice.type.ding' },
  { value: '6', labelKey: 'alert.notice.type.fei-shu' },
  { value: '7', labelKey: 'alert.notice.type.telegram-bot' },
  { value: '8', labelKey: 'alert.notice.type.slack' },
  { value: '9', labelKey: 'alert.notice.type.discord' },
  { value: '10', labelKey: 'alert.notice.type.WeComApp' },
  { value: '11', labelKey: 'alert.notice.type.smn' },
  { value: '12', labelKey: 'alert.notice.type.serverchan' },
  { value: '13', labelKey: 'alert.notice.type.gotify' },
  { value: '14', labelKey: 'alert.notice.type.lark-app' }
] as const;

const NOTICE_RECEIVER_WEBHOOK_AUTH_OPTIONS = [
  { value: 'None', label: 'None' },
  { value: 'Basic', label: 'Basic' },
  { value: 'Bearer', label: 'Bearer' }
] as const;

const NOTICE_RECEIVER_LARK_RECEIVE_TYPE_OPTIONS = [
  { value: '0', labelKey: 'alert.notice.type.lark-app-larkReceiveType.user' },
  { value: '1', labelKey: 'alert.notice.type.lark-app-larkReceiveType.chat' },
  { value: '2', labelKey: 'alert.notice.type.lark-app-larkReceiveType.party' },
  { value: '3', labelKey: 'alert.notice.type.lark-app-larkReceiveType.all' }
] as const;

function ReceiverFieldRow({
  label,
  required,
  children,
  row
}: {
  label: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  row: string;
}) {
  return (
    <div
      data-alert-notice-receiver-form-row={row}
      className="grid grid-cols-[132px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 text-sm text-[var(--ops-text-secondary)]"
    >
      <div className="text-[13px] font-semibold text-[#a9b0bb]">
        {label}
        {required ? <AlertAuthoringRequiredMark /> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function getReceiverFieldLabelKey(draft: NoticeReceiverDraft, field: ReceiverFieldKey) {
  switch (field) {
    case 'phone':
      return 'alert.notice.type.phone';
    case 'email':
      return 'alert.notice.type.email';
    case 'hookUrl':
      return 'alert.notice.type.url';
    case 'hookAuthType':
      return 'alert.notice.type.webhook-auth-type';
    case 'hookAuthToken':
      return 'alert.notice.type.webhook-auth-token';
    case 'wechatId':
      return draft.type === '4' ? 'alert.notice.type.WeCom-robot-key' : 'alert.notice.type.wechat-id';
    case 'accessToken':
      return draft.type === '6' ? 'alert.notice.type.fei-shu-key' : 'alert.notice.type.access-token';
    case 'tgBotToken':
      return 'alert.notice.type.telegram-bot-token';
    case 'tgUserId':
      return 'alert.notice.type.telegram-bot-user-id';
    case 'tgMessageThreadId':
      return 'alert.notice.type.telegram-message-thread-id';
    case 'userId':
      return draft.type === '14' ? 'alert.notice.type.lark-app-userId' : 'alert.notice.type.userId';
    case 'chatId':
      return 'alert.notice.type.lark-app-chatId';
    case 'slackWebHookUrl':
      return 'alert.notice.type.slack-webHook-url';
    case 'discordChannelId':
      return 'alert.notice.type.discord-channel-id';
    case 'discordBotToken':
      return 'alert.notice.type.discord-bot-token';
    case 'corpId':
      return 'alert.notice.type.WeComApp-corpId';
    case 'agentId':
      return 'alert.notice.type.WeComApp-agentId';
    case 'appSecret':
      if (draft.type === '5') return 'alert.notice.type.ding-secret';
      if (draft.type === '14') return 'alert.notice.type.lark-app-appSecret';
      return 'alert.notice.type.WeComApp-appSecret';
    case 'partyId':
      return draft.type === '14' ? 'alert.notice.type.lark-app-partyId' : 'alert.notice.type.WeComApp-partyId';
    case 'tagId':
      return 'alert.notice.type.WeComApp-tagId';
    case 'smnAk':
      return 'alert.notice.type.smn-ak';
    case 'smnSk':
      return 'alert.notice.type.smn-sk';
    case 'smnProjectId':
      return 'alert.notice.type.smn-projectId';
    case 'smnRegion':
      return 'alert.notice.type.smn-region';
    case 'smnTopicUrn':
      return 'alert.notice.type.smn-topicUrn';
    case 'serverChanToken':
      return 'alert.notice.type.serverchan-token';
    case 'gotifyToken':
      return 'alert.notice.type.gotify-token';
    case 'appId':
      return 'alert.notice.type.lark-app-appId';
    case 'larkReceiveType':
      return 'alert.notice.type.lark-app-larkReceiveType';
    default:
      return field;
  }
}

function getReceiverFieldPlaceholderKey(field: ReceiverFieldKey, draft: NoticeReceiverDraft) {
  switch (field) {
    case 'phone':
      return 'alert.notice.receiver.phone.placeholder';
    case 'email':
      return 'alert.notice.receiver.email.placeholder';
    case 'hookUrl':
      return 'alert.notice.receiver.hookUrl.placeholder';
    case 'hookAuthType':
      return 'alert.notice.type.webhook-auth-type.placeholder';
    case 'larkReceiveType':
      return 'alert.notice.type.lark-app-larkReceiveType.placeholder';
    case 'agentId':
      return 'alert.notice.type.WeComApp-agentId.placeholder';
    case 'userId':
      return draft.type === '14' ? 'alert.notice.type.lark-app-userId.placeholder' : undefined;
    case 'partyId':
      return draft.type === '14' ? 'alert.notice.type.lark-app-partyId.placeholder' : undefined;
    case 'chatId':
      return 'alert.notice.type.lark-app-chatId.placeholder';
    default:
      return undefined;
  }
}

function normalizeReceiverFieldValue(draft: NoticeReceiverDraft, field: ReceiverFieldKey, value: string) {
  if (field === 'wechatId' && draft.type === '4') {
    const index = value.indexOf('key=');
    return index >= 0 ? value.slice(index + 4) : value;
  }
  if (field === 'accessToken' && draft.type === '5') {
    const index = value.indexOf('access_token=');
    return index >= 0 ? value.slice(index + 13) : value;
  }
  if (field === 'accessToken' && draft.type === '6') {
    const index = value.indexOf('hook');
    return index >= 0 ? value.slice(index + 5) : value;
  }
  return value;
}

function ReceiverEditorField({
  draft,
  field,
  t,
  productCopy,
  onChange
}: {
  draft: NoticeReceiverDraft;
  field: ReceiverFieldKey;
  t: Translator;
  productCopy: ReturnType<typeof getAlertNoticeProductCopy>;
  onChange: (field: ReceiverFieldKey, value: string) => void;
}) {
  const required = isNoticeReceiverFieldRequired(draft, field);
  const label = t(getReceiverFieldLabelKey(draft, field));
  const placeholderKey = getReceiverFieldPlaceholderKey(field, draft);
  const placeholder =
    placeholderKey === 'alert.notice.receiver.phone.placeholder'
      ? productCopy.phonePlaceholder
      : placeholderKey === 'alert.notice.receiver.email.placeholder'
        ? productCopy.emailPlaceholder
        : placeholderKey === 'alert.notice.receiver.hookUrl.placeholder'
          ? productCopy.hookUrlPlaceholder
          : placeholderKey
            ? t(placeholderKey)
            : undefined;
  if (field === 'hookAuthType') {
    const currentValue = String(draft[field] ?? '');
    return (
      <ReceiverFieldRow row={field} label={label} required={required}>
        <Select
          data-alert-notice-receiver-select={field}
          data-testid={`notice-receiver-field-${field}`}
          value={currentValue}
          onChange={event => onChange(field, event.target.value)}
          containerClassName="w-full"
        >
          {NOTICE_RECEIVER_WEBHOOK_AUTH_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </ReceiverFieldRow>
    );
  }

  if (field === 'larkReceiveType') {
    const currentValue = String(draft[field] ?? '');
    return (
      <ReceiverFieldRow row={field} label={label} required={required}>
        <Select
          data-alert-notice-receiver-select={field}
          data-testid={`notice-receiver-field-${field}`}
          value={currentValue}
          onChange={event => onChange(field, event.target.value)}
          containerClassName="w-full"
        >
          {NOTICE_RECEIVER_LARK_RECEIVE_TYPE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </Select>
      </ReceiverFieldRow>
    );
  }

  const inputType =
    field === 'email'
      ? 'email'
      : field === 'hookUrl'
        ? 'url'
        : field === 'phone'
          ? 'tel'
          : field === 'agentId'
            ? 'number'
            : 'text';

  return (
    <ReceiverFieldRow row={field} label={label} required={required}>
      <Input
        data-testid={`notice-receiver-field-${field}`}
        value={String(draft[field] ?? '')}
        onChange={event => onChange(field, normalizeReceiverFieldValue(draft, field, event.target.value))}
        placeholder={placeholder}
        required={required}
        type={inputType}
      />
    </ReceiverFieldRow>
  );
}

export function AlertNoticeReceiverFields({
  t,
  draft,
  productCopy,
  onDraftChange
}: {
  t: Translator;
  draft: NoticeReceiverDraft;
  productCopy: ReturnType<typeof getAlertNoticeProductCopy>;
  onDraftChange: React.Dispatch<React.SetStateAction<NoticeReceiverDraft>>;
}) {
  const receiverFieldKeys = getNoticeReceiverVisibleFieldKeys(draft);

  function handleReceiverFieldChange(field: ReceiverFieldKey, value: string) {
    onDraftChange(prev => ({ ...prev, [field]: value }));
  }

  return (
    <div
      data-alert-notice-receiver-fields="true"
      data-alert-notice-receiver-layout="angular-aligned-modal-form"
      data-alert-notice-receiver-form="aligned-label-control"
      className="space-y-3"
    >
      <ReceiverFieldRow row="name" label={t('alert.notice.receiver.name')} required>
        <Input
          data-testid="notice-receiver-field-name"
          value={draft.name}
          onChange={event => onDraftChange(prev => ({ ...prev, name: event.target.value }))}
          placeholder={t('alert.notice.receiver.name')}
          required
        />
      </ReceiverFieldRow>
      <ReceiverFieldRow row="type" label={t('alert.notice.receiver.type')} required>
        <Select
          data-alert-notice-receiver-select="type"
          data-testid="notice-receiver-field-type"
          value={draft.type}
          onChange={event => onDraftChange(prev => ({ ...prev, type: event.target.value }))}
          containerClassName="w-full"
        >
          {NOTICE_RECEIVER_TYPE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </Select>
      </ReceiverFieldRow>
      {receiverFieldKeys.map(field => (
        <ReceiverEditorField
          key={field}
          draft={draft}
          field={field}
          t={t}
          productCopy={productCopy}
          onChange={handleReceiverFieldChange}
        />
      ))}
    </div>
  );
}
