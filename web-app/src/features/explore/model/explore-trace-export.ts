/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { serializeCsv } from '@/shared/browser-download';
import type { TraceEvidence } from '@/shared/trace-evidence';

export function tracePageCsv(rows: TraceEvidence[]) {
  const headers = [
    'trace_id',
    'service',
    'operation',
    'observed_start',
    'root_state',
    'root_duration_ms',
    'spans',
    'error_spans'
  ];
  const values = rows.map(row => {
    const span =
      row.rootState === 'unique'
        ? { serviceName: row.serviceName, spanName: row.rootSpanName }
        : row.representativeSpan;
    return [
      row.traceId,
      span.serviceName,
      span.spanName,
      new Date(row.observedStartTime).toISOString(),
      row.rootState,
      row.rootState === 'unique' && row.durationNanos != null ? row.durationNanos / 1_000_000 : null,
      row.spanCount,
      row.errorSpanCount
    ];
  });
  return serializeCsv([headers, ...values]);
}
