/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
