/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ParamMap } from '@angular/router';

export interface SignalTimeContext {
  start?: number;
  end?: number;
}

export type SignalTimePreset = '15m' | '30m' | '1h' | '3h' | '6h' | '12h' | '24h' | '7d';

export const SIGNAL_TIME_PRESETS: ReadonlyArray<{ value: SignalTimePreset; durationMs: number }> = [
  { value: '15m', durationMs: 15 * 60_000 },
  { value: '30m', durationMs: 30 * 60_000 },
  { value: '1h', durationMs: 60 * 60_000 },
  { value: '3h', durationMs: 3 * 60 * 60_000 },
  { value: '6h', durationMs: 6 * 60 * 60_000 },
  { value: '12h', durationMs: 12 * 60 * 60_000 },
  { value: '24h', durationMs: 24 * 60 * 60_000 },
  { value: '7d', durationMs: 7 * 24 * 60 * 60_000 }
];

export function readSignalTimeRange(params: ParamMap, defaultDurationMs = 30 * 60_000): Date[] {
  const end = Number(params.get('end')) || Date.now();
  const start = Number(params.get('start')) || end - defaultDurationMs;
  return [new Date(start), new Date(end)];
}

export function toSignalTimeContext(timeRange?: Date[]): SignalTimeContext {
  return {
    start: timeRange?.[0]?.getTime(),
    end: timeRange?.[1]?.getTime()
  };
}

export function moveSignalTimeRangeToNow(timeRange: Date[], now = Date.now(), defaultDurationMs = 30 * 60_000): Date[] {
  const duration = Math.max(1, (timeRange[1]?.getTime() || now) - (timeRange[0]?.getTime() || now - defaultDurationMs));
  return [new Date(now - duration), new Date(now)];
}

export function createSignalTimePreset(preset: SignalTimePreset, now = Date.now()): Date[] {
  const duration = SIGNAL_TIME_PRESETS.find(item => item.value === preset)?.durationMs || 30 * 60_000;
  return [new Date(now - duration), new Date(now)];
}

export function detectSignalTimePreset(timeRange: Date[], now = Date.now(), liveToleranceMs = 60_000): SignalTimePreset | 'custom' {
  const duration = (timeRange[1]?.getTime() || 0) - (timeRange[0]?.getTime() || 0);
  if (Math.abs(now - (timeRange[1]?.getTime() || 0)) > liveToleranceMs) return 'custom';
  return SIGNAL_TIME_PRESETS.find(item => item.durationMs === duration)?.value || 'custom';
}

export function shiftSignalTimeRange(timeRange: Date[], direction: -1 | 1, now = Date.now()): Date[] {
  const start = timeRange[0]?.getTime() || now - 30 * 60_000;
  const end = timeRange[1]?.getTime() || now;
  const duration = Math.max(1, end - start);
  if (direction < 0) {
    return [new Date(start - duration), new Date(end - duration)];
  }
  const nextEnd = Math.min(now, end + duration);
  return [new Date(nextEnd - duration), new Date(nextEnd)];
}
