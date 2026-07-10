'use client';

import React from 'react';
import { HzCodeEditor, type HzCodeEditorLanguage } from '@hertzbeat/ui';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import type { NoticeTemplateDraft } from '../../lib/alert-notice/controller';
import type { NoticeTemplateValidationIssue } from '../../lib/alert-notice/view-model';
import {
  AlertAuthoringInlineHelp,
  AlertAuthoringRequiredMark
} from './alert-authoring-primitives';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;
type NoticeFieldRequirement = 'required' | 'optional';
type NoticeFieldInputMode = 'manual' | 'selection' | 'generated';

type NoticeTemplateTypeOption = {
  value: string;
  label: string;
};

type AlertNoticeTemplateFieldsProps = {
  t: Translator;
  draft: NoticeTemplateDraft;
  readOnly?: boolean;
  typeOptions?: NoticeTemplateTypeOption[];
  validationIssues?: NoticeTemplateValidationIssue[];
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
  t,
  label,
  required,
  requirement,
  inputMode,
  help,
  children,
  l10nKey,
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
  l10nKey?: string;
  row: string;
  errorMessage?: string;
  errorId?: string;
}) {
  return (
    <div
      data-alert-notice-template-form-row={row}
      className="grid grid-cols-[132px_minmax(0,1fr)] items-start gap-x-3 gap-y-1 text-sm text-[var(--ops-text-secondary)]"
    >
      <div
        data-alert-notice-template-field-title={row}
        className="inline-flex min-w-0 flex-wrap items-center gap-1.5 pt-1.5 text-[13px] font-semibold text-[#a9b0bb]"
      >
        <span data-l10n-key={l10nKey}>
          {label}
          {required ? <AlertAuthoringRequiredMark /> : null}
        </span>
        {help ? (
          <AlertAuthoringInlineHelp
            id={`alert-notice-template-${row}-help`}
            label={help.ariaLabel}
            body={help.body}
            impact={help.impact}
            data-alert-notice-template-field-help={row}
          />
        ) : null}
        <span
          data-alert-notice-template-field-requirement={requirement}
          className="rounded-[4px] bg-[#182238] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#c8d4ee]"
        >
          {t(`alert.notice.field.requirement.${requirement}`)}
        </span>
        <span
          data-alert-notice-template-field-input-mode={inputMode}
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
            data-alert-notice-template-field-error={row}
            className="mt-1 text-[12px] font-semibold leading-5 text-[#ffb4c1]"
          >
            {errorMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function noticeTemplateFieldHelp(t: Translator, label: string, key: string) {
  return {
    ariaLabel: t('alert.notice.template.field.help-aria', { field: label }),
    body: t(`alert.notice.template.field.${key}.help`),
    impact: t(`alert.notice.template.field.${key}.impact`)
  };
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
  validationIssues = [],
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
  const validationIssueByField = new Map(validationIssues.map(issue => [issue.field, issue]));
  const nameValidationIssue = validationIssueByField.get('name');
  const typeValidationIssue = validationIssueByField.get('type');
  const contentValidationIssue = validationIssueByField.get('content');

  return (
    <div
      data-alert-notice-template-fields="true"
      data-alert-notice-template-layout="angular-aligned-modal-form"
      data-alert-notice-template-form="aligned-label-control"
      data-alert-notice-template-readonly={readOnly ? 'true' : undefined}
      className="grid gap-3"
    >
      <FieldRow
        t={t}
        row="name"
        required
        requirement="required"
        inputMode="manual"
        label={t('alert.notice.template.name')}
        l10nKey="alert.notice.template.name"
        help={noticeTemplateFieldHelp(t, t('alert.notice.template.name'), 'name')}
        errorMessage={nameValidationIssue?.message}
        errorId={nameValidationIssue ? 'notice-template-name-error' : undefined}
      >
        <Input
          data-testid="notice-template-field-name"
          data-alert-notice-template-field-invalid={nameValidationIssue ? 'true' : undefined}
          value={draft.name}
          readOnly={readOnly}
          onChange={event => onDraftChange(prev => ({ ...prev, name: event.target.value }))}
          placeholder={t('alert.notice.template.name')}
          aria-invalid={nameValidationIssue ? true : undefined}
          aria-describedby={nameValidationIssue ? 'notice-template-name-error' : undefined}
        />
      </FieldRow>

      <FieldRow
        t={t}
        row="type"
        required
        requirement="required"
        inputMode="selection"
        label={t('alert.notice.template.type')}
        help={noticeTemplateFieldHelp(t, t('alert.notice.template.type'), 'type')}
        errorMessage={typeValidationIssue?.message}
        errorId={typeValidationIssue ? 'notice-template-type-error' : undefined}
      >
        <div
          data-alert-notice-template-type-selector="hertzbeat-ui-select"
          data-alert-notice-template-type-required="angular-required-select"
          data-alert-notice-template-type-required-owner="route-validation-contract"
        >
          <Select
            data-testid="notice-template-field-type"
            data-alert-notice-template-field-invalid={typeValidationIssue ? 'true' : undefined}
            value={typeValue}
            disabled={readOnly}
            onChange={event => onDraftChange(prev => ({ ...prev, type: event.target.value }))}
            containerClassName="w-full"
            className="w-full"
            aria-label={t('alert.notice.template.type')}
            aria-invalid={typeValidationIssue ? true : undefined}
            aria-describedby={typeValidationIssue ? 'notice-template-type-error' : undefined}
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

      <FieldRow
        t={t}
        row="preset"
        requirement="optional"
        inputMode="generated"
        label={t('alert.notice.template.preset')}
        l10nKey="alert.notice.template.preset"
        help={noticeTemplateFieldHelp(t, t('alert.notice.template.preset'), 'preset')}
      >
        <div
          data-testid="notice-template-field-preset"
          data-alert-notice-template-preset-view="readonly-type-pill"
          className="inline-flex min-h-8 w-full items-center rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#dbe4f0]"
        >
          {draft.preset ? t('alert.notice.template.preset.true') : t('alert.notice.template.preset.false')}
        </div>
      </FieldRow>

      <FieldRow
        t={t}
        row="content"
        required
        requirement="required"
        inputMode="manual"
        label={t('alert.notice.template.content')}
        l10nKey="alert.notice.template.content"
        help={noticeTemplateFieldHelp(t, t('alert.notice.template.content'), 'content')}
        errorMessage={contentValidationIssue?.message}
        errorId={contentValidationIssue ? 'notice-template-content-error' : undefined}
      >
        <HzCodeEditor
          data-testid="notice-template-field-content"
          data-alert-notice-template-code-editor-owner="hertzbeat-ui-code-editor"
          data-alert-notice-template-code-editor="template-content"
          data-alert-notice-template-viewer-code-editor={readOnly ? 'readonly-code-editor' : undefined}
          data-alert-notice-template-field-invalid={contentValidationIssue ? 'true' : undefined}
          value={draft.content}
          language={resolveTemplateEditorLanguage(typeValue)}
          readOnly={readOnly}
          name="template_content"
          minHeight="220px"
          ariaLabel={t('alert.notice.template.content')}
          aria-invalid={contentValidationIssue ? true : undefined}
          aria-describedby={contentValidationIssue ? 'notice-template-content-error' : undefined}
          tabIndex={contentValidationIssue ? -1 : undefined}
          onChange={nextValue => onDraftChange(prev => ({ ...prev, content: nextValue }))}
          placeholder={t('alert.notice.template.content')}
        />
      </FieldRow>
    </div>
  );
}
