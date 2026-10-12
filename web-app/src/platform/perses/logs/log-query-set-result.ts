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
import { logGroupKeySchema } from './log-grouping';
import { logIntervalSchema, validLogIntervalGrid } from './log-interval';
import { logMeasurementSchema, validLogMeasurement } from './log-measure';
import { logQueryFormulaSchema, logQuerySourceAnalysisSchema, logQuerySourceSchema } from './log-query-set';
import { parseQueryFormula } from '@/shared/query-context/query-formula';

const count = z.number().int().nonnegative().safe();
const window = z.object({ start: count, end: count }).strict();
const cell = z.object({ count, measurement: logMeasurementSchema.optional() }).strict();
const group = z
  .object({
    keys: z.array(logGroupKeySchema).max(4),
    cell,
    buckets: z.array(z.object({ start: count, cell }).strict()).max(60)
  })
  .strict();
const source = z
  .object({
    refId: logQuerySourceSchema.shape.refId,
    alias: logQuerySourceSchema.shape.alias,
    visible: z.boolean(),
    sourceWindow: window,
    matchingTotal: count,
    truncated: z.boolean(),
    analysis: logQuerySourceAnalysisSchema,
    groups: z.array(group).max(100)
  })
  .strict();
const formula = logQueryFormulaSchema.extend({ dependsOn: z.array(logQuerySourceSchema.shape.refId).max(4) }).strict();

const resultSchema = z
  .object({
    version: z.literal(2),
    window,
    intervalMs: z.union([logIntervalSchema, z.null()]),
    executed: z
      .object({
        queries: z.array(logQuerySourceSchema).min(1).max(4),
        formulas: z.array(logQueryFormulaSchema).max(4)
      })
      .strict(),
    sources: z.array(source).min(1).max(4),
    formulas: z.array(formula).max(4)
  })
  .strict();

export const logQuerySetResultSchema = resultSchema.refine(validResult);

export type LogQuerySetResult = z.infer<typeof resultSchema>;
export type LogQuerySetCell = z.infer<typeof cell>;
type LogQuerySetGroup = z.infer<typeof group>;

type Source = z.infer<typeof source>;
type Query = z.infer<typeof logQuerySourceSchema>;
type Formula = z.infer<typeof formula>;
type FormulaQuery = z.infer<typeof logQueryFormulaSchema>;

function groupSignature(analysis: Query['analysis']): string {
  return JSON.stringify(
    analysis.grouping?.dimensions.map(dimension => dimension.field) ?? (analysis.field ? [analysis.field] : [])
  );
}

function validSource(
  item: Source,
  requested: Query,
  reference: LogQuerySetResult['window'],
  intervalMs: number | null
) {
  const shift = requested.timeShiftMs ?? 0;
  const signature = groupSignature(item.analysis);
  const domain = item.groups.map(entry => JSON.stringify(entry.keys));
  return (
    item.refId === requested.refId &&
    item.alias === requested.alias &&
    item.visible === requested.visible &&
    JSON.stringify(item.analysis) === JSON.stringify(requested.analysis) &&
    item.sourceWindow.start === reference.start - shift &&
    item.sourceWindow.end === reference.end - shift &&
    new Set(domain).size === domain.length &&
    item.groups.every(entry => JSON.stringify(entry.keys.map(key => key.field)) === signature) &&
    item.groups.reduce((sum, entry) => sum + entry.cell.count, 0) <= item.matchingTotal &&
    item.groups.every(entry => validGroup(entry, item.analysis.measure, reference, intervalMs))
  );
}

