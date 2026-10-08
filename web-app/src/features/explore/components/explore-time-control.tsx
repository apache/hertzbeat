/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { DatePicker, Button } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { formatInTimeZone } from 'date-fns-tz';
import type { TFunction } from 'i18next';
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { type SharedTimeValue } from '@/shared/time';
import { parseWallTime, inputFormat } from '../model/explore-time-input';
import {
  exactTimeRangePatch,
  presetTimeRangePatch,
  timeRangeMilliseconds,
  type ExploreQuery,
  type ExploreQueryPatch,
  type ExploreTimeRange,
  type LogExploreQuery
} from '../model/explore-model';
import { logResumeRefreshInterval, positiveRefreshInterval, fixedLogWindow } from '../model/explore-log-window-state';
import styles from './explore-time-control.module.css';
import { TimePresets } from './explore-time-presets';
import { LogTimeZoneLabel } from './explore-log-time-zone-label';

type Props = {
  query: ExploreQuery;
  t: TFunction;
  updateScope: (patch: ExploreQueryPatch) => void;
  time?: SharedTimeValue | null | undefined;
};
type Range = [Dayjs | null, Dayjs | null];
const dayjsFormat = 'YYYY-MM-DDTHH:mm:ss.SSS';

function initialWindow(query: ExploreQuery, time?: SharedTimeValue | null) {
  const to = time?.window?.to ?? Date.now();
  return query.start != null && query.end != null
    ? { from: query.start, to: query.end }
    : { from: to - timeRangeMilliseconds(query.timeRange), to };
}
function wallRange(window: { from: number; to: number }, zone: string): Range {
  return [
    dayjs(formatInTimeZone(window.from, zone, inputFormat)),
    dayjs(formatInTimeZone(window.to, zone, inputFormat))
  ];
}

function useRangeInput(original: { from: number; to: number }, zone: string, setError: (value: boolean) => void) {
  const draft = useRef<Range>(wallRange(original, zone));
  const invalid = useRef<[boolean, boolean]>([false, false]);
  const active = useRef<'start' | 'end'>('start');
  const reset = (window: typeof original) => {
    draft.current = wallRange(window, zone);
    invalid.current = [false, false];
  };
  const calendarChange = (range: Range, bound?: 'start' | 'end') => {
    draft.current = range;
    if (bound) invalid.current[bound === 'start' ? 0 : 1] = false;
    setError(false);
  };
  const input = (text: string) => {
    const index = active.current === 'start' ? 0 : 1;
    const instant = parseWallTime(text.replace(' ', 'T'), zone, index ? original.to : original.from);
    invalid.current[index] = !Number.isFinite(instant);
    if (invalid.current[index]) return;
    const value = draft.current[index];
    draft.current[index] =
      value?.format('YYYY-MM-DD HH:mm:ss') === text ? value : wallRange({ from: instant, to: instant }, zone)[0];
    setError(false);
  };
  return {
    getDraft: () => draft.current,
    hasInvalid: () => invalid.current.some(Boolean),
    setActive: (bound: 'start' | 'end') => {
      active.current = bound;
    },
    reset,
    calendarChange,
    input
  };
}

export function ExploreTimeControl(props: Props) {
  const zone = props.query.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { start, end, timeRange } = props.query;
  const resumeIntervalRef = useRef(
    positiveRefreshInterval(props.query.autoRefreshMs) ?? positiveRefreshInterval(props.time?.autoRefreshMs) ?? 30_000
  );
  return (
    <div className={styles.timeWithZone} data-explore-time-part="zone-group">
      <TimeRangePicker
        key={`${start}/${end}/${timeRange}/${zone}`}
        {...props}
        zone={zone}
        resumeIntervalRef={resumeIntervalRef}
      />
    </div>
  );
}

function useTimeEditor({ query, time, zone, updateScope }: Props & { zone: string }) {
  const [fallback, setFallback] = useState(() => initialWindow(query, time));
  const [original, setOriginal] = useState(fallback);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const range = useRangeInput(original, zone, setError);
  const [reset, setReset] = useState(0);
  const visible = open ? original : time?.window ? initialWindow(query, time) : fallback;
  const close = () => {
    setFallback(original);
    setOpen(false);
    setError(false);
    range.reset(original);
    setReset(value => value + 1);
  };
  const openEditor = () => {
    const next = initialWindow(query, time);
    setOriginal(next);
    range.reset(next);
    setError(false);
    setOpen(true);
  };
  const apply = () => {
    const draft = range.getDraft();
    if (range.hasInvalid()) return setError(true);
    if (!draft?.[0] || !draft[1]) return;
    const patch = exactTimeRangePatch(
      {
        from: parseWallTime(draft[0].format(dayjsFormat), zone, original.from),
        to: parseWallTime(draft[1].format(dayjsFormat), zone, original.to)
      },
      zone
    );
    if (!patch) {
      setError(true);
      return;
    }
    updateScope(patch);
    close();
  };
  const preset = (range: ExploreTimeRange) => {
    updateScope(presetTimeRangePatch(query, range));
    close();
  };
  return { visible, reset, open, error, close, openEditor, apply, preset, range };
}

