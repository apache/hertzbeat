'use client';

import React from 'react';
import { Checkbox } from '../ui/checkbox';
import { DateTimeRange } from '../ui/date-time-range';
import { HiddenInput } from '../ui/hidden-input';
import { Input } from '../ui/input';
import { LabelRecordInput } from '../ui/label-record-input';
import { Select } from '../ui/select';
import { DEFAULT_ALERT_LABEL_OPTIONS, type AlertLabelOptions } from '../../lib/alert-label-options';
import type { NoticeRuleDraft } from '../../lib/alert-notice/controller';
import {
  AlertAuthoringInlineHelp,
  AlertAuthoringRequiredMark
} from './alert-authoring-primitives';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;
type NoticeFieldRequirement = 'required' | 'conditional' | 'optional';
type NoticeFieldInputMode = 'manual' | 'selection' | 'manual-or-selection' | 'time-range';
export type NoticeRuleValidationField = 'name' | 'receiver' | 'labels' | 'days' | 'time';

export type NoticeRuleValidationIssue = {
  field: NoticeRuleValidationField;
  message: string;
};

type NoticeRuleOption = {
  value: string;
  label: string;
  type?: string | number | null;
};

type AlertNoticeRuleFieldsProps = {
  t: Translator;
  draft: NoticeRuleDraft;
  receiverIdsPlaceholder: string;
  templateIdPlaceholder: string;
  labelsPlaceholder: string;
  daysPlaceholder: string;
  receiverOptions?: NoticeRuleOption[];
  templateOptions?: NoticeRuleOption[];
  labelOptions?: AlertLabelOptions;
  sourceLabelsText?: string;
  sourceSignal?: string;
  validationIssues?: NoticeRuleValidationIssue[];
  onDraftChange: React.Dispatch<React.SetStateAction<NoticeRuleDraft>>;
};

const weekdayValues = ['7', '1', '2', '3', '4', '5', '6'] as const;

