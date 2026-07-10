'use client';

import { Clock3, Pause, Play, RefreshCw, RotateCcw } from 'lucide-react';
import React from 'react';
import {
  TIME_CONTEXT_PRESETS,
  sanitizeTimeContext,
  type TimeContext,
  type TimeContextPreset
} from '../../lib/time-context';
import { cn } from '../../lib/utils';
import { Input } from '../ui/input';
import { Select, type SelectProps } from '../ui/select';

type TimeRangePresetOption = {
  value: string;
  label: string;
};

type TimeRangeControlTranslator = (key: string) => string;
type TimeRangePresetLabels = Partial<Record<TimeContextPreset, string>>;
type TimeRangeControlVariant = 'toolbar' | 'narrow-rail';
type TimeRangeControlButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  [key: `data-${string}`]: string | number | boolean | undefined;
};
type TimeRangeControlSelectProps = Omit<
  SelectProps,
  'children' | 'className' | 'containerClassName' | 'defaultValue' | 'onChange' | 'onValueChange' | 'value'
> & {
  [key: `data-${string}`]: string | number | boolean | undefined;
};

const DEFAULT_TIME_RANGE_PRESET_LABELS: Record<TimeContextPreset, string> = {
  'last-30m': 'Last 30 minutes',
  'last-1h': 'Last 1 hour',
  'last-6h': 'Last 6 hours',
  'last-1d': 'Last 1 day',
  'last-1w': 'Last 1 week',
  'last-4w': 'Last 4 weeks',
  'last-12w': 'Last 12 weeks'
};

export type TimeRangeControlLabels = {
  preset: string;
  presets: TimeRangePresetLabels;
  customRange: string;
  relative: string;
  start: string;
  end: string;
  refresh: string;
  manualRefresh: string;
  live: string;
  liveOn: string;
  liveOff: string;
  timezone: string;
  localTimezone: string;
  apply: string;
  applyAria: string;
  refreshAction: string;
  reset: string;
  resetAria: string;
  relativePlaceholder: string;
};

const DEFAULT_LABELS: TimeRangeControlLabels = {
  preset: 'Time range',
  presets: DEFAULT_TIME_RANGE_PRESET_LABELS,
  customRange: 'Custom range',
  relative: 'Relative',
  start: 'Start',
  end: 'End',
  refresh: 'Refresh interval',
  manualRefresh: 'Manual',
  live: 'Live',
  liveOn: 'Pause live updates',
  liveOff: 'Resume live updates',
  timezone: 'Timezone',
  localTimezone: 'Local timezone',
  apply: 'Apply',
  applyAria: 'Apply time range',
  refreshAction: 'Refresh now',
  reset: 'Reset',
  resetAria: 'Reset time range',
  relativePlaceholder: '45m'
};

const DEFAULT_REFRESH_OPTIONS: TimeRangePresetOption[] = [
  { value: '', label: '' },
  { value: '10', label: '10s' },
  { value: '30', label: '30s' },
  { value: '60', label: '1m' },
  { value: '300', label: '5m' }
];

const DEFAULT_TIMEZONE_OPTIONS = ['Asia/Shanghai', 'UTC'];

export function buildTimeRangeControlLabels(t: TimeRangeControlTranslator): TimeRangeControlLabels {
  return {
    preset: t('time.range.preset'),
    presets: buildTimeRangePresetLabels(t),
    customRange: t('time.range.custom-range'),
    relative: t('time.range.relative'),
    start: t('time.range.start'),
    end: t('time.range.end'),
    refresh: t('time.range.refresh'),
    manualRefresh: t('time.range.manual-refresh'),
    live: t('time.range.live'),
    liveOn: t('time.range.live-on'),
    liveOff: t('time.range.live-off'),
    timezone: t('time.range.timezone'),
    localTimezone: t('time.range.local-timezone'),
    apply: t('time.range.apply'),
    applyAria: t('time.range.apply-aria'),
    refreshAction: t('time.range.refresh-action'),
    reset: t('time.range.reset'),
    resetAria: t('time.range.reset-aria'),
    relativePlaceholder: t('time.range.relative-placeholder')
  };
}

function readLocalizedLabel(t: TimeRangeControlTranslator, key: string, fallback: string) {
  const label = t(key);
  return label && label !== key ? label : fallback;
}

