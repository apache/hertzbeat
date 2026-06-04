'use client';

import React from 'react';
import { HzCodeEditor, type HzCodeEditorLanguage } from '@hertzbeat/ui';
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
  ['0', 'alert.notice.type.sms'],
  ['1', 'alert.notice.type.email'],
  ['2', 'alert.notice.type.url'],
  ['9', 'alert.notice.type.discord'],
  ['8', 'alert.notice.type.slack'],
  ['4', 'alert.notice.type.WeCom-robot'],
  ['5', 'alert.notice.type.ding'],
  ['6', 'alert.notice.type.fei-shu'],
  ['7', 'alert.notice.type.telegram'],
  ['10', 'alert.notice.type.WeComApp'],
  ['11', 'alert.notice.type.smn'],
  ['12', 'alert.notice.type.serverchan'],
  ['13', 'alert.notice.type.gotify'],
  ['14', 'alert.notice.type.lark-app']
] as const;

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

function resolveTemplateEditorLanguage(typeValue: string): HzCodeEditorLanguage {
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
      : defaultTypeKeys.map(([value, key]) => ({ value, label: t(key) }));
  const typeValue = draft.type || '';
  const typeValueExists = resolvedTypeOptions.some(option => option.value === typeValue);
  const effectiveTypeOptions =
    !typeValue || typeValueExists
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

      <FieldRow row="type" required label={t('alert.notice.template.type')}>
        <div
          data-alert-notice-template-type-selector="hertzbeat-ui-select"
          data-alert-notice-template-type-required="angular-required-select"
          data-alert-notice-template-type-required-owner="route-validation-contract"
        >
          <Select
            data-testid="notice-template-field-type"
            value={typeValue}
            disabled={readOnly}
            onChange={event => onDraftChange(prev => ({ ...prev, type: event.target.value }))}
            containerClassName="w-full"
            className="w-full"
            aria-label={t('alert.notice.template.type')}
          >
            {!typeValue ? (
              <option value="" disabled>
                {t('alert.notice.receiver.type.placeholder')}
              </option>
            ) : null}
            {effectiveTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </FieldRow>

      <FieldRow row="preset" label={<span data-l10n-key="alert.notice.template.preset">{t('alert.notice.template.preset')}</span>}>
        <div
          data-testid="notice-template-field-preset"
          data-alert-notice-template-preset-view="readonly-type-pill"
          className="inline-flex min-h-8 w-full items-center rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0]"
        >
          {draft.preset ? t('alert.notice.template.preset.true') : t('alert.notice.template.preset.false')}
        </div>
      </FieldRow>

      <FieldRow row="content" required label={<span data-l10n-key="alert.notice.template.content">{t('alert.notice.template.content')}</span>}>
        <HzCodeEditor
          data-testid="notice-template-field-content"
          data-alert-notice-template-code-editor-owner="hertzbeat-ui-code-editor"
          data-alert-notice-template-code-editor="template-content"
          data-alert-notice-template-viewer-code-editor={readOnly ? 'readonly-code-editor' : undefined}
          value={draft.content}
          language={resolveTemplateEditorLanguage(typeValue)}
          readOnly={readOnly}
          name="template_content"
          minHeight="220px"
          ariaLabel={t('alert.notice.template.content')}
          onChange={nextValue => onDraftChange(prev => ({ ...prev, content: nextValue }))}
          placeholder={t('alert.notice.template.content')}
        />
      </FieldRow>
    </div>
  );
}
