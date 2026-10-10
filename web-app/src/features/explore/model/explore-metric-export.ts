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

import { metricPoints, type MetricSeries } from '@/platform/perses';
import { serializeCsv } from '@/shared/browser-download';
import type { ExactTimeWindow } from '@/shared/query-context';

const MAX_CSV_BYTES = 8 * 1024 * 1024;
const headers = [
  'display_timestamp_utc',
  'value',
  'ref_id',
  'series_name',
  'unit',
  'labels_json',
  'window_start_utc',
  'window_end_utc',
  'executed_query'
];

/** Export the visible, returned samples without applying the 100-row table preview limit. */
export function metricResultCsv(
  series: readonly MetricSeries[],
  window: ExactTimeWindow,
  executedQuery: string | null
) {
  const chunks = [serializeCsv([headers])];
  const encoder = new TextEncoder();
  let bytes = 3 + encoder.encode(chunks[0]).length; // The browser download adds a UTF-8 BOM.
  const start = new Date(window.from).toISOString();
  const end = new Date(window.to).toISOString();
  for (const item of series) {
    const labels = JSON.stringify(
      Object.fromEntries(Object.entries(item.labels).sort(([a], [b]) => a.localeCompare(b)))
    );
    for (const point of metricPoints(item)) {
      const chunk =
        '\r\n' +
        serializeCsv([
          [
            new Date(point.timestamp).toISOString(),
            point.value,
            item.refId ?? '',
            item.name,
            item.unit ?? '',
            labels,
            start,
            end,
            executedQuery ?? ''
          ]
        ]);
      bytes += encoder.encode(chunk).length;
      if (bytes > MAX_CSV_BYTES) throw new RangeError('METRIC_CSV_TOO_LARGE');
      chunks.push(chunk);
    }
  }
  return chunks.join('');
}
