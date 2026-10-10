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

import { z } from 'zod';
import { isMetricQueryName, parseMetricAggregation, parseMetricStep } from './metric-fields';
import { parseMetricFormula } from './metric-formula';

const text = z.string().max(1024).optional();
const rowSchema = z
  .object({
    refId: z.string().regex(/^[a-z]$/u),
    metric: z.string().max(256),
    metricFilter: text,
    groupBy: text,
    aggregation: text,
    temporalAggregation: z.enum(['raw', 'rate', 'increase', 'delta']).optional(),
    timeShiftSeconds: z.number().int().min(0).max(31_536_000).optional(),
    rollup: z
      .object({
        aggregation: z.enum(['avg', 'sum', 'min', 'max', 'count']),
        intervalSeconds: z.number().int().min(1).max(86_400)
      })
      .strict()
      .optional(),
    nestedRollup: z
      .object({
        aggregation: z.enum(['avg', 'sum', 'min', 'max', 'count']),
        intervalSeconds: z.number().int().min(1).max(86_400)
      })
      .strict()
      .optional(),
    step: text
  })
  .strict();
export const metricPlanSchema = z
  .object({
    version: z.literal(1),
    queries: z.array(rowSchema).min(1).max(4),
    formulas: z.array(z.object({ id: z.string().regex(/^f[1-4]$/u), expression: z.string().max(256) }).strict()).max(4)
  })
  .strict()
  .refine(plan => new Set(plan.queries.map(row => row.refId)).size === plan.queries.length)
  .refine(plan => new Set(plan.formulas.map(row => row.id)).size === plan.formulas.length);
export type MetricPlan = z.infer<typeof metricPlanSchema>;
export type MetricQueryRow = MetricPlan['queries'][number];
export const metricRollupControlSchema = z.string().refine(value => {
  const simple = /^rollup_(avg|sum|min|max|count)_([1-9][0-9]{0,4})$/u.exec(value);
  if (simple) return Number(simple[2]) <= 86_400;
  const nested =
    /^nested_(avg|sum|min|max|count)_([1-9][0-9]{0,4})_after_(avg|sum|min|max|count)_([1-9][0-9]{0,4})$/u.exec(value);
  return Boolean(
    nested && Number(nested[2]) <= 86_400 && Number(nested[4]) <= 86_400 && Number(nested[2]) > Number(nested[4])
  );
});
export const METRIC_ROLLUP_INTERVALS = [60, 300, 900, 1800, 3600, 86400] as const;
function metricRollupControl(rollup: NonNullable<MetricQueryRow['rollup']>) {
  return `rollup_${rollup.aggregation}_${rollup.intervalSeconds}` as const;
}
export function metricTemporalControl(row: MetricQueryRow) {
  if (!row.rollup) return row.temporalAggregation;
  return row.nestedRollup
    ? (`nested_${row.nestedRollup.aggregation}_${row.nestedRollup.intervalSeconds}_after_${row.rollup.aggregation}_${row.rollup.intervalSeconds}` as const)
    : metricRollupControl(row.rollup);
}
export function metricOutputStep(row: MetricQueryRow) {
  return row.nestedRollup?.intervalSeconds ?? row.rollup?.intervalSeconds ?? row.step;
}
export type MetricPlanIssue = {
  row: string;
  reason: 'metric' | 'aggregation' | 'step' | 'rollup' | 'formula' | 'reference';
  reference?: string;
};
export type MetricPlanInput = {
  metricPlan?: string | undefined;
  query?: string | undefined;
  metricFilter?: string | undefined;
  groupBy?: string | undefined;
  aggregation?: string | undefined;
  temporalAggregation?: MetricQueryRow['temporalAggregation'] | `rollup_${string}` | `nested_${string}`;
  step?: string | undefined;
};
export function parseMetricPlan(value: string): MetricPlan {
  if (encodeURIComponent(value).length > 6000) throw new Error('Metric plan exceeds URL size limit');
  return metricPlanSchema.parse(JSON.parse(value));
}
export function encodeMetricPlan(plan: MetricPlan) {
  const value = JSON.stringify(metricPlanSchema.parse(plan));
  parseMetricPlan(value);
  return value;
}
export function metricPlanFromQuery(query: MetricPlanInput): MetricPlan {
  if (query.metricPlan) return parseMetricPlan(query.metricPlan);
  if (query.temporalAggregation?.startsWith('rollup_') || query.temporalAggregation?.startsWith('nested_'))
    throw new Error('Rollup requires a metric plan');
  return {
    version: 1,
    queries: [
      {
        refId: 'a',
        metric: query.query ?? '',
        metricFilter: query.metricFilter,
        groupBy: query.groupBy,
        aggregation: query.aggregation,
        temporalAggregation: query.temporalAggregation as MetricQueryRow['temporalAggregation'],
        step: query.step
      }
    ],
    formulas: []
  };
}
export function nextMetricReference(plan: MetricPlan) {
  const reserved = new Set(plan.queries.map(row => row.refId));
  for (const formula of plan.formulas) {
    // Reserve even unfinished references so adding a source cannot silently repair a different formula.
    for (const ref of formula.expression.match(/\b[a-z]\b/gu) ?? []) reserved.add(ref);
  }
  return 'abcdefghijklmnopqrstuvwxyz'.split('').find(ref => !reserved.has(ref));
}
export function validateMetricPlan(plan: MetricPlan): MetricPlanIssue[] {
  const issues: MetricPlanIssue[] = [];
  for (const row of plan.queries) {
    if (!isMetricQueryName(row.metric.trim())) issues.push({ row: row.refId, reason: 'metric' });
    if (!parseMetricAggregation(row.aggregation).valid) issues.push({ row: row.refId, reason: 'aggregation' });
    if (!parseMetricStep(row.step).valid) issues.push({ row: row.refId, reason: 'step' });
    if (invalidMetricRollup(row)) {
      issues.push({ row: row.refId, reason: 'rollup' });
    }
  }
  for (const formula of plan.formulas) {
    try {
      for (const reference of parseMetricFormula(formula.expression).references) {
        if (!plan.queries.some(row => row.refId === reference))
          issues.push({ row: formula.id, reason: 'reference', reference });
      }
    } catch {
      issues.push({ row: formula.id, reason: 'formula' });
    }
  }
  return issues;
}

function invalidMetricRollup(row: MetricQueryRow) {
  if (!row.rollup) return Boolean(row.nestedRollup);
  if (row.temporalAggregation && row.temporalAggregation !== 'raw') return true;
  if (row.nestedRollup && row.nestedRollup.intervalSeconds <= row.rollup.intervalSeconds) return true;
  const outputStep = row.nestedRollup?.intervalSeconds ?? row.rollup.intervalSeconds;
  return Boolean(row.step && Number(row.step.trim()) !== outputStep);
}
