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

import type { BulletinMetricField, BulletinMetrics } from './bulletin-model';

export type BulletinMetricPivotGroup = {
  metric: string;
  fields: Array<{ key: string; valueKey: string }>;
};

export type BulletinMetricPivotRow = {
  key: string;
  monitor: string;
  monitorId: number;
  host: string;
  values: Record<string, BulletinMetricField[]>;
};

export type BulletinMetricPivot = { groups: BulletinMetricPivotGroup[]; rows: BulletinMetricPivotRow[] };

export function hasBulletinMetricFields(metrics: BulletinMetrics) {
  return metrics.content.some(row => row.metrics.some(metric => metric.fields.some(sample => sample.length > 0)));
}

/**
 * Projects the transport shape into the two-level table used by Bulletin.
 * Metric and field order follow the first server occurrence, while later rows
 * may extend the schema without manufacturing values for earlier monitors.
 */
export function createBulletinMetricPivot(metrics: BulletinMetrics): BulletinMetricPivot {
  const groupFields = new Map<string, Set<string>>();
  for (const row of metrics.content) {
    for (const metric of row.metrics) {
      const fields = groupFields.get(metric.name) ?? new Set<string>();
      for (const sample of metric.fields) {
        for (const field of sample) fields.add(field.key);
      }
      if (fields.size > 0) groupFields.set(metric.name, fields);
    }
  }

  const groups = [...groupFields].map(([metric, fields]) => ({
    metric,
    fields: [...fields].map(key => ({ key, valueKey: metricFieldKey(metric, key) }))
  }));
  if (groups.length === 0) return { groups: [], rows: [] };

  const rows = metrics.content.map((row, rowIndex) => {
    const values = Object.fromEntries(
      groups.flatMap(group => group.fields.map(field => [field.valueKey, [] as BulletinMetricField[]]))
    );
    for (const metric of row.metrics) {
      for (const sample of metric.fields) {
        for (const field of sample) values[metricFieldKey(metric.name, field.key)]?.push(field);
      }
    }
    return {
      key: JSON.stringify([row.monitorId, row.host, rowIndex]),
      monitor: row.monitorName,
      monitorId: row.monitorId,
      host: row.host,
      values
    };
  });
  return { groups, rows };
}

function metricFieldKey(metric: string, field: string) {
  return JSON.stringify([metric, field]);
}
