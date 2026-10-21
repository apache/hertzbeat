/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import dayjs, { type Dayjs } from 'dayjs';
import { formatInTimeZone } from 'date-fns-tz';
import { useRef, useState } from 'react';
import { parseWallTime, inputFormat } from '../model/explore-time-input';
import {
  exactTimeRangePatch,
  presetTimeRangePatch,
  timeRangeMilliseconds,
  type ExploreQuery,
  type ExploreTimeRange
} from '../model/explore-model';
import type { SharedTimeValue } from '@/shared/time';
import type { ExploreTimeControlProps } from './explore-time-control-contract';

type Range = [Dayjs | null, Dayjs | null];
const dayjsFormat = 'YYYY-MM-DDTHH:mm:ss.SSS';

export function initialWindow(query: ExploreQuery, time?: SharedTimeValue | null) {
  const to = time?.window?.to ?? Date.now();
  return query.start != null && query.end != null
    ? { from: query.start, to: query.end }
    : { from: to - timeRangeMilliseconds(query.timeRange), to };
}
export function wallRange(window: { from: number; to: number }, zone: string): Range {
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

export function useTimeEditor({ query, time, zone, updateScope }: ExploreTimeControlProps & { zone: string }) {
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
