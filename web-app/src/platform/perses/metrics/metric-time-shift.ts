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
