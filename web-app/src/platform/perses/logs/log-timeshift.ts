/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';
import type { ExactTimeWindow } from '@/shared/query-context';
const LOG_COMPARISON_TIME_SHIFTS = [3600000, 86400000, 604800000] as const;
export const logTimeShiftSchema = z.number().refine(value => LOG_COMPARISON_TIME_SHIFTS.some(shift => shift === value));
export function shiftedLogWindow(window: ExactTimeWindow, shift?: number): ExactTimeWindow | undefined {
  if (shift !== undefined && !logTimeShiftSchema.safeParse(shift).success) return undefined;
  const from = window.from - (shift ?? 0),
    to = window.to - (shift ?? 0);
  return Number.isSafeInteger(from) && Number.isSafeInteger(to) && from > 0 && to > from ? { from, to } : undefined;
}
export function validComparisonSourceWindows(result: {
  window: { start: number; end: number };
  bWindow?: { start: number; end: number } | undefined;
  bTimeShiftMs?: number | undefined;
}) {
  if (result.bTimeShiftMs === undefined) return result.bWindow === undefined;
  const shifted = shiftedLogWindow({ from: result.window.start, to: result.window.end }, result.bTimeShiftMs);
  return shifted !== undefined && result.bWindow?.start === shifted.from && result.bWindow.end === shifted.to;
}