function validGroup(
  entry: LogQuerySetGroup,
  measure: Query['analysis']['measure'],
  reference: LogQuerySetResult['window'],
  intervalMs: number | null
) {
  if (!validCell(measure, entry.cell)) return false;
  if (intervalMs === null) return entry.buckets.length === 0;
  const start = Math.floor(reference.start / intervalMs) * intervalMs;
  const length = Math.floor(reference.end / intervalMs) - Math.floor(reference.start / intervalMs) + 1;
  if (entry.buckets.length !== length) return false;
  if (entry.buckets.some((bucket, i) => bucket.start !== start + i * intervalMs || !validCell(measure, bucket.cell)))
    return false;
  if (entry.buckets.reduce((sum, bucket) => sum + bucket.cell.count, 0) !== entry.cell.count) return false;
  return (
    !measure ||
    entry.buckets.reduce((sum, bucket) => sum + bucket.cell.measurement!.sampleCount, 0) ===
      entry.cell.measurement!.sampleCount
  );
}

function formulaSignature(item: Formula, requested: FormulaQuery, queries: Query[]): string | null {
  try {
    const refs = parseQueryFormula(item.expression).references;
    const signatures = refs.map(ref => {
      const query = queries.find(query => query.refId === ref);
      return query ? groupSignature(query.analysis) : undefined;
    });
    if (signatures.some(signature => signature === undefined) || new Set(signatures).size > 1) return null;
    if (!sameFormula(item, requested, refs)) return null;
    return signatures[0] ?? groupSignature(queries[0]!.analysis);
  } catch {
    return null;
  }
}

function sameFormula(item: Formula, requested: FormulaQuery, refs: string[]) {
  return (
    item.refId === requested.refId &&
    item.alias === requested.alias &&
    item.visible === requested.visible &&
    item.expression === requested.expression &&
    JSON.stringify(item.dependsOn) === JSON.stringify(refs)
  );
}

function validResult(result: LogQuerySetResult): boolean {
  const { window: reference, intervalMs, sources, executed } = result;
  if (reference.end <= reference.start || !validLogIntervalGrid(reference, intervalMs)) return false;
  if (sources.length !== executed.queries.length || result.formulas.length !== executed.formulas.length) return false;
  const domains = sourceDomains(result);
  if (!domains) return false;
  const sourceSeries = sources.reduce((sum, item) => sum + item.groups.length, 0);
  const formulaSeries = formulaSeriesCount(result, domains);
  if (formulaSeries === null) return false;
  const series = sourceSeries + formulaSeries;
  const bucketCount =
    intervalMs === null ? 0 : Math.floor(reference.end / intervalMs) - Math.floor(reference.start / intervalMs) + 1;
  return series <= 100 && series * bucketCount <= 6000;
}

function sourceDomains(result: LogQuerySetResult): Map<string, string[]> | null {
  const { window: reference, intervalMs, sources, executed } = result;
  const domains = new Map<string, string[]>();
  let groups = 0;
  for (const [index, item] of sources.entries()) {
    if (!validSource(item, executed.queries[index]!, reference, intervalMs)) return null;
    const signature = groupSignature(item.analysis);
    const domain = item.groups.map(group => JSON.stringify(group.keys));
    if (
      domains.has(signature) &&
      JSON.stringify([...domains.get(signature)!].sort()) !== JSON.stringify([...domain].sort())
    )
      return null;
    if (!domains.has(signature)) {
      domains.set(signature, domain);
      groups += domain.length;
    }
  }
  return groups <= 100 ? domains : null;
}

function formulaSeriesCount(result: LogQuerySetResult, domains: Map<string, string[]>): number | null {
  const { executed } = result;
  let series = 0;
  for (const [index, item] of result.formulas.entries()) {
    const signature = formulaSignature(item, executed.formulas[index]!, executed.queries);
    if (signature === null) return null;
    series += domains.get(signature)?.length ?? 0;
  }
  return series;
}

function validCell(measure: z.infer<typeof logQuerySourceAnalysisSchema>['measure'], value: z.infer<typeof cell>) {
  if (measure?.function === 'unique' && value.measurement?.state === 'no_samples')
    return value.measurement.sampleCount === 0 && value.measurement.value === null;
  return validLogMeasurement(measure ?? undefined, value.measurement, value.count);
}
