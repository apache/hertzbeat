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

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

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
      data-alert-notice-rule-form-row={row}
      className="grid grid-cols-[132px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 text-sm text-[var(--ops-text-secondary)]"
    >
      <div className="text-[13px] font-semibold text-[#a9b0bb]">
        {label}
        {required ? <span className="ml-1 text-[var(--ops-critical)]">*</span> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
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
      <span data-alert-notice-rule-switch-label={row} className="text-[12px] font-semibold text-[#dbe4f0]">
        {label}
      </span>
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
  onDraftChange
}: AlertNoticeRuleFieldsProps) {
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
      <FieldRow row="name" required label={t('alert.notice.rule.name')}>
        <Input
          data-testid="notice-rule-field-name"
          value={draft.name}
          onChange={event => onDraftChange(prev => ({ ...prev, name: event.target.value }))}
          placeholder={t('alert.notice.rule.name')}
        />
      </FieldRow>

      <FieldRow row="receiver" required label={t('alert.notice.receiver.people')}>
        <HiddenInput data-testid="notice-rule-field-receiverIdsText" value={draft.receiverIdsText} />
        <div
          data-alert-notice-rule-receiver-selector="cold-multi-select"
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

      <FieldRow row="template" label={t('alert.notice.template')}>
        <div
          data-alert-notice-rule-template-selector="cold-select"
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

      <FieldRow row="filter-all" required label={t('alert.notice.rule.all')}>
        <AlertNoticeRuleSwitch
          row="filter-all"
          checked={draft.filterAll}
          onCheckedChange={checked => onDraftChange(prev => ({ ...prev, filterAll: checked }))}
          label={t('alert.notice.rule.all')}
          testId="notice-rule-field-filterAll"
        />
      </FieldRow>

      {!draft.filterAll ? (
        <FieldRow row="labels" required label={t('alert.notice.rule.tag')}>
          <div data-alert-notice-rule-label-selector="searchable-label-record">
            <LabelRecordInput
              name="notice_rule_labels"
              value={draft.labelsText}
              labelOptions={labelOptions}
              keyPlaceholder={labelsPlaceholder}
              valuePlaceholder={t('alert.notice.rule.label.value.placeholder')}
              onValueChange={value => onDraftChange(prev => ({ ...prev, labelsText: value }))}
            />
          </div>
        </FieldRow>
      ) : null}

      <FieldRow row="period" label={t('alert.notice.rule.period')}>
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
      {customPeriod ? (
        <FieldRow row="days" label={t('alert.notice.rule.period-chose')}>
          <div
            data-alert-notice-rule-days-selector="cold-weekday-checkboxes"
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
        </FieldRow>
      ) : null}

      <FieldRow row="time" label={t('alert.notice.rule.time')}>
        <div data-alert-notice-rule-time-range="shared-cold-time-range">
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

      <FieldRow row="enable" required label={t('common.enable')}>
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
