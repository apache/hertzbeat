/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
