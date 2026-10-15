/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { metricPoints, type MetricSeries } from './metric-series';

const METRIC_SAMPLE_LIMIT = 100;
const decimalValue = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 6, useGrouping: false });
const scientificValue = new Intl.NumberFormat(undefined, {
  maximumSignificantDigits: 6,
  useGrouping: false,
  notation: 'scientific'
});

export function formatMetricSampleValue(value: number) {
  const magnitude = Math.abs(value);
  return (magnitude >= 1e6 || (magnitude > 0 && magnitude < 0.001) ? scientificValue : decimalValue).format(value);
}
export type MetricSampleRow = {
  key: string;
  seriesKey: string;
  seriesNumber: number;
  timestamp: number;
  value: number;
  unit?: string | undefined;
};

export function buildMetricSampleSnapshot(series: MetricSeries[], limit = METRIC_SAMPLE_LIMIT) {
  const rows = series.flatMap((item, seriesIndex) =>
    metricPoints(item).map((point, pointIndex): MetricSampleRow => ({
      key: `${item.key}-${pointIndex}`,
      seriesKey: item.key,
      seriesNumber: seriesIndex + 1,
      timestamp: point.timestamp,
      value: point.value,
      unit: item.unit
    }))
  );
  rows.sort((left, right) => right.timestamp - left.timestamp || left.seriesNumber - right.seriesNumber);
  return { received: rows.length, truncated: rows.length > limit, rows: rows.slice(0, limit) };
}

export function summarizeMetricSeries(series: MetricSeries) {
  const points = metricPoints(series);
  const first = points[0];
  if (!first) return { count: 0 };
  let min = first.value;
  let max = first.value;
  let latest = first;
  for (const point of points) {
    min = Math.min(min, point.value);
    max = Math.max(max, point.value);
    if (point.timestamp > latest.timestamp) latest = point;
  }
  return { count: points.length, min, max, latest: latest.value, timestamp: latest.timestamp };
}

export function formatMetricSeriesLabels(labels: MetricSeries['labels']) {
  return Object.entries(labels)
    .filter(([key]) => key !== '__name__')
    .map(([key, value]) => `${key}=${value}`)
    .join(' · ');
}
