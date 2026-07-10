'use client';

import React from 'react';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import {
  AlertAuthoringInlineHelp,
  AlertAuthoringRequiredMark
} from './alert-authoring-primitives';
import { getNoticeReceiverVisibleFieldKeys, isNoticeReceiverFieldRequired, getAlertNoticeProductCopy } from '../../lib/alert-notice/view-model';
import type { NoticeReceiverDraft } from '../../lib/alert-notice/controller';
import type { NoticeReceiverValidationIssue } from '../../lib/alert-notice/view-model';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;
export type ReceiverFieldKey = Exclude<keyof NoticeReceiverDraft, 'id' | 'name' | 'type'>;
type NoticeFieldRequirement = 'required' | 'optional';
type NoticeFieldInputMode = 'manual' | 'selection';

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
  { value: 'None', labelKey: 'alert.notice.type.webhook-auth-type.none' },
  { value: 'Basic', labelKey: 'alert.notice.type.webhook-auth-type.basic' },
  { value: 'Bearer', labelKey: 'alert.notice.type.webhook-auth-type.bearer' }
] as const;

const NOTICE_RECEIVER_LARK_RECEIVE_TYPE_OPTIONS = [
  { value: '0', labelKey: 'alert.notice.type.lark-app-larkReceiveType.user' },
  { value: '1', labelKey: 'alert.notice.type.lark-app-larkReceiveType.chat' },
  { value: '2', labelKey: 'alert.notice.type.lark-app-larkReceiveType.party' },
  { value: '3', labelKey: 'alert.notice.type.lark-app-larkReceiveType.all' }
] as const;

