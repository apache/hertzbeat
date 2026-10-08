/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { serializeCsv } from '@/shared/browser-download';
import type { TraceSpanRow } from './explore-trace-analytics';

export function spanPageCsv(rows: readonly TraceSpanRow[]) {
  return serializeCsv([
    ['trace_id', 'span_id', 'service', 'operation', 'status', 'start_time_unix_nano', 'duration_nano'],
    ...rows.map(row => [
      row.traceId,
      row.spanId,
      row.serviceName,
      row.operationName,
      row.status,
      row.startTimeUnixNano,
      row.durationNanos
    ])
  ]);
}