export function buildTimeRangePresetLabels(t: TimeRangeControlTranslator): TimeRangePresetLabels {
  return Object.fromEntries(
    TIME_CONTEXT_PRESETS.map(preset => [
      preset.value,
      readLocalizedLabel(t, `time.range.preset.${preset.value}`, DEFAULT_TIME_RANGE_PRESET_LABELS[preset.value])
    ])
  ) as TimeRangePresetLabels;
}

function buildTimeRangePresetOptions(labels: TimeRangePresetLabels): TimeRangePresetOption[] {
  return TIME_CONTEXT_PRESETS.map(preset => ({
    value: preset.value,
    label: labels[preset.value] || DEFAULT_TIME_RANGE_PRESET_LABELS[preset.value]
  }));
}

function padTimePart(value: number, length = 2) {
  return String(value).padStart(length, '0');
}

type AbsoluteDraftPrecision = 'milliseconds' | 'seconds';

export function formatEpochMillisDraft(
  value: string | undefined,
  options: { precision?: AbsoluteDraftPrecision } = {}
) {
  if (!value || !/^\d+$/.test(value)) return value || '';
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return value;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return value;

  const datePart = [
    date.getFullYear(),
    padTimePart(date.getMonth() + 1),
    padTimePart(date.getDate())
  ].join('-');
  const timePart = [
    padTimePart(date.getHours()),
    padTimePart(date.getMinutes()),
    padTimePart(date.getSeconds())
  ].join(':');
  const milliseconds = date.getMilliseconds();

  if (options.precision === 'seconds') return `${datePart} ${timePart}`;

  return milliseconds > 0
    ? `${datePart} ${timePart}.${padTimePart(milliseconds, 3)}`
    : `${datePart} ${timePart}`;
}

function parseAbsoluteDraft(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^\d+$/.test(trimmed)) return trimmed;

  const localDateTimeMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,3}))?)?)?$/.exec(trimmed);
  if (localDateTimeMatch) {
    const [, year, month, day, hour = '0', minute = '0', second = '0', millisecond = '0'] = localDateTimeMatch;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Number(millisecond.padEnd(3, '0'))
    );
    const timestamp = date.getTime();
    return Number.isFinite(timestamp) ? String(timestamp) : undefined;
  }

  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? String(parsed) : undefined;
}

function contextToDraft(value: TimeContext, options: { absolutePrecision?: AbsoluteDraftPrecision } = {}) {
  const sanitized = sanitizeTimeContext(value);
  const customRelative = sanitized.timeRange?.startsWith('last-') && !TIME_CONTEXT_PRESETS.some(preset => preset.value === sanitized.timeRange)
    ? sanitized.timeRange.replace(/^last-/, '')
    : '';

  return {
    timeRange: sanitized.timeRange || TIME_CONTEXT_PRESETS[0].value,
    relative: customRelative,
    start: formatEpochMillisDraft(sanitized.start, { precision: options.absolutePrecision }),
    end: formatEpochMillisDraft(sanitized.end, { precision: options.absolutePrecision }),
    refresh: sanitized.refresh || '',
    live: sanitized.live || '',
    tz: sanitized.tz || ''
  };
}

function draftToContext(draft: ReturnType<typeof contextToDraft>): TimeContext {
  return sanitizeTimeContext({
    timeRange: draft.relative ? `last-${draft.relative}` : draft.timeRange,
    start: parseAbsoluteDraft(draft.start),
    end: parseAbsoluteDraft(draft.end),
    refresh: draft.refresh,
    live: draft.live,
    tz: draft.tz
  });
}

function stableContextSignature(context: TimeContext) {
  const sanitized = sanitizeTimeContext(context);
  return JSON.stringify({
    timeRange: sanitized.timeRange || '',
    start: sanitized.start || '',
    end: sanitized.end || '',
    refresh: sanitized.refresh || '',
    live: sanitized.live || '',
    tz: sanitized.tz || ''
  });
}

export type TimeRangeControlProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onReset'> & {
  value: TimeContext;
  onApply: (context: TimeContext) => void;
  onRefresh?: () => void;
  onReset?: () => void;
  presets?: TimeRangePresetOption[];
  refreshOptions?: TimeRangePresetOption[];
  timezoneOptions?: string[];
  labels?: Partial<TimeRangeControlLabels>;
  showAbsoluteFields?: boolean;
  variant?: TimeRangeControlVariant;
  presetSelectProps?: TimeRangeControlSelectProps;
  presetOptionDataAttribute?: string;
  refreshActionProps?: TimeRangeControlButtonProps;
};