function parseCsvValues(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function orderValues(values: Set<string>, options: NoticeRuleOption[]) {
  const optionOrder = new Set(options.map(option => option.value));
  return [
    ...options.filter(option => values.has(option.value)).map(option => option.value),
    ...Array.from(values).filter(value => !optionOrder.has(value))
  ];
}

function updateCsvSelection(
  currentText: string,
  option: NoticeRuleOption,
  checked: boolean,
  options: NoticeRuleOption[]
) {
  const next = new Set(parseCsvValues(currentText));
  if (checked) {
    next.add(option.value);
  } else {
    next.delete(option.value);
  }
  return orderValues(next, options).join(', ');
}

function isAllDaysSelected(selectedDays: Set<string>, options: Array<{ value: string }>) {
  return options.every(option => selectedDays.has(option.value));
}

function normalizeNoticeType(value?: string | number | null) {
  if (value == null) {
    return '';
  }
  return String(value).trim();
}

function normalizeLabelsText(value?: string | null) {
  return value?.trim() || '';
}

function getSourceLabelPreviewStatus(sourceLabelsText: string, draftLabelsText: string) {
  if (!sourceLabelsText) {
    return 'none';
  }
  if (draftLabelsText === sourceLabelsText) {
    return 'prefilled';
  }
  if (draftLabelsText.startsWith(`${sourceLabelsText},`)) {
    return 'extended';
  }
  return 'edited';
}

function filterTemplateOptionsForReceivers(
  templateOptions: NoticeRuleOption[],
  receiverOptions: NoticeRuleOption[],
  selectedReceivers: Set<string>
) {
  let activeReceiverType: string | null = null;
  receiverOptions.forEach(option => {
    if (selectedReceivers.has(option.value)) {
      activeReceiverType = normalizeNoticeType(option.type);
    }
  });
  if (activeReceiverType == null) {
    return templateOptions;
  }
  return templateOptions.filter(option => {
    const optionType = normalizeNoticeType(option.type);
    return option.value === '-1' || optionType === activeReceiverType;
  });
}

function mergeDetailReceiverOptions(draft: NoticeRuleDraft, receiverOptions: NoticeRuleOption[]) {
  const existingValues = new Set(receiverOptions.map(option => option.value));
  const receiverNames = Array.isArray(draft.receiverName) ? draft.receiverName : [];
  const detailOptions = parseCsvValues(draft.receiverIdsText)
    .map((value, index) => {
      const label = String(receiverNames[index] || value).trim();
      return existingValues.has(value) ? null : { value, label: label || value };
    })
    .filter((option): option is NoticeRuleOption => Boolean(option));
  return detailOptions.length > 0 ? [...detailOptions, ...receiverOptions] : receiverOptions;
}

function buildDetailTemplateOption(draft: NoticeRuleDraft, templateValue: string) {
  if (templateValue === '-1') {
    return null;
  }
  const label = typeof draft.templateName === 'string' ? draft.templateName.trim() : '';
  return label ? { value: templateValue, label } : null;
}

function FieldRow({
  t,
  label,
  required,
  requirement,
  inputMode,
  help,
  children,
  errorMessage,
  errorId,
  row
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
  errorMessage?: string;
  errorId?: string;
  row: string;
}) {
  return (
    <div
      data-alert-notice-rule-form-row={row}
      className="grid grid-cols-[132px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 text-sm text-[var(--ops-text-secondary)]"
    >
      <div
        data-alert-notice-rule-field-title={row}
        className="inline-flex min-w-0 flex-wrap items-center gap-1.5 text-[13px] font-semibold text-[#a9b0bb]"
      >
        <span>
          {label}
          {required ? <AlertAuthoringRequiredMark /> : null}
        </span>
        {help ? (
          <AlertAuthoringInlineHelp
            id={`alert-notice-rule-${row}-help`}
            label={help.ariaLabel}
            body={help.body}
            impact={help.impact}
            data-alert-notice-rule-field-help={row}
          />
        ) : null}
        <span
          data-alert-notice-rule-field-requirement={requirement}
          className="rounded-[4px] bg-[#182238] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#c8d4ee]"
        >
          {t(`alert.notice.field.requirement.${requirement}`)}
        </span>
        <span
          data-alert-notice-rule-field-input-mode={inputMode}
          className="rounded-[4px] bg-[#141922] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#9ba7bc]"
        >
          {t(`alert.notice.field.input-mode.${inputMode}`)}
        </span>
      </div>
      <div className="min-w-0">
        {children}
        {errorMessage ? (
          <span
            id={errorId}
            data-alert-notice-rule-field-error={row}
            className="mt-1 block text-[11px] font-semibold leading-4 text-[#ffb4c1]"
          >
            {errorMessage}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function noticeRuleFieldHelp(t: Translator, label: string, key: string) {
  return {
    ariaLabel: t('alert.notice.rule.field.help-aria', { field: label }),
    body: t(`alert.notice.rule.field.${key}.help`),
    impact: t(`alert.notice.rule.field.${key}.impact`)
  };
}

export function AlertNoticeRuleSwitch({
  checked,
  label,
  row,
  testId,
  onCheckedChange
}: {
  checked: boolean;
  label: string;
  row: string;
  testId: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <span
      data-alert-notice-rule-single-switch-frame="none"
      data-alert-notice-rule-single-switch-frame-owner="route-form-contract"
      className="inline-flex min-h-8 items-center gap-2"
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        data-alert-notice-rule-switch={row}
        data-testid={testId}
        onClick={() => onCheckedChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-[3px] border transition hover:border-[#5f7df6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(78,116,248,0.22)] ${
          checked ? 'border-[#4e74f8] bg-[#182238]' : 'border-[#394150] bg-[#0d0f14]'
        }`}
      >
        <span
          className={`h-3.5 w-3.5 rounded-[2px] bg-[#dbe4f0] shadow transition ${
            checked ? 'translate-x-[17px]' : 'translate-x-[3px]'
          }`}
        />
      </button>
    </span>
  );
}

export function AlertNoticeRuleFields({
  t,
  draft,
  labelsPlaceholder,
  receiverOptions = [],
  templateOptions = [],
  labelOptions = DEFAULT_ALERT_LABEL_OPTIONS,
  sourceLabelsText,
  sourceSignal,
  validationIssues = [],
  onDraftChange
}: AlertNoticeRuleFieldsProps) {
  const validationIssueByField = new Map(validationIssues.map(issue => [issue.field, issue]));
  const selectedReceivers = new Set(parseCsvValues(draft.receiverIdsText));
  const effectiveReceiverOptions = mergeDetailReceiverOptions(draft, receiverOptions);
  const selectedDays = new Set(parseCsvValues(draft.daysText));
  const weekdayOptions = React.useMemo(
    () => [
      { value: '7', label: t('common.week.7') },
      { value: '1', label: t('common.week.1') },
      { value: '2', label: t('common.week.2') },
      { value: '3', label: t('common.week.3') },
      { value: '4', label: t('common.week.4') },
      { value: '5', label: t('common.week.5') },
      { value: '6', label: t('common.week.6') }
    ],
    [t]
  );
  const customPeriod = draft.periodLimit ?? !isAllDaysSelected(selectedDays, weekdayOptions);
  const normalizedTemplateOptions =
    templateOptions.length > 0
      ? templateOptions
      : [{ value: '-1', label: t('alert.notice.template.preset.true') }];
  const templateValue = draft.templateId || '-1';
  const detailTemplateOption = buildDetailTemplateOption(draft, templateValue);
  const filteredTemplateOptions = filterTemplateOptionsForReceivers(
    normalizedTemplateOptions,
    receiverOptions,
    selectedReceivers
  );
  const templateValueExists = filteredTemplateOptions.some(option => option.value === templateValue);
  const currentTemplateOptions =
    !templateValueExists && detailTemplateOption ? [detailTemplateOption, ...filteredTemplateOptions] : filteredTemplateOptions;
  const effectiveTemplateOptions =
    templateValueExists || selectedReceivers.size > 0 || detailTemplateOption
      ? currentTemplateOptions
      : [{ value: templateValue, label: templateValue }, ...filteredTemplateOptions];
  const normalizedSourceLabelsText = normalizeLabelsText(sourceLabelsText);
  const sourceLabelPreviewStatus = getSourceLabelPreviewStatus(normalizedSourceLabelsText, normalizeLabelsText(draft.labelsText));
  const nameValidationIssue = validationIssueByField.get('name');
  const receiverValidationIssue = validationIssueByField.get('receiver');
  const labelsValidationIssue = validationIssueByField.get('labels');
  const daysValidationIssue = validationIssueByField.get('days');
  const timeValidationIssue = validationIssueByField.get('time');

  return (
    <div
      data-alert-notice-rule-fields="true"
      data-alert-notice-rule-layout="angular-aligned-modal-form"
      data-alert-notice-rule-form="aligned-label-control"
      data-alert-notice-rule-period-default-days="angular-all-days"
      data-alert-notice-rule-period-default-days-owner="route-form-contract"
      data-alert-notice-rule-period-limit-state="angular-independent-isLimit"
      data-alert-notice-rule-period-limit-state-owner="route-form-contract"
      data-alert-notice-rule-edit-option-seeding="angular-detail-options"
      data-alert-notice-rule-edit-option-seeding-owner="route-form-contract"
      data-alert-notice-rule-time-default="angular-empty-new-rule"
      data-alert-notice-rule-time-default-owner="route-form-contract"
      data-alert-notice-rule-optional-period-time="angular-form-validity"
      data-alert-notice-rule-optional-period-time-owner="route-validation-contract"
      className="space-y-3"
    >
      <FieldRow
        t={t}
        row="name"
        required
        requirement="required"
        inputMode="manual"
        label={t('alert.notice.rule.name')}
        help={noticeRuleFieldHelp(t, t('alert.notice.rule.name'), 'name')}
        errorMessage={nameValidationIssue?.message}
        errorId={nameValidationIssue ? 'notice-rule-name-error' : undefined}
      >
        <Input
          data-testid="notice-rule-field-name"
          data-alert-notice-rule-field-invalid={nameValidationIssue ? 'true' : undefined}
          value={draft.name}
          onChange={event => onDraftChange(prev => ({ ...prev, name: event.target.value }))}
          placeholder={t('alert.notice.rule.name')}
          aria-invalid={nameValidationIssue ? true : undefined}
          aria-describedby={nameValidationIssue ? 'notice-rule-name-error' : undefined}
        />
      </FieldRow>

      <FieldRow
        t={t}
        row="receiver"
        required
        requirement="required"
        inputMode="selection"
        label={t('alert.notice.receiver.people')}
        help={noticeRuleFieldHelp(t, t('alert.notice.receiver.people'), 'receiver')}
        errorMessage={receiverValidationIssue?.message}
        errorId={receiverValidationIssue ? 'notice-rule-receiver-error' : undefined}
      >
        <HiddenInput
          data-testid="notice-rule-field-receiverIdsText"
          value={draft.receiverIdsText}
          aria-invalid={receiverValidationIssue ? true : undefined}
          aria-describedby={receiverValidationIssue ? 'notice-rule-receiver-error' : undefined}
        />
        <div
          data-alert-notice-rule-receiver-selector="hertzbeat-ui-multi-select"
          data-alert-notice-rule-field-invalid={receiverValidationIssue ? 'true' : undefined}
          className="grid min-h-8 gap-2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-2 py-1"
        >
          {effectiveReceiverOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {effectiveReceiverOptions.map(option => (
                <Checkbox
                  key={option.value}
                  checked={selectedReceivers.has(option.value)}
                  onChange={event =>
                    onDraftChange(prev => ({
                      ...prev,
                      receiverIdsText: updateCsvSelection(prev.receiverIdsText, option, event.target.checked, effectiveReceiverOptions),
                      templateId: '-1'
                    }))
                  }
                  label={option.label}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-7 items-center text-[12px] font-semibold text-[#858d9a]">
              {t('alert.notice.rule.receivers.empty')}
            </div>
          )}
        </div>
      </FieldRow>

      <FieldRow
        t={t}
        row="template"
        requirement="optional"
        inputMode="selection"
        label={t('alert.notice.template')}
        help={noticeRuleFieldHelp(t, t('alert.notice.template'), 'template')}
      >
        <div
          data-alert-notice-rule-template-selector="hertzbeat-ui-select"
          data-alert-notice-rule-template-type-filter="angular-selected-receiver-type"
          data-alert-notice-rule-template-type-filter-owner="route-form-contract"
          data-alert-notice-rule-template-active-type="angular-switch-receiver"
          data-alert-notice-rule-template-active-type-owner="route-form-contract"
        >
          <Select
            data-testid="notice-rule-field-templateId"
            value={templateValue}
            onChange={event => onDraftChange(prev => ({ ...prev, templateId: event.target.value }))}
            containerClassName="w-full"
            className="w-full"
            aria-label={t('alert.notice.template')}
          >
            {effectiveTemplateOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </FieldRow>

      <FieldRow
        t={t}
        row="filter-all"
        required
        requirement="required"
        inputMode="selection"
        label={t('alert.notice.rule.all')}
        help={noticeRuleFieldHelp(t, t('alert.notice.rule.all'), 'filter-all')}
      >
        <AlertNoticeRuleSwitch
          row="filter-all"
          checked={draft.filterAll}
          onCheckedChange={checked => onDraftChange(prev => ({ ...prev, filterAll: checked }))}
          label={t('alert.notice.rule.all')}
          testId="notice-rule-field-filterAll"
        />
      </FieldRow>

      <FieldRow
        t={t}
        row="labels"
        requirement="conditional"
        inputMode="manual-or-selection"
        label={t('alert.notice.rule.tag')}
        help={noticeRuleFieldHelp(t, t('alert.notice.rule.tag'), 'labels')}
        errorMessage={labelsValidationIssue?.message}
        errorId={labelsValidationIssue ? 'notice-rule-labels-error' : undefined}
      >
        {!draft.filterAll ? (
          <div
            data-alert-notice-rule-label-selector="searchable-label-record"
            data-alert-notice-rule-field-invalid={labelsValidationIssue ? 'true' : undefined}
          >
            <LabelRecordInput
              name="notice_rule_labels"
              value={draft.labelsText}
              labelOptions={labelOptions}
              keyPlaceholder={labelsPlaceholder}
              valuePlaceholder={t('alert.notice.rule.label.value.placeholder')}
              onValueChange={value => onDraftChange(prev => ({ ...prev, labelsText: value }))}
            />
            {normalizedSourceLabelsText ? (
              <div
                data-alert-notice-rule-live-label-preview="signal-route"
                data-alert-notice-rule-live-label-preview-owner="signal-alert-handoff"
                data-alert-notice-rule-live-label-preview-status={sourceLabelPreviewStatus}
                data-alert-notice-rule-live-label-preview-signal={sourceSignal || 'context'}
                className="mt-2 rounded-[3px] border border-[#26303d] bg-[#080a0e] px-2.5 py-2"
              >
                <div className="mb-1 text-[11px] font-semibold uppercase text-[#8e99aa]">
                  {t('alert.notice.rule.labels.prefill')}
                </div>
                <code
                  data-alert-notice-rule-live-labels={sourceLabelPreviewStatus}
                  className="block whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-[#aab4c3]"
                >
                  {normalizedSourceLabelsText}
                </code>
              </div>
            ) : null}
          </div>
        ) : (
          <div
            data-alert-notice-rule-labels-disabled="filter-all"
            className="flex min-h-8 items-center rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#858d9a]"
          >
            {t('alert.notice.rule.labels.disabled.filter-all')}
          </div>
        )}
      </FieldRow>

      <FieldRow
        t={t}
        row="period"
        requirement="optional"
        inputMode="selection"
        label={t('alert.notice.rule.period')}
        help={noticeRuleFieldHelp(t, t('alert.notice.rule.period'), 'period')}
      >
        <AlertNoticeRuleSwitch
          row="period-limit"
          checked={customPeriod}
          onCheckedChange={checked =>
            onDraftChange(prev => ({
              ...prev,
              periodLimit: checked,
              daysText: checked ? prev.daysText || weekdayValues.join(', ') : weekdayValues.join(', ')
            }))
          }
          label={customPeriod ? t('alert.notice.rule.period.custom') : t('alert.notice.rule.period.no-limit')}
          testId="notice-rule-field-periodLimit"
        />
      </FieldRow>

      <HiddenInput data-testid="notice-rule-field-daysText" value={draft.daysText} />
      <FieldRow
        t={t}
        row="days"
        requirement="conditional"
        inputMode="selection"
        label={t('alert.notice.rule.period-chose')}
        help={noticeRuleFieldHelp(t, t('alert.notice.rule.period-chose'), 'days')}
        errorMessage={daysValidationIssue?.message}
        errorId={daysValidationIssue ? 'notice-rule-days-error' : undefined}
      >
        {customPeriod ? (
          <div
            data-alert-notice-rule-days-selector="hertzbeat-ui-weekday-checkboxes"
            data-alert-notice-rule-field-invalid={daysValidationIssue ? 'true' : undefined}
            className="flex flex-wrap gap-2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-2 py-1"
          >
            {weekdayOptions.map(option => (
              <Checkbox
                key={option.value}
                checked={selectedDays.has(option.value)}
                onChange={event =>
                  onDraftChange(prev => ({
                    ...prev,
                    daysText: updateCsvSelection(
                      prev.daysText,
                      option,
                      event.target.checked,
                      weekdayOptions
                    )
                  }))
                }
                label={option.label}
              />
            ))}
          </div>
        ) : (
          <div
            data-alert-notice-rule-days-disabled="unlimited"
            className="flex min-h-8 items-center rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-[12px] font-semibold text-[#858d9a]"
          >
            {t('alert.notice.rule.days.disabled.unlimited')}
          </div>
        )}
      </FieldRow>

      <FieldRow
        t={t}
        row="time"
        requirement="optional"
        inputMode="time-range"
        label={t('alert.notice.rule.time')}
        help={noticeRuleFieldHelp(t, t('alert.notice.rule.time'), 'time')}
        errorMessage={timeValidationIssue?.message}
        errorId={timeValidationIssue ? 'notice-rule-time-error' : undefined}
      >
        <div
          data-alert-notice-rule-time-range="shared-hertzbeat-ui-time-range"
          data-alert-notice-rule-field-invalid={timeValidationIssue ? 'true' : undefined}
        >
          <DateTimeRange
            mode="time"
            startName="periodStart"
            endName="periodEnd"
            startValue={draft.periodStart}
            endValue={draft.periodEnd}
            onStartChange={value => onDraftChange(prev => ({ ...prev, periodStart: value }))}
            onEndChange={value => onDraftChange(prev => ({ ...prev, periodEnd: value }))}
            startLabel={t('alert.notice.rule.time-start')}
            endLabel={t('alert.notice.rule.time-end')}
            emptyLabel={t('time.range.unset')}
            hourLabel={t('time.range.hour')}
            minuteLabel={t('time.range.minute')}
            previousMonthLabel={t('time.range.previous-month')}
            nextMonthLabel={t('time.range.next-month')}
            clearLabel={t('common.clear')}
            confirmLabel={t('common.button.ok')}
          />
        </div>
      </FieldRow>

      <FieldRow
        t={t}
        row="enable"
        required
        requirement="required"
        inputMode="selection"
        label={t('common.enable')}
        help={noticeRuleFieldHelp(t, t('common.enable'), 'enable')}
      >
        <AlertNoticeRuleSwitch
          row="enable"
          checked={draft.enable}
          onCheckedChange={checked => onDraftChange(prev => ({ ...prev, enable: checked }))}
          label={t('common.enable')}
          testId="notice-rule-field-enable"
        />
      </FieldRow>
    </div>
  );
}
