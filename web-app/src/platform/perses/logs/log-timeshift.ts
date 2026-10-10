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