function TimeRangePicker(props: Props & { zone: string; resumeIntervalRef: MutableRefObject<number> }) {
  const { query, t, zone } = props;
  const editor = useTimeEditor(props);
  const relative = query.start == null || query.end == null;
  return (
    <div
      className={styles.control}
      data-explore-time-part="range"
      onChangeCapture={event => {
        if (event.target instanceof HTMLInputElement) editor.range.input(event.target.value);
      }}
    >
      <span className={styles.relativeLabel} data-explore-time-part="preset">
        {relative ? t(`explore.timeRanges.${query.timeRange}`) : t('explore.timeRange')}
      </span>
      <LogTimeZoneLabel zone={zone} window={editor.visible} t={t} />
      <DatePicker.RangePicker
        key={`${editor.visible.from}/${editor.visible.to}/${editor.reset}`}
        popupAlign={{ offset: [0, 0], overflow: { adjustX: true, adjustY: true, shiftX: true, shiftY: true } }}
        aria-label={t('explore.timeRange')}
        aria-invalid={editor.error}
        className={styles.picker ?? ''}
        classNames={{ popup: { root: styles.popup ?? '' } }}
        format="YYYY-MM-DD HH:mm:ss"
        showTime={{ format: 'HH:mm:ss' }}
        disabledDate={(current, info) => {
          return Boolean(info.from && Math.abs(current.startOf('day').diff(info.from.startOf('day'), 'day')) > 1);
        }}
        needConfirm={false}
        allowClear={false}
        preserveInvalidOnBlur
        status={editor.error ? 'error' : ''}
        defaultValue={wallRange(editor.visible, zone)}
        open={editor.open}
        onOpenChange={next => {
          if (next && !editor.open) editor.openEditor();
          if (!next) editor.close();
        }}
        onCalendarChange={(range, _, info) => editor.range.calendarChange(range, info.range)}
        onFocus={(_, info) => {
          if (info.range) editor.range.setActive(info.range);
        }}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        renderExtraFooter={() => (
          <TimePresets
            query={query}
            t={t}
            zone={zone}
            choose={editor.preset}
            cancel={editor.close}
            apply={editor.apply}
            error={editor.error}
          />
        )}
      />
      {query.signal === 'logs' && <LogWindowControls {...props} query={query} />}
    </div>
  );
}

function LogWindowControls({
  query,
  time,
  updateScope,
  resumeIntervalRef,
  t
}: Omit<Props, 'query'> & { query: LogExploreQuery; resumeIntervalRef: MutableRefObject<number> }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = globalThis.setInterval(update, 60_000);
    return () => globalThis.clearInterval(timer);
  }, []);
  const fixed = fixedLogWindow(query);
  const window = fixed ?? initialWindow(query, time);
  const duration = window.to - window.from;
  const zone = query.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const move = (direction: -1 | 1) => {
    const patch = shiftedWindowPatch(window, duration, direction, zone);
    if (patch) updateScope(patch);
  };
  const play = () =>
    updateScope({
      ...presetTimeRangePatch(query, query.timeRange),
      autoRefreshMs: resumeIntervalRef.current
    });
  const pause = () => {
    resumeIntervalRef.current = logResumeRefreshInterval(query, time, resumeIntervalRef.current);
    const patch = exactTimeRangePatch(window, zone);
    if (patch) updateScope(patch);
  };
  const paused = fixed != null;
  let actionLabel = t('explore.timeControl.pause');
  if (paused) {
    actionLabel =
      duration === timeRangeMilliseconds(query.timeRange)
        ? t('explore.timeControl.play')
        : t('explore.timeControl.playPreset', { range: t(`explore.timeRanges.${query.timeRange}`) });
  }
  return (
    <div className={styles.windowControls} role="group" aria-label={t('explore.timeControl.windowNavigation')}>
      <Button size="small" aria-label={t('explore.timeControl.previousWindow')} onClick={() => move(-1)}>
        <LeftOutlined aria-hidden />
      </Button>
      <Button size="small" onClick={paused ? play : pause}>
        {actionLabel}
      </Button>
      <Button
        size="small"
        aria-label={t('explore.timeControl.nextWindow')}
        disabled={!paused || window.to + duration > now}
        onClick={() => move(1)}
      >
        <RightOutlined aria-hidden />
      </Button>
    </div>
  );
}

function shiftedWindowPatch(
  window: { from: number; to: number },
  duration: number,
  direction: -1 | 1,
  timeZone: string
) {
  return exactTimeRangePatch(
    { from: window.from + direction * duration, to: window.to + direction * duration },
    timeZone
  );
}
