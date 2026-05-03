'use client';

import React from 'react';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { DateTimeRange } from '../ui/date-time-range';
import { LabelRecordInput } from '../ui/label-record-input';
import { SegmentedControl } from '../ui/segmented-control';
import { WeekdayPicker } from '../ui/weekday-picker';
import {
  AlertAuthoringCallout,
  AlertAuthoringPanel,
  AlertAuthoringValuePill
} from './alert-authoring-primitives';
import type { AlertSilenceFormDraft } from '../../lib/alert-silence/controller';
import type { AlertLabelOptions } from '../../lib/alert-label-options';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

type AlertSilenceAuthoringFieldsProps = {
  t: Translator;
  draft: AlertSilenceFormDraft;
  onDraftChange: (nextDraft: AlertSilenceFormDraft) => void;
  mode?: 'workspace' | 'dialog';
  prefillTitle?: string;
  prefillCopy?: string;
  prefillWarning?: string | null;
  previewLabels?: Array<{ key: string; value: string }>;
  labelOptions?: AlertLabelOptions;
};

function toLocalDateTimeInput(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function todayDatePrefix() {
  return toLocalDateTimeInput(new Date()).slice(0, 10);
}

function toTimeValue(value: string) {
  if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  const match = value.match(/T(\d{2}:\d{2})/);
  return match?.[1] || '';
}

function toDateTimeValue(value: string) {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return value.slice(0, 16);
  if (/^\d{2}:\d{2}/.test(value)) return `${todayDatePrefix()}T${value.slice(0, 5)}`;
  return '';
}

function coerceDraftForSilenceType(draft: AlertSilenceFormDraft, type: '0' | '1'): AlertSilenceFormDraft {
  if (draft.type === type) return draft;
  if (type === '1') {
    return {
      ...draft,
      type,
      periodStart: toTimeValue(draft.periodStart),
      periodEnd: toTimeValue(draft.periodEnd),
      daysText: draft.daysText.trim() || '7,1,2,3,4,5,6'
    };
  }
  return {
    ...draft,
    type,
    periodStart: toDateTimeValue(draft.periodStart),
    periodEnd: toDateTimeValue(draft.periodEnd)
  };
}

function AlertSilenceFieldRow({
  label,
  children,
  className
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div data-alert-silence-field-row="cold-form-row" className={`grid gap-2 text-sm text-[var(--ops-text-secondary)] lg:grid-cols-[132px_minmax(0,1fr)] lg:items-center ${className || ''}`}>
      <div className="text-[13px] font-semibold text-[#a9b0bb]">{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

const SILENCE_LABEL_TIME_ROW_CLASS = 'w-full max-w-[720px]';

export function AlertSilenceAuthoringFields({
  t,
  draft,
  onDraftChange,
  mode = 'workspace',
  prefillTitle,
  prefillCopy,
  prefillWarning,
  previewLabels = [],
  labelOptions
}: AlertSilenceAuthoringFieldsProps) {
  const weekOptions = [
    { value: 7, label: t('common.week.7') },
    { value: 1, label: t('common.week.1') },
    { value: 2, label: t('common.week.2') },
    { value: 3, label: t('common.week.3') },
    { value: 4, label: t('common.week.4') },
    { value: 5, label: t('common.week.5') },
    { value: 6, label: t('common.week.6') }
  ];

  return (
    <div
      data-alert-silence-authoring-fields={mode}
      data-alert-silence-authoring-layout="single-column-angular-function"
      className="space-y-4"
    >
      <AlertAuthoringCallout
        title={prefillTitle}
        copy={prefillCopy}
        warning={prefillWarning}
        data-alert-silence-prefill-warning={prefillWarning ? 'true' : undefined}
      />

      {previewLabels.length > 0 ? (
        <AlertAuthoringPanel heading={t('alert.silence.labels')}>
          <div className="flex flex-wrap gap-2">
            {previewLabels.map(label => (
              <AlertAuthoringValuePill
                key={`${label.key}-${label.value}`}
              >
                {label.key}:{label.value}
              </AlertAuthoringValuePill>
            ))}
          </div>
        </AlertAuthoringPanel>
      ) : null}

      <div className="space-y-3" data-alert-silence-row-alignment="label-time-fixed-width">
        <AlertSilenceFieldRow label={t('alert.silence.name')}>
          <Input
            name="silence_name"
            value={draft.name}
            onChange={event => onDraftChange({ ...draft, name: event.target.value })}
          />
        </AlertSilenceFieldRow>
        <AlertSilenceFieldRow label={t('common.enable')}>
          <Checkbox
            name="silence_enable"
            checked={draft.enable}
            label={t('common.enable')}
            onChange={event => onDraftChange({ ...draft, enable: event.target.checked })}
          />
        </AlertSilenceFieldRow>
        <AlertSilenceFieldRow label={t('alert.silence.match-all')}>
          <Checkbox
            name="silence_match_all"
            checked={draft.matchAll}
            label={t('alert.silence.match-all')}
            onChange={event => onDraftChange({ ...draft, matchAll: event.target.checked })}
          />
        </AlertSilenceFieldRow>
        <AlertSilenceFieldRow label={t('alert.silence.type')}>
          <SegmentedControl
            name="silence_type"
            value={draft.type}
            data-alert-silence-type-control="cold-segmented-type"
            options={[
              { value: '0', label: t('alert.silence.type.once') },
              { value: '1', label: t('alert.silence.type.cyc') }
            ]}
            onChange={value => onDraftChange(coerceDraftForSilenceType(draft, value === '1' ? '1' : '0'))}
          />
        </AlertSilenceFieldRow>
        {!draft.matchAll ? (
          <AlertSilenceFieldRow label={t('alert.silence.labels')}>
            <div
              data-alert-silence-label-selector="searchable-label-record"
              data-alert-silence-aligned-control-row="label"
              className={SILENCE_LABEL_TIME_ROW_CLASS}
            >
              <LabelRecordInput
                name="silence_labels"
                value={draft.labelsText}
                labelOptions={labelOptions}
                keyPlaceholder="标签名"
                valuePlaceholder="标签值"
                onValueChange={value => onDraftChange({ ...draft, labelsText: value })}
              />
            </div>
          </AlertSilenceFieldRow>
        ) : null}
        {draft.type === '1' ? (
          <AlertSilenceFieldRow label={t('alert.notice.rule.period-chose')}>
            <WeekdayPicker
              name="silence_days[]"
              value={draft.daysText}
              options={weekOptions}
              onChange={value => onDraftChange({ ...draft, daysText: value })}
            />
          </AlertSilenceFieldRow>
        ) : null}
        <AlertSilenceFieldRow label={t('alert.silence.time')}>
          <div
            data-alert-silence-aligned-control-row="time"
            className={SILENCE_LABEL_TIME_ROW_CLASS}
          >
            <DateTimeRange
              mode={draft.type === '0' ? 'datetime-local' : 'time'}
              startName="silence_period_start"
              endName="silence_period_end"
              startValue={draft.periodStart}
              endValue={draft.periodEnd}
              startLabel={`${t('alert.silence.time')} 开始`}
              endLabel={`${t('alert.silence.time')} ${t('common.end')}`}
              reserveActionSpace
              onStartChange={value => onDraftChange({ ...draft, periodStart: value })}
              onEndChange={value => onDraftChange({ ...draft, periodEnd: value })}
            />
          </div>
        </AlertSilenceFieldRow>
      </div>
    </div>
  );
}
