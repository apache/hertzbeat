import * as React from 'react';
import { createPortal } from 'react-dom';
import ReactDatePicker, { registerLocale } from 'react-datepicker';
import { zhCN } from 'date-fns/locale/zh-CN';
import { ArrowRight } from 'lucide-react';
import { SUPPLEMENTAL_MESSAGES } from '../../lib/i18n-runtime-messages';
import { cn } from '../../lib/utils';
import { HiddenInput } from './hidden-input';

export interface DateTimeRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  mode: 'datetime-local' | 'time';
  startName: string;
  endName: string;
  startValue: string;
  endValue: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  startLabel?: string;
  endLabel?: string;
  emptyLabel?: string;
  hourLabel?: string;
  minuteLabel?: string;
  previousMonthLabel?: string;
  nextMonthLabel?: string;
  clearLabel?: string;
  confirmLabel?: string;
  reserveActionSpace?: boolean;
}

type PickerTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  displayValue: string;
  empty: boolean;
  expanded: boolean;
};

const PICKER_PANEL_WIDTH = 392;
const PICKER_PANEL_HEIGHT = 318;
const PICKER_PANEL_OFFSET = 6;
const PICKER_VIEWPORT_PADDING = 12;
const TIME_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const TIME_MINUTES = Array.from({ length: 60 }, (_, minute) => minute);

registerLocale('zh-CN', zhCN);

