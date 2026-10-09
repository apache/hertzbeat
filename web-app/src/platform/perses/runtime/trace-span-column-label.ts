/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { HertzBeatTraceColumn } from './perses-trace-display';
export function spanColumnLabel(key: HertzBeatTraceColumn) {
  if (key === 'duration') return 'exploreTrace.analytics.spanDuration';
  if (key === 'traceName') return 'exploreTrace.analytics.fields.operationName';
  if (key === 'service') return 'exploreTrace.analytics.fields.serviceName';
  return `explore.traceColumns.fields.${key}`;
}
