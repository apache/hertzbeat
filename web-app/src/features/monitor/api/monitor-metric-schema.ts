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

import { z } from 'zod';

import {
  MonitorContractError,
  type MonitorDetailMetric,
  type MonitorHistoryMetric,
  type MonitorMetricValue,
  type MonitorRealtimeMetric
} from '../model/monitor-contract';
import {
  javaByteSchema,
  nonEmptyStringSchema,
  nullableNonNegativeIntegerSchema,
  nullableStringSchema,
  positiveIntegerSchema
} from './monitor-read-schema-primitives';

// Wire schemas enumerate accepted backend fields; Zod strips unrelated payload data.
const metricValueSchema = z.object({
  origin: nullableStringSchema,
  mean: nullableStringSchema,
  median: nullableStringSchema,
  min: nullableStringSchema,
  max: nullableStringSchema,
  time: nullableNonNegativeIntegerSchema
});

const catalogFieldSchema = z.object({
  type: javaByteSchema,
  field: nonEmptyStringSchema,
  unit: nullableStringSchema,
  label: z.boolean()
});
const catalogSchema = z.object({
  metrics: z.array(
    z.object({
      name: nonEmptyStringSchema,
      visible: z.boolean(),
      fields: z.array(catalogFieldSchema)
    })
  )
});
const favoritesSchema = z.array(nonEmptyStringSchema);

const realtimeFieldSchema = z.object({
  name: nonEmptyStringSchema,
  type: javaByteSchema,
  unit: nullableStringSchema,
  label: z.boolean()
});
const realtimeRowSchema = z.object({
  labels: z.record(z.string(), z.string()),
  values: z.array(metricValueSchema)
});
const realtimeSchema = z.object({
  id: positiveIntegerSchema,
  app: nullableStringSchema,
  metrics: nonEmptyStringSchema,
  time: nullableNonNegativeIntegerSchema,
  fields: z.array(realtimeFieldSchema),
  valueRows: z.array(realtimeRowSchema).nullable()
});

const historySchema = z.object({
  instance: nonEmptyStringSchema,
  app: nullableStringSchema,
  metrics: nonEmptyStringSchema,
  field: z.object({
    name: nonEmptyStringSchema,
    type: javaByteSchema,
    unit: nullableStringSchema,
    label: z.boolean().nullable()
  }),
  values: z.record(z.string(), z.array(metricValueSchema))
});

type CatalogWire = z.output<typeof catalogSchema>;
type MetricValueWire = z.output<typeof metricValueSchema>;

export function parseFavoriteMetrics(value: unknown): string[] {
  const result = favoritesSchema.safeParse(value);
  if (!result.success) throw new MonitorContractError();
  return result.data;
}

export function parseMonitorMetricCatalog(value: unknown): { metrics: MonitorDetailMetric[] } {
  const result = catalogSchema.safeParse(value);
  if (!result.success) throw new MonitorContractError();
  return { metrics: result.data.metrics.map(mapCatalogMetric) };
}

export function parseRealtimeMetric(
  value: unknown,
  requestedMonitorId: number,
  requestedGroup: string
): MonitorRealtimeMetric {
  // The endpoint uses a nullish body, rather than a shaped object, for honest no-data.
  if (value === null || value === undefined) return { time: null, fields: [], valueRows: [] };
  const result = realtimeSchema.safeParse(value);
  if (!result.success) throw new MonitorContractError();
  const wire = result.data;
  if (wire.id !== requestedMonitorId || wire.metrics !== requestedGroup) {
    throw new MonitorContractError('Realtime metric identity does not match request');
  }
  if (new Set(wire.fields.map(field => field.name)).size !== wire.fields.length) {
    throw new MonitorContractError('Realtime metric field names must be unique');
  }
  const valueRows = (wire.valueRows ?? []).map(row => {
    if (row.values.length !== wire.fields.length) {
      throw new MonitorContractError('Realtime row values must align with fields');
    }
    return { labels: row.labels, values: row.values.map(mapMetricValue) };
  });
  return { time: wire.time, fields: wire.fields.map(field => ({ ...field })), valueRows };
}

export function parseHistoryMetric(
  value: unknown,
  requestedInstance: string,
  requestedGroup: string,
  requestedField: string
): MonitorHistoryMetric {
  const result = historySchema.safeParse(value);
  if (!result.success) throw new MonitorContractError();
  const wire = result.data;
  if (wire.instance !== requestedInstance || wire.metrics !== requestedGroup || wire.field.name !== requestedField) {
    throw new MonitorContractError('History metric identity does not match request');
  }
  if (wire.field.type !== 0) throw new MonitorContractError('History metric field must be numeric');
  return {
    values: Object.fromEntries(
      Object.entries(wire.values).map(([series, values]) => [series, values.map(mapMetricValue)])
    )
  };
}

function mapCatalogMetric(wire: CatalogWire['metrics'][number]): MonitorDetailMetric {
  return {
    name: wire.name,
    visible: wire.visible,
    fields: wire.fields.map(field => ({
      type: field.type,
      field: field.field,
      label: field.label,
      ...(field.unit === null ? {} : { unit: field.unit })
    }))
  };
}

function mapMetricValue(wire: MetricValueWire): MonitorMetricValue {
  return { ...wire };
}
