/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { SharedTimeValue } from '@/shared/time';
import type { LogExploreQuery } from './explore-model';

export function logResumeRefreshInterval(
  query: LogExploreQuery,
  time: SharedTimeValue | null | undefined,
  currentInterval: number
) {
  return (
    positiveRefreshInterval(query.autoRefreshMs) ?? positiveRefreshInterval(time?.autoRefreshMs) ?? currentInterval
  );
}

export function positiveRefreshInterval(interval: number | undefined) {
  return interval != null && interval > 0 ? interval : undefined;
}

export function fixedLogWindow(query: LogExploreQuery) {
  return query.start != null && query.end != null ? { from: query.start, to: query.end } : undefined;
}
