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
