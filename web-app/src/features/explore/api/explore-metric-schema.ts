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

import { ExploreSignalContractError, type MetricConsole } from '../model/explore-signal-contract';
import {
  jsonValueSchema,
  nullableIntegerSchema,
  nullableNonNegativeIntegerSchema,
  nullableStringMapSchema,
  nullableStringSchema,
  nonNegativeIntegerSchema
} from './explore-wire-schema';

const metricContextSchema = z.object({
  entityId: nullableNonNegativeIntegerSchema,
  entityType: nullableStringSchema,
  entityName: nullableStringSchema,
  serviceName: nullableStringSchema,
  serviceNamespace: nullableStringSchema,
  environment: nullableStringSchema,
  operationName: nullableStringSchema,
  start: nullableNonNegativeIntegerSchema,
  end: nullableNonNegativeIntegerSchema
});

const metricFieldSchema = z.object({
  name: nullableStringSchema,
  type: z.enum(['number', 'string', 'time', 'bool']).nullable(),
  unit: nullableStringSchema
});

const metricFrameSchema = z.object({
  schema: z
    .object({
      fields: z.array(metricFieldSchema).nullable(),
      labels: nullableStringMapSchema,
      meta: nullableStringMapSchema
    })
    .nullable(),
  data: z.array(z.array(jsonValueSchema)).nullable()
});

const metricResultsSchema = z.object({
  refId: nullableStringSchema,
  status: nullableIntegerSchema,
  msg: nullableStringSchema,
  frames: z.array(metricFrameSchema).nullable()
});

const metricStatsSchema = z
  .object({
    totalSeries: nonNegativeIntegerSchema,
    nonEmptySeries: nonNegativeIntegerSchema,
    latestObservedAt: nullableNonNegativeIntegerSchema
  })
  .refine(stats => stats.nonEmptySeries <= stats.totalSeries);

const metricConsoleSchema: z.ZodType<MetricConsole> = z.object({
  context: metricContextSchema.nullable(),
  query: nullableStringSchema,
  datasource: nullableStringSchema,
  queryMode: nullableStringSchema,
  results: metricResultsSchema.nullable(),
  stats: metricStatsSchema.nullable(),
  emptyStateReason: nullableStringSchema,
  errorMessage: nullableStringSchema
});

export function parseMetricConsole(value: unknown): MetricConsole {
  const result = metricConsoleSchema.safeParse(value);
  if (!result.success) throw new ExploreSignalContractError();
  return result.data;
}
