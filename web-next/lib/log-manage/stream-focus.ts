import type { LogEntry } from '@/lib/types';
import type { LogQueryState } from './query-state';

export function buildTraceFocusQuery(query: LogQueryState, logEntry: LogEntry | null): LogQueryState {
  if (!logEntry?.traceId?.trim()) {
    return query;
  }
  return {
    ...query,
    traceId: logEntry.traceId.trim(),
    spanId: ''
  };
}

export function buildSpanFocusQuery(query: LogQueryState, logEntry: LogEntry | null): LogQueryState {
  if (!logEntry?.spanId?.trim()) {
    return query;
  }
  return {
    ...query,
    traceId: logEntry.traceId?.trim() || query.traceId,
    spanId: logEntry.spanId.trim()
  };
}
