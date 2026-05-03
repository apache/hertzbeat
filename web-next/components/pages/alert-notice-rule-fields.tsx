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

const weekdayOptions = [
  { value: '7', fallback: '周日', key: 'common.week.7' },
  { value: '1', fallback: '周一', key: 'common.week.1' },
  { value: '2', fallback: '周二', key: 'common.week.2' },
  { value: '3', fallback: '周三', key: 'common.week.3' },
  { value: '4', fallback: '周四', key: 'common.week.4' },
  { value: '5', fallback: '周五', key: 'common.week.5' },
  { value: '6', fallback: '周六', key: 'common.week.6' }
];

function resolveCopy(t: Translator, key: string, fallback: string) {
  const value = t(key);
  return value && value !== key ? value : fallback;
}

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

function isAllDaysSelected(selectedDays: Set<string>) {
  return weekdayOptions.every(option => selectedDays.has(option.value));
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
  const selectedReceiverTypes = new Set(
    receiverOptions
      .filter(option => selectedReceivers.has(option.value))
      .map(option => normalizeNoticeType(option.type))
      .filter(Boolean)
  );
  if (selectedReceiverTypes.size === 0) {
    return templateOptions;
  }
  return templateOptions.filter(option => {
    const optionType = normalizeNoticeType(option.type);
    return option.value === '-1' || !optionType || selectedReceiverTypes.has(optionType);
  });
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

function RuleSwitch({
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
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-alert-notice-rule-switch={row}
      data-testid={testId}
      onClick={() => onCheckedChange(!checked)}
      className="inline-flex h-8 items-center gap-2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-2 text-[12px] font-semibold text-[#dbe4f0] transition hover:border-[#4e74f8] hover:bg-[#151b28] focus-visible:border-[#4e74f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(78,116,248,0.14)]"
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex h-5 w-9 items-center rounded-[3px] border transition ${
          checked ? 'border-[#4e74f8] bg-[#182238]' : 'border-[#394150] bg-[#0d0f14]'
        }`}
      >
        <span
          className={`h-3.5 w-3.5 rounded-[2px] bg-[#dbe4f0] shadow transition ${
            checked ? 'translate-x-[17px]' : 'translate-x-[3px]'
          }`}
        />
      </span>
      <span data-alert-notice-rule-switch-label={row}>{label}</span>
    </button>
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
  const selectedDays = new Set(parseCsvValues(draft.daysText));
  const customPeriod = !isAllDaysSelected(selectedDays);
  const normalizedTemplateOptions =
    templateOptions.length > 0
      ? templateOptions
      : [{ value: '-1', label: resolveCopy(t, 'alert.notice.template.preset.true', '系统内置模版') }];
  const templateValue = draft.templateId || '-1';
  const filteredTemplateOptions = filterTemplateOptionsForReceivers(
    normalizedTemplateOptions,
    receiverOptions,
    selectedReceivers
  );
  const templateValueExists = filteredTemplateOptions.some(option => option.value === templateValue);
  const effectiveTemplateOptions =
    templateValueExists || selectedReceivers.size > 0
      ? filteredTemplateOptions
      : [{ value: templateValue, label: templateValue }, ...filteredTemplateOptions];

  return (
    <div
      data-alert-notice-rule-fields="true"
      data-alert-notice-rule-layout="angular-aligned-modal-form"
      data-alert-notice-rule-form="aligned-label-control"
      className="space-y-3"
    >
      <FieldRow row="name" required label={resolveCopy(t, 'alert.notice.rule.name', '策略名称')}>
        <Input
          data-testid="notice-rule-field-name"
          value={draft.name}
          onChange={event => onDraftChange(prev => ({ ...prev, name: event.target.value }))}
          placeholder={resolveCopy(t, 'alert.notice.rule.name', '策略名称')}
        />
      </FieldRow>

      <FieldRow row="receiver" required label={resolveCopy(t, 'alert.notice.receiver.people', '接收对象')}>
        <HiddenInput data-testid="notice-rule-field-receiverIdsText" value={draft.receiverIdsText} />
        <div
          data-alert-notice-rule-receiver-selector="cold-multi-select"
          className="grid min-h-8 gap-2 rounded-[3px] border border-[#2b3039] bg-[#101217] px-2 py-1"
        >
          {receiverOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {receiverOptions.map(option => (
                <Checkbox
                  key={option.value}
                  checked={selectedReceivers.has(option.value)}
                  onChange={event =>
                    onDraftChange(prev => ({
                      ...prev,
                      receiverIdsText: updateCsvSelection(prev.receiverIdsText, option, event.target.checked, receiverOptions),
                      templateId: '-1'
                    }))
                  }
                  label={option.label}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-7 items-center text-[12px] font-semibold text-[#858d9a]">暂无接收对象，请先新增接收对象</div>
          )}
        </div>
      </FieldRow>

      <FieldRow row="template" label={resolveCopy(t, 'alert.notice.template', '通知模板')}>
        <div data-alert-notice-rule-template-selector="cold-select">
          <Select
            data-testid="notice-rule-field-templateId"
            value={templateValue}
            onChange={event => onDraftChange(prev => ({ ...prev, templateId: event.target.value }))}
            containerClassName="w-full"
            className="w-full"
            aria-label={resolveCopy(t, 'alert.notice.template', '通知模板')}
          >
            {effectiveTemplateOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </FieldRow>

      <FieldRow row="filter-all" required label={resolveCopy(t, 'alert.notice.rule.all', '转发所有')}>
        <RuleSwitch
          row="filter-all"
          checked={draft.filterAll}
          onCheckedChange={checked => onDraftChange(prev => ({ ...prev, filterAll: checked }))}
          label={resolveCopy(t, 'alert.notice.rule.all', '转发所有')}
          testId="notice-rule-field-filterAll"
        />
      </FieldRow>

      {!draft.filterAll ? (
        <FieldRow row="labels" required label={resolveCopy(t, 'alert.notice.rule.tag', '标签匹配')}>
          <div data-alert-notice-rule-label-selector="searchable-label-record">
            <LabelRecordInput
              name="notice_rule_labels"
              value={draft.labelsText}
              labelOptions={labelOptions}
              keyPlaceholder={labelsPlaceholder}
              valuePlaceholder="标签值"
              onValueChange={value => onDraftChange(prev => ({ ...prev, labelsText: value }))}
            />
          </div>
        </FieldRow>
      ) : null}

      <FieldRow row="period" label={resolveCopy(t, 'alert.notice.rule.period', '时间周期')}>
        <RuleSwitch
          row="period-limit"
          checked={customPeriod}
          onCheckedChange={checked =>
            onDraftChange(prev => ({
              ...prev,
              daysText: checked ? '1, 2, 3, 4, 5' : weekdayOptions.map(option => option.value).join(', ')
            }))
          }
          label={customPeriod ? resolveCopy(t, 'alert.notice.rule.period.custom', '自定义') : resolveCopy(t, 'alert.notice.rule.period.no-limit', '无限制')}
          testId="notice-rule-field-periodLimit"
        />
      </FieldRow>

      <HiddenInput data-testid="notice-rule-field-daysText" value={draft.daysText} />
      {customPeriod ? (
        <FieldRow row="days" label={resolveCopy(t, 'alert.notice.rule.period-chose', '选择日期')}>
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
                      { value: option.value, label: option.fallback },
                      event.target.checked,
                      weekdayOptions.map(dayOption => ({ value: dayOption.value, label: dayOption.fallback }))
                    )
                  }))
                }
                label={resolveCopy(t, option.key, option.fallback)}
              />
            ))}
          </div>
        </FieldRow>
      ) : null}

      <FieldRow row="time" label={resolveCopy(t, 'alert.notice.rule.time', '通知时段')}>
        <div data-alert-notice-rule-time-range="shared-cold-time-range">
          <DateTimeRange
            mode="time"
            startName="periodStart"
            endName="periodEnd"
            startValue={draft.periodStart}
            endValue={draft.periodEnd}
            onStartChange={value => onDraftChange(prev => ({ ...prev, periodStart: value }))}
            onEndChange={value => onDraftChange(prev => ({ ...prev, periodEnd: value }))}
            startLabel={resolveCopy(t, 'alert.notice.rule.time-start', '起始时间')}
            endLabel={resolveCopy(t, 'alert.notice.rule.time-end', '结束时间')}
          />
        </div>
      </FieldRow>

      <FieldRow row="enable" required label={resolveCopy(t, 'common.enable', '启用状态')}>
        <RuleSwitch
          row="enable"
          checked={draft.enable}
          onCheckedChange={checked => onDraftChange(prev => ({ ...prev, enable: checked }))}
          label={resolveCopy(t, 'common.enable', '启用状态')}
          testId="notice-rule-field-enable"
        />
      </FieldRow>
    </div>
  );
}
