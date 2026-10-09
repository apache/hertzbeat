/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ExactTimeWindow } from '@/shared/query-context';

export const METRIC_TIME_SHIFT_OPTIONS = [
  { value: 0, label: '0 s' },
  { value: 3_600, label: '1 h' },
  { value: 86_400, label: '1 d' },
  { value: 604_800, label: '7 d' },
  { value: 2_592_000, label: '30 d' }
] as const;

export function shiftedMetricWindow(window: ExactTimeWindow, timeShiftSeconds = 0): ExactTimeWindow | null {
  const offsetMs = timeShiftSeconds * 1000;
  const shifted = { from: window.from - offsetMs, to: window.to - offsetMs };
  return shifted.from >= 0 ? shifted : null;
}