function translateDateTimeRange(key: string) {
  return SUPPLEMENTAL_MESSAGES['en-US']?.[key] ?? SUPPLEMENTAL_MESSAGES['zh-CN']?.[key] ?? key;
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function parseDateTimeValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match.map(Number);
  const parsed = new Date(year, month - 1, day, hour, minute);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseTimeValue(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, hour, minute] = match.map(Number);
  const parsed = new Date(2000, 0, 1, hour, minute);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseValue(mode: DateTimeRangeProps['mode'], value: string) {
  if (!value) return null;
  return mode === 'time' ? parseTimeValue(value) : parseDateTimeValue(value);
}

function formatFromDate(mode: DateTimeRangeProps['mode'], date: Date | null) {
  if (!date) return '';
  if (mode === 'time') {
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  }
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatWithTime(mode: DateTimeRangeProps['mode'], value: string, hour: number, minute: number) {
  const parsed = parseValue(mode, value);
  const base = parsed ?? (mode === 'time' ? new Date(2000, 0, 1, 0, 0) : new Date());
  base.setHours(hour, minute, 0, 0);
  return formatFromDate(mode, base);
}

function formatDateChange(mode: DateTimeRangeProps['mode'], value: string, nextDate: Date | null) {
  if (!nextDate) return '';
  const parsed = parseValue(mode, value);
  const hour = parsed?.getHours() ?? nextDate.getHours();
  const minute = parsed?.getMinutes() ?? nextDate.getMinutes();
  nextDate.setHours(hour, minute, 0, 0);
  return formatFromDate(mode, nextDate);
}

function formatValue(mode: DateTimeRangeProps['mode'], value: string, emptyLabel: string) {
  if (!value) return emptyLabel;
  return mode === 'time' ? value.slice(0, 5) : value.replace('T', ' ');
}

function getTimeParts(mode: DateTimeRangeProps['mode'], value: string) {
  const parsed = parseValue(mode, value);
  return {
    hour: parsed?.getHours() ?? 0,
    minute: parsed?.getMinutes() ?? 0
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPickerPanelPosition(trigger: HTMLElement) {
  if (typeof window === 'undefined') {
    return { left: PICKER_VIEWPORT_PADDING, top: PICKER_VIEWPORT_PADDING };
  }

  const rect = trigger.getBoundingClientRect();
  const maxLeft = Math.max(PICKER_VIEWPORT_PADDING, window.innerWidth - PICKER_PANEL_WIDTH - PICKER_VIEWPORT_PADDING);
  const left = clamp(rect.left, PICKER_VIEWPORT_PADDING, maxLeft);
  const belowTop = rect.bottom + PICKER_PANEL_OFFSET;
  const aboveTop = rect.top - PICKER_PANEL_HEIGHT - PICKER_PANEL_OFFSET;
  const top = belowTop + PICKER_PANEL_HEIGHT > window.innerHeight - PICKER_VIEWPORT_PADDING && aboveTop > PICKER_VIEWPORT_PADDING
    ? aboveTop
    : belowTop;

  return { left, top: Math.max(PICKER_VIEWPORT_PADDING, top) };
}

const PickerTrigger = React.forwardRef<HTMLButtonElement, PickerTriggerProps>(function PickerTrigger(
  { displayValue, empty, expanded, className, value: _value, ...props },
  ref
) {
  return (
    <button
      {...props}
      ref={ref}
      type="button"
      data-cold-date-time-picker-trigger="true"
      aria-expanded={expanded}
      className={cn(
        'h-8 w-full rounded-[3px] border border-[#2b3039] bg-[#101217] px-3 text-left text-[12px] font-semibold text-[#dbe4f0] outline-none transition-colors hover:border-[#3b4454] hover:bg-[#151b28] focus-visible:border-[#4e74f8] focus-visible:ring-2 focus-visible:ring-[rgba(78,116,248,0.12)]',
        className
      )}
    >
      <span className={empty ? 'text-[#7e8494]' : undefined}>{displayValue}</span>
    </button>
  );
});

function TimeColumn({
  label,
  values,
  selectedValue,
  onSelect,
  column
}: {
  label: string;
  values: number[];
  selectedValue: number;
  onSelect: (value: number) => void;
  column: 'hour' | 'minute';
}) {
  return (
    <div className="min-w-0 flex-1 border-l border-[#252b34] bg-[#101217] first:border-l-0" data-cold-time-column={column}>
      <div className="grid h-9 place-items-center border-b border-[#252b34] px-2 text-center text-[12px] font-semibold text-[#9aa5b6]">
        {label}
      </div>
      <div className="hertzbeat-time-column-scroll max-h-[168px] overflow-x-hidden overflow-y-auto p-1">
        {values.map(value => {
          const selected = value === selectedValue;
          return (
            <button
              key={value}
              type="button"
              data-cold-time-column-option={column}
              data-selected={selected ? 'true' : undefined}
              aria-label={`${label}${pad2(value)}`}
              className={cn(
                'mb-1 grid h-6 w-full place-items-center rounded-[3px] border px-1 text-center text-[12px] font-semibold leading-none tabular-nums transition last:mb-0',
                selected
                  ? 'border-[#5d76d9] bg-[#17223a] text-[#edf3ff]'
                  : 'border-transparent bg-transparent text-[#9aa5b6] hover:border-[#394150] hover:bg-[#101722] hover:text-[#dbe4f0]'
              )}
              onClick={() => onSelect(value)}
            >
              {pad2(value)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimeColumns({
  mode,
  value,
  onChange,
  hourLabel,
  minuteLabel
}: {
  mode: DateTimeRangeProps['mode'];
  value: string;
  onChange: (value: string) => void;
  hourLabel: string;
  minuteLabel: string;
}) {
  const { hour, minute } = getTimeParts(mode, value);
  return (
    <div
      data-cold-date-time-picker-time-columns="hour-minute"
      className={cn(
        'overflow-hidden border-[#252b34] bg-[#101217]',
        mode === 'time' ? 'grid w-full grid-cols-2' : 'grid w-[132px] shrink-0 grid-cols-2 md:border-l'
      )}
    >
      <TimeColumn
        label={hourLabel}
        column="hour"
        values={TIME_HOURS}
        selectedValue={hour}
        onSelect={nextHour => onChange(formatWithTime(mode, value, nextHour, minute))}
      />
      <TimeColumn
        label={minuteLabel}
        column="minute"
        values={TIME_MINUTES}
        selectedValue={minute}
        onSelect={nextMinute => onChange(formatWithTime(mode, value, hour, nextMinute))}
      />
    </div>
  );
}

type ColdDateTimePickerProps = {
  mode: DateTimeRangeProps['mode'];
  name: string;
  value: string;
  label: string;
  onChange: (value: string) => void;
  emptyLabel: string;
  hourLabel: string;
  minuteLabel: string;
  previousMonthLabel: string;
  nextMonthLabel: string;
  clearLabel: string;
  confirmLabel: string;
};

function ColdDateTimePicker({
  mode,
  name,
  value,
  label,
  onChange,
  emptyLabel,
  hourLabel,
  minuteLabel,
  previousMonthLabel,
  nextMonthLabel,
  clearLabel,
  confirmLabel
}: ColdDateTimePickerProps) {
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [draftValue, setDraftValue] = React.useState(value);
  const selected = React.useMemo(() => parseValue(mode, draftValue), [draftValue, mode]);
  const [panelPosition, setPanelPosition] = React.useState(() => ({
    left: PICKER_VIEWPORT_PADDING,
    top: PICKER_VIEWPORT_PADDING
  }));

  const updatePanelPosition = React.useCallback(() => {
    if (!triggerRef.current) return;
    setPanelPosition(getPickerPanelPosition(triggerRef.current));
  }, []);

  React.useEffect(() => {
    if (!open) {
      setDraftValue(value);
    }
  }, [open, value]);

  React.useEffect(() => {
    if (!open) return undefined;
    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);

    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [open, updatePanelPosition]);

  function openPicker() {
    setDraftValue(value);
    updatePanelPosition();
    setOpen(true);
  }

  function clearValue() {
    setDraftValue('');
    onChange('');
    setOpen(false);
  }

  function confirmValue() {
    onChange(draftValue);
    setOpen(false);
  }

  const panel = (
    <div
      data-cold-date-time-picker-panel="body-fixed-clear-confirm"
      data-cold-date-time-picker-portal="body"
      className={cn(
        'hertzbeat-date-picker-panel fixed z-[80] box-border overflow-x-hidden overflow-y-hidden rounded-[4px] border border-[#2b3039] bg-[#101217] shadow-[0_18px_48px_rgba(0,0,0,0.45)] max-h-[calc(100vh-24px)]',
        mode === 'time' ? 'w-[220px]' : 'w-[392px]'
      )}
      style={{ left: panelPosition.left, top: panelPosition.top }}
    >
      <div
        data-cold-date-time-picker-surface="flat-calendar-time"
        data-cold-date-time-picker-layout={mode === 'time' ? 'time-columns' : 'calendar-time-columns'}
        className={cn('min-w-0', mode === 'time' ? 'block' : 'grid grid-cols-[258px_132px]')}
      >
        {mode === 'time' ? null : (
          <div data-cold-date-time-picker-calendar-shell="fixed-calendar" className="w-[258px] shrink-0 overflow-hidden bg-[#101217]">
            <ReactDatePicker
              selected={selected}
              onChange={next => setDraftValue(formatDateChange(mode, draftValue, next))}
              inline
              locale="zh-CN"
              previousMonthButtonLabel={previousMonthLabel}
              nextMonthButtonLabel={nextMonthLabel}
              previousMonthAriaLabel={previousMonthLabel}
              nextMonthAriaLabel={nextMonthLabel}
              calendarClassName="hertzbeat-date-picker-calendar"
              shouldCloseOnSelect={false}
              dateFormat="yyyy-MM-dd HH:mm"
              calendarStartDay={1}
            />
          </div>
        )}
        <TimeColumns
          mode={mode}
          value={draftValue}
          onChange={setDraftValue}
          hourLabel={hourLabel}
          minuteLabel={minuteLabel}
        />
      </div>
        <div data-cold-date-time-picker-panel="body-portal-clear-confirm" className="flex justify-end gap-2 border-t border-[#252b34] p-3">
          <button
            type="button"
            data-cold-date-time-picker-action="clear"
            className="h-7 min-w-[58px] rounded-[3px] border border-[#2b3039] bg-[#0d1015] px-2 text-[12px] font-semibold text-[#a9b0bb] hover:border-[#3b4454] hover:text-[#dbe4f0]"
            onClick={clearValue}
          >
            {clearLabel}
          </button>
          <button
            type="button"
            data-cold-date-time-picker-action="confirm"
            className="h-7 min-w-[58px] rounded-[3px] border border-[#31405c] bg-[#182238] px-2 text-[12px] font-semibold text-[#d8e4ff] hover:border-[#4e74f8]"
            onClick={confirmValue}
          >
            {confirmLabel}
          </button>
        </div>
    </div>
  );

  return (
    <span
      data-cold-date-time-picker-owner="cold-date-time-picker"
      data-cold-date-time-picker-library="react-datepicker"
      className="inline-flex min-w-[180px] flex-1"
    >
      <HiddenInput data-cold-date-time-picker-input="hidden-value" name={name} value={value} />
      <PickerTrigger
        ref={triggerRef}
        displayValue={formatValue(mode, open ? draftValue : value, emptyLabel)}
        empty={!(open ? draftValue : value)}
        expanded={open}
        aria-label={label}
        onClick={openPicker}
      />
      {open && typeof document !== 'undefined' ? createPortal(panel, document.body) : null}
    </span>
  );
}

export function DateTimeRange({
  mode,
  startName,
  endName,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  startLabel = translateDateTimeRange('time.range.start'),
  endLabel = translateDateTimeRange('time.range.end'),
  emptyLabel = translateDateTimeRange('time.range.unset'),
  hourLabel = translateDateTimeRange('time.range.hour'),
  minuteLabel = translateDateTimeRange('time.range.minute'),
  previousMonthLabel = translateDateTimeRange('time.range.previous-month'),
  nextMonthLabel = translateDateTimeRange('time.range.next-month'),
  clearLabel = translateDateTimeRange('common.clear'),
  confirmLabel = translateDateTimeRange('common.button.ok'),
  reserveActionSpace,
  className,
  ...props
}: DateTimeRangeProps) {
  const ownerAttribute = mode === 'time'
    ? { 'data-cold-time-range-owner': 'cold-time-range' }
    : { 'data-cold-date-time-range-owner': 'cold-date-time-range' };

  return (
    <div
      {...ownerAttribute}
      data-cold-date-time-range-shell="unframed-inline"
      data-cold-date-time-range-action-space={reserveActionSpace ? 'reserved' : undefined}
      className={cn(
        reserveActionSpace
          ? 'grid w-full min-w-0 grid-cols-[minmax(0,1fr)_14px_minmax(0,1fr)_76px] items-center gap-2'
          : 'flex min-w-0 flex-wrap items-center gap-2',
        className
      )}
      {...props}
    >
      <ColdDateTimePicker
        mode={mode}
        name={startName}
        value={startValue}
        label={startLabel}
        onChange={onStartChange}
        emptyLabel={emptyLabel}
        hourLabel={hourLabel}
        minuteLabel={minuteLabel}
        previousMonthLabel={previousMonthLabel}
        nextMonthLabel={nextMonthLabel}
        clearLabel={clearLabel}
        confirmLabel={confirmLabel}
      />
      <ArrowRight className="mx-auto h-3.5 w-3.5 shrink-0 text-[#7e8494]" aria-hidden="true" />
      <ColdDateTimePicker
        mode={mode}
        name={endName}
        value={endValue}
        label={endLabel}
        onChange={onEndChange}
        emptyLabel={emptyLabel}
        hourLabel={hourLabel}
        minuteLabel={minuteLabel}
        previousMonthLabel={previousMonthLabel}
        nextMonthLabel={nextMonthLabel}
        clearLabel={clearLabel}
        confirmLabel={confirmLabel}
      />
      {reserveActionSpace ? <span data-cold-date-time-range-reserved-action="true" aria-hidden="true" /> : null}
    </div>
  );
}
