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

export type MetricSeries = {
  refId?: string;
  allowsGaps?: boolean;
  key: string;
  name: string;
  unit?: string | undefined;
  labels: Record<string, string>;
  points: unknown[][];
};

export type MetricPoint = { timestamp: number; value: number };

export type MetricResultState =
  | { kind: 'selection_required' }
  | { kind: 'error'; message?: string }
  | { kind: 'contract_error' }
  | { kind: 'invalid_query' }
  | { kind: 'storage_unavailable' }
  | { kind: 'missing_context' }
  | { kind: 'unsupported_query' }
  | { kind: 'empty' }
  | { kind: 'ready'; series: MetricSeries[] };

export function metricPoints(series: MetricSeries): MetricPoint[] {
  return series.points.flatMap(point => {
    if (!Array.isArray(point)) return [];
    const timestamp = metricNumber(point[0]);
    const value = metricNumber(point[1]);
    return timestamp != null && value != null ? [{ timestamp, value }] : [];
  });
}

export function metricNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
