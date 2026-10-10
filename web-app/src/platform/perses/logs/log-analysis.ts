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

import {
  additionalMeasuresSchema,
  additionalMeasurementsSchema,
  validAdditionalMeasures,
  validAdditionalMeasurements,
  validAdditionalResult
} from './log-additional-measures';
import {
  logMeasureSchema,
  logAnalysisFieldIdSchema,
  optionalLogMeasureSchema,
  logAnalysisOrderSchema,
  logMeasurementSchema,
  validMeasureOrder,
  validLogMeasurement
} from './log-measure';
import { logIntervalSchema, validLogIntervalGrid } from './log-interval';
import { logComparisonSchema, logComparisonDraftSchema } from './log-comparison';
import { logQuerySetDraftSchema, logQuerySetSchema } from './log-query-set';

import {
  logGroupingSchema,
  logGroupKeySchema,
  validGroupingControls,
  validGroupingKeys,
  groupIdentity
} from './log-grouping';
import { z } from 'zod';
import { logFacetFieldSchema as fieldSchema } from '@/shared/log-field';
const count = z.number().int().nonnegative().safe();
export const logAnalysisDraftSchema = z
  .object({
    version: z.literal(1),
    intervalMs: z.number().optional(),
    transform: z.literal('throughput').optional(),
    representation: z.enum(['logs', 'table', 'toplist', 'timeseries']),
    field: logAnalysisFieldIdSchema.optional(),
    measure: optionalLogMeasureSchema,
    additionalMeasures: z.array(logMeasureSchema).optional(),
    grouping: logGroupingSchema.optional(),
    comparison: logComparisonDraftSchema.optional(),
    querySet: logQuerySetDraftSchema.optional(),
    limit: z.number().int().min(1).max(100),
    order: logAnalysisOrderSchema,
    minCount: z.number().int().min(1).max(1_000_000)
  })
  .strict()
  .refine(validMeasureOrder)
  .refine(validGroupingControls)
  .refine(value => !value.comparison || value.representation === 'table' || value.representation === 'timeseries')
  .refine(value => !value.querySet || (!value.comparison && value.representation === 'timeseries'));
export const logAnalysisStateSchema = logAnalysisDraftSchema
  .refine(value => value.transform === undefined || value.representation === 'timeseries')
  .refine(validAdditionalMeasures)
  .refine(value => value.intervalMs === undefined || logIntervalSchema.safeParse(value.intervalMs).success)
  .refine(value => !value.comparison || logComparisonSchema.safeParse(value.comparison).success)
  .refine(value => !value.querySet || logQuerySetSchema.safeParse(value.querySet).success);
export type LogAnalysisState = z.infer<typeof logAnalysisStateSchema>;
export const DEFAULT_LOG_ANALYSIS: LogAnalysisState = {
  version: 1,
  representation: 'logs',
  limit: 20,
  order: 'count-desc',
  minCount: 1
};
export function parseLogAnalysis(value: string): LogAnalysisState {
  if (value.length > 20000) throw new Error('Invalid log analysis state');
  return logAnalysisStateSchema.parse(JSON.parse(value));
}
export function encodeLogAnalysis(value: LogAnalysisState) {
  return JSON.stringify(logAnalysisStateSchema.parse(value));
}
export function validLogAnalysis(value: string | undefined) {
  if (value === undefined) return true;
  try {
    parseLogAnalysis(value);
    return true;
  } catch {
    return false;
  }
}
const groupSchema = z
  .object({
    kind: z.enum(['value', 'missing', 'null', 'non_scalar', 'all']).nullable(),
    keys: z.array(logGroupKeySchema).min(1).max(4).optional(),
    value: z.string().nullable(),
    count: count.positive(),
    measurement: logMeasurementSchema.optional(),
    additionalMeasurements: additionalMeasurementsSchema,
    buckets: z.array(z.object({ start: count, count, measurement: logMeasurementSchema.optional() }).strict()).max(60)
  })
  .strict()
  .refine(group =>
    group.keys
      ? group.kind === null && group.value === null
      : group.kind !== null && (group.kind === 'value') === (group.value !== null)
  );
export const logAnalysisResultSchema = z
  .object({
    window: z.object({ start: count, end: count }).strict(),
    field: fieldSchema.nullable(),
    measure: optionalLogMeasureSchema,
    additionalMeasures: additionalMeasuresSchema,
    grouping: logGroupingSchema.optional(),
    view: z.enum(['groups', 'timeseries']),
    transform: z.literal('throughput').optional(),
    limit: z.number().int().min(1).max(100),
    order: logAnalysisOrderSchema,
    minCount: z.number().int().min(1).max(1_000_000),
    matchingTotal: count,
    truncated: z.boolean(),
    intervalMs: count.positive().nullable(),
    groups: z.array(groupSchema).max(100)
  })
  .strict()
  .refine(result => {
    if (result.transform !== undefined && result.view !== 'timeseries') return false;
    if (!validAdditionalResult(result) || !validLogIntervalGrid(result.window, result.intervalMs)) return false;
    if (!validMeasureOrder(result) || !validGroupingControls(result)) return false;
    if (
      result.window.end <= result.window.start ||
      result.groups.length > result.limit ||
      (result.view === 'timeseries') !== (result.intervalMs !== null)
    )
      return false;
    if (result.groups.reduce((sum, group) => sum + group.count, 0) > result.matchingTotal) return false;
    if (new Set(result.groups.map(groupIdentity)).size !== result.groups.length) return false;
    return result.groups.every(group => {
      if (!validGroupingKeys(result.grouping, group.keys)) return false;
      if (!validAdditionalMeasurements(result.additionalMeasures, group.additionalMeasurements, group.count))
        return false;
      if (
        !validLogMeasurement(result.measure, group.measurement, group.count) ||
        !group.buckets.every(bucket => validLogMeasurement(result.measure, bucket.measurement, bucket.count))
      )
        return false;
      if (
        result.measure &&
        result.view === 'timeseries' &&
        group.buckets.reduce((sum, bucket) => sum + bucket.measurement!.sampleCount, 0) !==
          group.measurement!.sampleCount
      )
        return false;
      if (result.view === 'groups') return group.buckets.length === 0;
      return (
        group.buckets.reduce((sum, bucket) => sum + bucket.count, 0) === group.count &&
        group.buckets.every(
          (bucket, index) =>
            bucket.start % result.intervalMs! === 0 &&
            bucket.start >= Math.floor(result.window.start / result.intervalMs!) * result.intervalMs! &&
            bucket.start <= result.window.end &&
            (index === 0 || bucket.start > group.buckets[index - 1]!.start)
        )
      );
    });
  });
export type LogAnalysisResult = z.infer<typeof logAnalysisResultSchema>;
export type LogAnalysisGroup = LogAnalysisResult['groups'][number];