export function TimeRangeControl({
  value,
  onApply,
  onRefresh,
  onReset,
  presets,
  refreshOptions = DEFAULT_REFRESH_OPTIONS,
  timezoneOptions = DEFAULT_TIMEZONE_OPTIONS,
  labels,
  className,
  showAbsoluteFields,
  presetSelectProps,
  presetOptionDataAttribute,
  refreshActionProps,
  variant = 'toolbar',
  ...rootProps
}: TimeRangeControlProps) {
  const mergedLabels = {
    ...DEFAULT_LABELS,
    ...labels,
    presets: {
      ...DEFAULT_LABELS.presets,
      ...labels?.presets
    }
  };
  const draftOptions = React.useMemo(
    () => ({ absolutePrecision: variant === 'narrow-rail' ? 'seconds' as const : 'milliseconds' as const }),
    [variant]
  );
  const [draft, setDraft] = React.useState(() => contextToDraft(value, draftOptions));
  const basePresets = (presets || buildTimeRangePresetOptions(mergedLabels.presets)).map(option => ({
    ...option,
    label: mergedLabels.presets[option.value as TimeContextPreset] || option.label
  }));
  const hasCustomAbsoluteRange = draft.timeRange === 'custom' && Boolean(draft.start && draft.end);
  const resolvedPresets = hasCustomAbsoluteRange && !basePresets.some(option => option.value === 'custom')
    ? [{ value: 'custom', label: mergedLabels.customRange }, ...basePresets]
    : basePresets;
  const isNarrowRail = variant === 'narrow-rail';

  React.useEffect(() => {
    setDraft(contextToDraft(value, draftOptions));
  }, [draftOptions, value]);

  const appliedSignature = stableContextSignature(value);
  const draftContext = draftToContext(draft);
  const draftSignature = stableContextSignature(draftContext);
  const dirty = draftSignature !== appliedSignature;
  const timezoneValues = Array.from(new Set(['', ...timezoneOptions, draft.tz].filter(value => value !== undefined)));
  const liveEnabled = draft.live === 'true';
  const hasRelativeDraft = Boolean(draft.relative);
  const hasAbsoluteDraft = Boolean(draft.start || draft.end);
  const shouldShowAbsoluteFields = Boolean(showAbsoluteFields) || hasAbsoluteDraft;
  const expandedDraftFields = hasRelativeDraft || shouldShowAbsoluteFields;
  const fieldFrameClass =
    isNarrowRail
      ? 'inline-flex h-8 min-w-0 flex-none items-center gap-1 rounded-[3px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-1.5 text-[12px] text-[var(--ops-text-secondary)]'
      : 'inline-flex h-8 min-w-0 items-center gap-1.5 rounded-[3px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] px-2 text-[12px] text-[var(--ops-text-secondary)]';
  const railSelectClass =
    cn(
      'h-7 min-w-0 border-0 bg-transparent px-1 py-0 pr-6 text-[12px] font-semibold text-[var(--ops-text-primary)] shadow-none hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0',
      isNarrowRail && 'text-[11px]'
    );
  const railInputClass =
    cn(
      'h-7 min-w-0 border-0 bg-transparent px-1 py-0 text-[12px] font-semibold shadow-none focus-visible:bg-transparent focus-visible:ring-0',
      isNarrowRail && 'text-[11px]'
    );
  const compactButtonClass =
    cn(
      'inline-flex h-8 flex-none items-center justify-center gap-1.5 rounded-[3px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-raised)] text-[12px] font-semibold text-[var(--ops-text-primary)] transition-colors hover:border-[var(--ops-border-strong)] hover:bg-[var(--ops-surface-panel)]',
      isNarrowRail ? 'px-2' : 'px-2.5'
    );
  const iconButtonClass =
    'inline-flex h-8 w-8 flex-none items-center justify-center rounded-[3px] border border-[var(--ops-border-color)] bg-transparent text-[var(--ops-text-secondary)] transition-colors hover:border-[var(--ops-border-strong)] hover:bg-[var(--ops-surface-panel)] hover:text-[var(--ops-text-primary)]';
  const rootClass = isNarrowRail
    ? 'inline-flex max-w-full flex-wrap items-center justify-end gap-1 overflow-hidden rounded-[3px] bg-transparent p-0'
    : 'inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-[3px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-2 py-1';
  const presetFrameClass = isNarrowRail ? 'w-[126px]' : 'w-[154px]';
  const presetSelectWidth = isNarrowRail ? 'w-[94px]' : 'w-[126px]';
  const absoluteFrameClass = isNarrowRail ? 'w-[312px] flex-none' : 'min-w-[260px] flex-[1_1_300px]';
  const refreshFrameClass = isNarrowRail ? 'w-[96px]' : 'w-[98px]';
  const refreshSelectWidth = isNarrowRail ? 'w-[64px]' : 'w-[64px]';
  const timezoneFrameClass = isNarrowRail ? 'w-[112px]' : 'w-[138px]';
  const timezoneSelectWidth = isNarrowRail ? 'w-[96px]' : 'w-[120px]';

  const setDraftField = (key: keyof typeof draft, nextValue: string) => {
    setDraft(current => ({ ...current, [key]: nextValue }));
  };

  return (
    <div
      {...rootProps}
      className={cn(
        rootClass,
        className
      )}
      data-hz-ui="time-range-control"
      data-hz-time-range-control-owner="hertzbeat-ui-time-range-control"
      data-time-range-control="hertzbeat-shared"
      data-time-range-control-labels={labels ? 'localized' : 'default'}
      data-time-range-control-visual={isNarrowRail ? 'grafana-like-narrow-rail' : 'hertzbeat-ui-operator-toolbar'}
      data-time-range-control-density={isNarrowRail ? 'narrow' : 'compact'}
      data-time-range-control-layout={isNarrowRail ? 'wrapping-top-right-rail' : 'single-row-rail'}
      data-time-range-control-align={isNarrowRail ? 'end' : 'natural'}
      data-time-range-control-wrap="wrap"
      data-time-range-control-card={isNarrowRail ? 'false' : 'true'}
      data-time-range-control-overflow="contained-wrap"
      data-time-range-control-absolute-display={isNarrowRail ? 'local-seconds' : 'local-milliseconds'}
      data-time-range-control-field-labels="sr-only"
      data-time-range-control-manual-entry={showAbsoluteFields ? 'visible' : 'draft-only'}
      data-time-range-control-absolute-draft={hasAbsoluteDraft ? 'visible' : showAbsoluteFields ? 'ready' : 'empty'}
      data-time-range-control-default-fields={expandedDraftFields ? 'expanded' : 'collapsed'}
      data-time-range-control-state={dirty ? 'draft' : 'applied'}
    >
      <label className={cn(fieldFrameClass, presetFrameClass)}>
        <span className="sr-only">{mergedLabels.preset}</span>
        <Clock3 aria-hidden="true" className="h-3.5 w-3.5 flex-none" />
        <Select
          aria-label={mergedLabels.preset}
          value={draft.timeRange}
          containerClassName={presetSelectWidth}
          className={railSelectClass}
          data-time-range-preset-select="true"
          onChange={event => {
            setDraft(current => ({ ...current, timeRange: event.target.value, relative: '' }));
          }}
          {...presetSelectProps}
        >
          {resolvedPresets.map(option => {
            const optionProps = presetOptionDataAttribute ? { [presetOptionDataAttribute]: option.value } : {};
            return (
              <option key={option.value} value={option.value} data-time-range-preset-option={option.value} {...optionProps}>
                {option.label}
              </option>
            );
          })}
        </Select>
      </label>

      {hasRelativeDraft ? (
        <label className={cn(fieldFrameClass, 'w-[82px]')}>
          <span className="sr-only">{mergedLabels.relative}</span>
          <Input
            aria-label={mergedLabels.relative}
            value={draft.relative}
            placeholder={mergedLabels.relativePlaceholder}
            className={railInputClass}
            data-time-range-relative-input="true"
            onChange={event => setDraftField('relative', event.target.value)}
            onInput={event => setDraftField('relative', event.currentTarget.value)}
          />
        </label>
      ) : null}

      {shouldShowAbsoluteFields ? (
        <div
          className={cn(fieldFrameClass, absoluteFrameClass)}
          data-time-range-absolute-inputs={hasAbsoluteDraft ? 'compact' : 'manual-entry'}
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">{mergedLabels.start}</span>
            <Input
              aria-label={mergedLabels.start}
              value={draft.start}
              placeholder={mergedLabels.start}
              inputMode="text"
              className={cn(railInputClass, 'font-mono text-[11px]')}
              data-time-range-start-input="true"
              data-time-range-absolute-input-format="local-datetime"
              onChange={event => setDraftField('start', event.target.value)}
              onInput={event => setDraftField('start', event.currentTarget.value)}
            />
          </label>
          <span aria-hidden="true" className="flex-none text-[var(--ops-text-tertiary)]">
            →
          </span>
          <label className="min-w-0 flex-1">
            <span className="sr-only">{mergedLabels.end}</span>
            <Input
              aria-label={mergedLabels.end}
              value={draft.end}
              placeholder={mergedLabels.end}
              inputMode="text"
              className={cn(railInputClass, 'font-mono text-[11px]')}
              data-time-range-end-input="true"
              data-time-range-absolute-input-format="local-datetime"
              onChange={event => setDraftField('end', event.target.value)}
              onInput={event => setDraftField('end', event.currentTarget.value)}
            />
          </label>
        </div>
      ) : null}

      <label className={cn(fieldFrameClass, refreshFrameClass)} data-time-range-refresh-field-fit="full-manual-label">
        <span className="sr-only">{mergedLabels.refresh}</span>
        <RefreshCw aria-hidden="true" className="h-3.5 w-3.5 flex-none" />
        <Select
          aria-label={mergedLabels.refresh}
          value={draft.refresh}
          containerClassName={refreshSelectWidth}
          className={railSelectClass}
          data-time-range-refresh-select="true"
          onChange={event => setDraftField('refresh', event.target.value)}
        >
          {refreshOptions.map(option => (
            <option key={option.value || 'manual'} value={option.value}>
              {option.label || mergedLabels.manualRefresh}
            </option>
          ))}
        </Select>
      </label>

      <label className={cn(fieldFrameClass, timezoneFrameClass)}>
        <span className="sr-only">{mergedLabels.timezone}</span>
        <Select
          aria-label={mergedLabels.timezone}
          value={draft.tz}
          containerClassName={timezoneSelectWidth}
          className={railSelectClass}
          data-time-range-timezone-select="true"
          onChange={event => setDraftField('tz', event.target.value)}
        >
          {timezoneValues.map(option => (
            <option key={option} value={option}>
              {option || mergedLabels.localTimezone}
            </option>
          ))}
        </Select>
      </label>

      <button
        type="button"
        className={compactButtonClass}
        aria-label={liveEnabled ? mergedLabels.liveOn : mergedLabels.liveOff}
        aria-pressed={liveEnabled}
        data-time-range-live-toggle={liveEnabled ? 'live' : 'paused'}
        onClick={() => setDraftField('live', liveEnabled ? 'false' : 'true')}
      >
        {liveEnabled ? <Pause aria-hidden="true" className="h-3.5 w-3.5" /> : <Play aria-hidden="true" className="h-3.5 w-3.5" />}
        {mergedLabels.live}
      </button>

      <button
        type="button"
        className={cn(compactButtonClass, 'border-[var(--ops-border-strong)] bg-[var(--ops-surface-panel)] px-3')}
        aria-label={mergedLabels.applyAria}
        data-time-range-apply-action="true"
        data-time-range-apply-visual="neutral-query-action"
        onClick={() => onApply(draftContext)}
      >
        <Play aria-hidden="true" className="h-3.5 w-3.5" />
        {mergedLabels.apply}
      </button>

      {onRefresh ? (
        <button
          type="button"
          className={iconButtonClass}
          aria-label={mergedLabels.refreshAction}
          title={mergedLabels.refreshAction}
          data-time-range-refresh-action="true"
          onClick={onRefresh}
          {...refreshActionProps}
        >
          <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      ) : null}

      <button
        type="button"
        className={iconButtonClass}
        aria-label={mergedLabels.resetAria}
        title={mergedLabels.resetAria}
        data-time-range-reset-action="true"
        onClick={() => {
          setDraft(contextToDraft(value, draftOptions));
          onReset?.();
        }}
      >
        <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
