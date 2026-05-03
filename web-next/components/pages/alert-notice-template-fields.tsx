'use client';

import React from 'react';
import { ColdCodeEditor, type ColdCodeEditorLanguage } from '../ui/cold-code-editor';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import type { NoticeTemplateDraft } from '../../lib/alert-notice/controller';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type NoticeTemplateTypeOption = {
  value: string;
  label: string;
};

type AlertNoticeTemplateFieldsProps = {
  t: Translator;
  draft: NoticeTemplateDraft;
  readOnly?: boolean;
  typeOptions?: NoticeTemplateTypeOption[];
  onDraftChange: React.Dispatch<React.SetStateAction<NoticeTemplateDraft>>;
};

const defaultTypeKeys = [
  ['0', 'alert.notice.type.sms', '短信'],
  ['1', 'alert.notice.type.email', '邮箱'],
  ['2', 'WebHook', 'WebHook'],
  ['9', 'alert.notice.type.discord', 'Discord'],
  ['8', 'alert.notice.type.slack', 'Slack'],
  ['4', 'alert.notice.type.WeCom-robot', '企业微信机器人'],
  ['5', 'alert.notice.type.ding', '钉钉'],
  ['6', 'alert.notice.type.fei-shu', '飞书机器人'],
  ['7', 'alert.notice.type.telegram-bot', 'Telegram 机器人'],
  ['10', 'alert.notice.type.WeComApp', '企业微信应用'],
  ['11', 'alert.notice.type.smn', '华为云 SMN'],
  ['12', 'alert.notice.type.serverchan', 'ServerChan'],
  ['13', 'alert.notice.type.gotify', 'Gotify'],
  ['14', 'alert.notice.type.lark-app', '飞书应用']
] as const;

function resolveCopy(t: Translator, key: string, fallback: string) {
  const value = t(key);
  return value && value !== key ? value : fallback;
}

function FieldRow({
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
      data-alert-notice-template-form-row={row}
      className="grid grid-cols-[132px_minmax(0,1fr)] items-start gap-x-3 gap-y-1 text-sm text-[var(--ops-text-secondary)]"
    >
      <div className="pt-1.5 text-[13px] font-semibold text-[#a9b0bb]">
        {label}
        {required ? <span className="ml-1 text-[var(--ops-critical)]">*</span> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function resolveTemplateEditorLanguage(typeValue: string): ColdCodeEditorLanguage {
  switch (typeValue) {
    case '2':
    case '8':
    case '9':
      return 'json';
    case '1':
    default:
      return 'html';
  }
}

export function AlertNoticeTemplateFields({
  t,
  draft,
  readOnly = false,
  typeOptions,
  onDraftChange
}: AlertNoticeTemplateFieldsProps) {
  const resolvedTypeOptions =
    typeOptions?.length
      ? typeOptions
      : defaultTypeKeys.map(([value, key, fallback]) => ({ value, label: resolveCopy(t, key, fallback) }));
  const typeValue = draft.type || '1';
  const typeValueExists = resolvedTypeOptions.some(option => option.value === typeValue);
  const effectiveTypeOptions = typeValueExists
    ? resolvedTypeOptions
    : [{ value: typeValue, label: typeValue }, ...resolvedTypeOptions];

  return (
    <div
      data-alert-notice-template-fields="true"
      data-alert-notice-template-layout="angular-aligned-modal-form"
      data-alert-notice-template-form="aligned-label-control"
      data-alert-notice-template-readonly={readOnly ? 'true' : undefined}
      className="grid gap-3"
    >
      <FieldRow row="name" required label={<span data-l10n-key="alert.notice.template.name">{t('alert.notice.template.name')}</span>}>
        <Input
          data-testid="notice-template-field-name"
          value={draft.name}
          readOnly={readOnly}
          onChange={event => onDraftChange(prev => ({ ...prev, name: event.target.value }))}
          placeholder={t('alert.notice.template.name')}
        />
      </FieldRow>

      <FieldRow row="type" required label={resolveCopy(t, 'alert.notice.receiver.type', '通知方式')}>
        <div data-alert-notice-template-type-selector="cold-select">
          <Select
            data-testid="notice-template-field-type"
            value={typeValue}
            disabled={readOnly}
            onChange={event => onDraftChange(prev => ({ ...prev, type: event.target.value }))}
            containerClassName="w-full"
            className="w-full"
            aria-label={resolveCopy(t, 'alert.notice.receiver.type', '通知方式')}
          >
            {effectiveTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </FieldRow>

      <FieldRow row="preset" label={<span data-l10n-key="alert.notice.template.preset">{resolveCopy(t, 'alert.notice.template.preset', '模版类型')}</span>}>
        <div
          data-testid="notice-template-field-preset"
          data-alert-notice-template-preset-view="readonly-type-pill"
          className="inline-flex min-h-8 w-full items-center rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0]"
        >
          {draft.preset ? resolveCopy(t, 'alert.notice.template.preset.true', '系统内置模版') : resolveCopy(t, 'alert.notice.template.preset.false', '用户自定义模版')}
        </div>
      </FieldRow>

      <FieldRow row="content" required label={<span data-l10n-key="alert.notice.template.content">{t('alert.notice.template.content')}</span>}>
        <ColdCodeEditor
          data-testid="notice-template-field-content"
          data-alert-notice-template-code-editor="template-content"
          data-alert-notice-template-viewer-code-editor={readOnly ? 'readonly-code-editor' : undefined}
          value={draft.content}
          language={resolveTemplateEditorLanguage(typeValue)}
          readOnly={readOnly}
          minHeight="220px"
          ariaLabel={t('alert.notice.template.content')}
          onChange={nextValue => onDraftChange(prev => ({ ...prev, content: nextValue }))}
          placeholder={t('alert.notice.template.content')}
        />
      </FieldRow>
    </div>
  );
}
