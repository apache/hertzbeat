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
  monitorScheduleTypes,
  monitorScrapeValues,
  type Monitor,
  type MonitorDetail,
  type MonitorDetailMetric,
  type MonitorGrafanaDashboard,
  type MonitorParam
} from '../model/monitor-contract';
import {
  javaByteSchema,
  monitorStatusSchema,
  nonEmptyStringSchema,
  nonNegativeIntegerSchema,
  nullableNonNegativeIntegerSchema,
  nullablePositiveIntegerSchema,
  nullableStringMapSchema,
  nullableStringSchema,
  nullableTimestampSchema,
  positiveIntegerSchema
} from './monitor-read-schema-primitives';

const intervalSchema = nonNegativeIntegerSchema.refine(value => value >= 10);

const detailMonitorSchema = z.object({
  id: positiveIntegerSchema,
  jobId: nullablePositiveIntegerSchema,
  name: nonEmptyStringSchema,
  app: nonEmptyStringSchema,
  scrape: z.enum(monitorScrapeValues).nullable(),
  instance: nonEmptyStringSchema,
  intervals: intervalSchema.nullable(),
  scheduleType: z.enum(monitorScheduleTypes).nullable(),
  cronExpression: nullableStringSchema,
  status: monitorStatusSchema,
  type: javaByteSchema,
  labels: nullableStringMapSchema,
  annotations: nullableStringMapSchema,
  description: nullableStringSchema,
  creator: nullableStringSchema,
  modifier: nullableStringSchema,
  gmtCreate: nullableTimestampSchema,
  gmtUpdate: nullableTimestampSchema
});

const monitorParamSchema = z.object({
  id: nullablePositiveIntegerSchema,
  monitorId: nullablePositiveIntegerSchema,
  field: nonEmptyStringSchema,
  type: javaByteSchema,
  paramValue: nullableStringSchema,
  gmtCreate: nullableTimestampSchema,
  gmtUpdate: nullableTimestampSchema
});

const grafanaDashboardSchema = z.object({
  monitorId: nullablePositiveIntegerSchema,
  folderUid: nullableStringSchema,
  slug: nullableStringSchema,
  status: nullableStringSchema,
  uid: nullableStringSchema,
  url: nullableStringSchema,
  version: nullableNonNegativeIntegerSchema,
  enabled: z.boolean(),
  template: nullableStringSchema
});

const embeddedMetricSchema = z.object({
  name: nonEmptyStringSchema,
  favorited: z.boolean().nullable()
});

const monitorDetailSchema = z.object({
  monitor: detailMonitorSchema,
  params: z.array(monitorParamSchema),
  collector: nullableStringSchema,
  grafanaDashboard: grafanaDashboardSchema.nullable(),
  metrics: z.array(embeddedMetricSchema)
});

type DetailWire = z.output<typeof monitorDetailSchema>;

export function parseMonitorDetail(value: unknown, requestedId: number): MonitorDetail {
  const result = monitorDetailSchema.safeParse(value);
  if (!result.success) throw new MonitorContractError();

  const detail = result.data;
  if (
    detail.monitor.id !== requestedId ||
    detail.params.some(param => param.monitorId !== null && param.monitorId !== requestedId) ||
    (detail.grafanaDashboard?.monitorId != null && detail.grafanaDashboard.monitorId !== requestedId)
  ) {
    throw new MonitorContractError('Monitor detail identity does not match request');
  }
  return {
    monitor: mapMonitor(detail.monitor),
    params: detail.params.map(mapMonitorParam),
    collector: detail.collector,
    grafanaDashboard: detail.grafanaDashboard === null ? null : mapGrafanaDashboard(detail.grafanaDashboard),
    metrics: detail.metrics.map(mapEmbeddedMetric)
  };
}

function mapMonitor(wire: DetailWire['monitor']): Monitor {
  return { ...wire };
}

function mapMonitorParam(wire: DetailWire['params'][number]): MonitorParam {
  return { ...wire };
}

function mapGrafanaDashboard(wire: NonNullable<DetailWire['grafanaDashboard']>): MonitorGrafanaDashboard {
  return { ...wire };
}

function mapEmbeddedMetric(wire: DetailWire['metrics'][number]): MonitorDetailMetric {
  return { name: wire.name, favorited: wire.favorited };
}