function ReceiverFieldRow({
  t,
  label,
  required,
  requirement,
  inputMode,
  help,
  children,
  row,
  errorMessage,
  errorId
}: {
  t: Translator;
  label: string;
  required?: boolean;
  requirement: NoticeFieldRequirement;
  inputMode: NoticeFieldInputMode;
  help?: {
    body: React.ReactNode;
    impact: React.ReactNode;
    ariaLabel: string;
  };
  children: React.ReactNode;
  row: string;
  errorMessage?: string;
  errorId?: string;
}) {
  return (
    <div
      data-alert-notice-receiver-form-row={row}
      className="grid grid-cols-[132px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 text-sm text-[var(--ops-text-secondary)]"
    >
      <div
        data-alert-notice-receiver-field-title={row}
        className="inline-flex min-w-0 flex-wrap items-center gap-1.5 text-[13px] font-semibold text-[#a9b0bb]"
      >
        <span>
          {label}
          {required ? <AlertAuthoringRequiredMark /> : null}
        </span>
        {help ? (
          <AlertAuthoringInlineHelp
            id={`alert-notice-receiver-${row}-help`}
            label={help.ariaLabel}
            body={help.body}
            impact={help.impact}
            data-alert-notice-receiver-field-help={row}
          />
        ) : null}
        <span
          data-alert-notice-receiver-field-requirement={requirement}
          className="rounded-[4px] bg-[#182238] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#c8d4ee]"
        >
          {t(`alert.notice.field.requirement.${requirement}`)}
        </span>
        <span
          data-alert-notice-receiver-field-input-mode={inputMode}
          className="rounded-[4px] bg-[#141922] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#9ba7bc]"
        >
          {t(`alert.notice.field.input-mode.${inputMode}`)}
        </span>
      </div>
      <div className="min-w-0">
        {children}
        {errorMessage ? (
          <p
            id={errorId}
            data-alert-notice-receiver-field-error={row}
            className="mt-1 text-[12px] font-semibold leading-5 text-[#ffb4c1]"
          >
            {errorMessage}
          </p>
        ) : null}
      </div>
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

function getReceiverHelpKey(field: ReceiverFieldKey, draft: NoticeReceiverDraft) {
  switch (field) {
    case 'phone':
      return 'phone';
    case 'email':
      return 'email';
    case 'hookUrl':
    case 'slackWebHookUrl':
      return 'webhook-url';
    case 'hookAuthType':
      return 'auth-type';
    case 'hookAuthToken':
      return 'auth-token';
    case 'wechatId':
      return draft.type === '4' ? 'robot-key' : 'user-id';
    case 'accessToken':
      return draft.type === '6' || draft.type === '5' ? 'robot-key' : 'access-token';
    case 'tgBotToken':
    case 'discordBotToken':
      return 'bot-token';
    case 'tgUserId':
    case 'userId':
      return 'user-id';
    case 'tgMessageThreadId':
      return 'thread-id';
    case 'larkReceiveType':
      return 'lark-receive-type';
    case 'chatId':
      return 'chat-id';
    case 'discordChannelId':
      return 'channel-id';
    case 'corpId':
      return 'corp-id';
    case 'agentId':
      return 'agent-id';
    case 'appId':
      return 'app-id';
    case 'appSecret':
      return 'app-secret';
    case 'partyId':
      return 'party-id';
    case 'tagId':
      return 'tag-id';
    case 'smnAk':
      return 'smn-ak';
    case 'smnSk':
      return 'smn-sk';
    case 'smnProjectId':
      return 'smn-project';
    case 'smnRegion':
      return 'smn-region';
    case 'smnTopicUrn':
      return 'smn-topic';
    case 'serverChanToken':
      return 'serverchan-token';
    case 'gotifyToken':
      return 'gotify-token';
    default:
      return 'generic';
  }
}

function receiverFieldHelp(t: Translator, label: string, key: string) {
  return {
    ariaLabel: t('alert.notice.receiver.field.help-aria', { field: label }),
    body: t(`alert.notice.receiver.field.${key}.help`),
    impact: t(`alert.notice.receiver.field.${key}.impact`)
  };
}

export function normalizeReceiverFieldValue(draft: NoticeReceiverDraft, field: ReceiverFieldKey, value: string) {
  if (field === 'wechatId' && draft.type === '4') {
    const index = value.indexOf('key=');
    return index > 0 ? value.slice(index + 4) : value;
  }
  if (field === 'accessToken' && draft.type === '5') {
    const index = value.indexOf('access_token=');
    return index > 0 ? value.slice(index + 13) : value;
  }
  if (field === 'accessToken' && draft.type === '6') {
    const index = value.indexOf('hook');
    return index > 0 ? value.slice(index + 5) : value;
  }
  return value;
}

function getTokenNormalizerContract(draft: NoticeReceiverDraft, field: ReceiverFieldKey) {
  if (field === 'wechatId' && draft.type === '4') return 'wecom-robot-key';
  if (field === 'accessToken' && draft.type === '5') return 'ding-access-token';
  if (field === 'accessToken' && draft.type === '6') return 'lark-robot-hook';
  return undefined;
}

function ReceiverEditorField({
  draft,
  field,
  t,
  productCopy,
  onChange,
  validationIssue
}: {
  draft: NoticeReceiverDraft;
  field: ReceiverFieldKey;
  t: Translator;
  productCopy: ReturnType<typeof getAlertNoticeProductCopy>;
  onChange: (field: ReceiverFieldKey, value: string) => void;
  validationIssue?: NoticeReceiverValidationIssue;
}) {
  const required = isNoticeReceiverFieldRequired(draft, field);
  const label = t(getReceiverFieldLabelKey(draft, field));
  const helpKey = getReceiverHelpKey(field, draft);
  const errorId = validationIssue ? `notice-receiver-${field}-error` : undefined;
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
      <ReceiverFieldRow
        t={t}
        row={field}
        label={label}
        required={required}
        requirement={required ? 'required' : 'optional'}
        inputMode="selection"
        help={receiverFieldHelp(t, label, helpKey)}
        errorMessage={validationIssue?.message}
        errorId={errorId}
      >
        <Select
          data-alert-notice-receiver-select={field}
          data-testid={`notice-receiver-field-${field}`}
          data-alert-notice-receiver-field-invalid={validationIssue ? 'true' : undefined}
          value={currentValue}
          onChange={event => onChange(field, event.target.value)}
          containerClassName="w-full"
          aria-invalid={validationIssue ? true : undefined}
          aria-describedby={errorId}
        >
          {NOTICE_RECEIVER_WEBHOOK_AUTH_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </Select>
      </ReceiverFieldRow>
    );
  }

  if (field === 'larkReceiveType') {
    const currentValue = String(draft[field] ?? '');
    return (
      <ReceiverFieldRow
        t={t}
        row={field}
        label={label}
        required={required}
        requirement={required ? 'required' : 'optional'}
        inputMode="selection"
        help={receiverFieldHelp(t, label, helpKey)}
        errorMessage={validationIssue?.message}
        errorId={errorId}
      >
        <Select
          data-alert-notice-receiver-select={field}
          data-testid={`notice-receiver-field-${field}`}
          data-alert-notice-receiver-field-invalid={validationIssue ? 'true' : undefined}
          value={currentValue}
          onChange={event => onChange(field, event.target.value)}
          containerClassName="w-full"
          aria-invalid={validationIssue ? true : undefined}
          aria-describedby={errorId}
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
  const tokenNormalizer = getTokenNormalizerContract(draft, field);

  return (
    <ReceiverFieldRow
      t={t}
      row={field}
      label={label}
      required={required}
      requirement={required ? 'required' : 'optional'}
      inputMode="manual"
      help={receiverFieldHelp(t, label, helpKey)}
      errorMessage={validationIssue?.message}
      errorId={errorId}
    >
      <Input
        data-testid={`notice-receiver-field-${field}`}
        data-alert-notice-receiver-token-normalizer={tokenNormalizer}
        data-alert-notice-receiver-token-normalizer-event={tokenNormalizer ? 'on-change' : undefined}
        data-alert-notice-receiver-field-invalid={validationIssue ? 'true' : undefined}
        value={String(draft[field] ?? '')}
        onChange={event => onChange(field, normalizeReceiverFieldValue(draft, field, event.target.value))}
        placeholder={placeholder}
        required={required}
        type={inputType}
        aria-invalid={validationIssue ? true : undefined}
        aria-describedby={errorId}
      />
    </ReceiverFieldRow>
  );
}

export function AlertNoticeReceiverFields({
  t,
  draft,
  productCopy,
  onDraftChange,
  validationIssues = []
}: {
  t: Translator;
  draft: NoticeReceiverDraft;
  productCopy: ReturnType<typeof getAlertNoticeProductCopy>;
  onDraftChange: React.Dispatch<React.SetStateAction<NoticeReceiverDraft>>;
  validationIssues?: NoticeReceiverValidationIssue[];
}) {
  const receiverFieldKeys = getNoticeReceiverVisibleFieldKeys(draft);
  const validationIssueByField = new Map(validationIssues.map(issue => [issue.field, issue]));
  const nameValidationIssue = validationIssueByField.get('name');
  const typeValidationIssue = validationIssueByField.get('type');

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
      <ReceiverFieldRow
        t={t}
        row="name"
        label={t('alert.notice.receiver.name')}
        required
        requirement="required"
        inputMode="manual"
        help={receiverFieldHelp(t, t('alert.notice.receiver.name'), 'name')}
        errorMessage={nameValidationIssue?.message}
        errorId={nameValidationIssue ? 'notice-receiver-name-error' : undefined}
      >
        <Input
          data-testid="notice-receiver-field-name"
          data-alert-notice-receiver-field-invalid={nameValidationIssue ? 'true' : undefined}
          value={draft.name}
          onChange={event => onDraftChange(prev => ({ ...prev, name: event.target.value }))}
          placeholder={t('alert.notice.receiver.name')}
          required
          aria-invalid={nameValidationIssue ? true : undefined}
          aria-describedby={nameValidationIssue ? 'notice-receiver-name-error' : undefined}
        />
      </ReceiverFieldRow>
      <ReceiverFieldRow
        t={t}
        row="type"
        label={t('alert.notice.receiver.type')}
        required
        requirement="required"
        inputMode="selection"
        help={receiverFieldHelp(t, t('alert.notice.receiver.type'), 'type')}
        errorMessage={typeValidationIssue?.message}
        errorId={typeValidationIssue ? 'notice-receiver-type-error' : undefined}
      >
        <Select
          data-alert-notice-receiver-select="type"
          data-alert-notice-receiver-default-type="angular-email"
          data-alert-notice-receiver-default-type-owner="route-form-contract"
          data-testid="notice-receiver-field-type"
          data-alert-notice-receiver-field-invalid={typeValidationIssue ? 'true' : undefined}
          value={draft.type}
          onChange={event => onDraftChange(prev => ({ ...prev, type: event.target.value }))}
          containerClassName="w-full"
          aria-invalid={typeValidationIssue ? true : undefined}
          aria-describedby={typeValidationIssue ? 'notice-receiver-type-error' : undefined}
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
          validationIssue={validationIssueByField.get(field)}
        />
      ))}
    </div>
  );
}
