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

import { linkLogArrival } from '@/shared/log-arrival';
import { createGlobalTimeState, updateGlobalRange, globalTimeWindow, type GlobalTimeRange } from '@/shared/time';
import type { LiveLogRow, LogRow } from './explore-signal-contract';
import type { LogExploreQuery } from './explore-query';
import { logTimestampMs } from './explore-signal-model';
export function liveTraceWindow(range: LogExploreQuery['timeRange'], row: LogRow, selectedAt: number) {
  const end = Math.max(selectedAt, logTimestampMs(row) ?? selectedAt);
  return globalTimeWindow(updateGlobalRange(createGlobalTimeState(end), range.slice(5) as GlobalTimeRange, end));
}
export function createLiveLogMapper() {
  const records = new WeakMap<LiveLogRow, LogRow>();
  return (row: LiveLogRow): LogRow => {
    let mapped = records.get(row);
    if (!mapped) {
      mapped = {
        ...row,
        logRecordUid: null,
        // OTLP uses zero for an unset timestamp; preserve the observed-time fallback.
        timeUnixNano: row.timeUnixNano ? String(row.timeUnixNano) : null,
        observedTimeUnixNano: row.observedTimeUnixNano ? String(row.observedTimeUnixNano) : null
      };
      linkLogArrival(row, mapped);
      records.set(row, mapped);
    }
    return mapped;
  };
}
export function liveBufferWindow(rows: LogRow[]) {
  const timestamps = rows.map(logTimestampMs).filter((value): value is number => value != null);
  if (!timestamps.length) return undefined;
  const from = Math.min(...timestamps),
    to = Math.max(...timestamps);
  return { from, to: Math.max(from + 1, to) };
}
