/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { logTimeShiftSchema, validComparisonSourceWindows } from './log-timeshift';
import {
  additionalMeasuresSchema,
  additionalMeasurementsSchema,
  validAdditionalMeasurements,
  validAdditionalResult
} from './log-additional-measures';
import { logIntervalSchema, validLogIntervalGrid } from './log-interval';
import { z } from 'zod';
import { logComparisonSchema } from './log-comparison';
import { logFacetFieldSchema } from '@/shared/log-field';
import { logGroupKeySchema, logGroupingSchema, validGroupingControls } from './log-grouping';
import {
  logAnalysisOrderSchema,
  logMeasurementSchema,
  optionalLogMeasureSchema,
  validLogMeasurement,
  validMeasureOrder
} from './log-measure';
const count = z.number().int().nonnegative().safe();
const cell = z
  .object({ count, measurement: logMeasurementSchema.optional(), additionalMeasurements: additionalMeasurementsSchema })
  .strict();
const group = z
  .object({
    keys: z.array(logGroupKeySchema).max(4),
    a: cell,
    b: cell,
    buckets: z.array(z.object({ start: count, a: cell, b: cell }).strict()).max(60)
  })
  .strict();
const resultSchema = z
  .object({
    window: z.object({ start: count, end: count }).strict(),
    analysis: z
      .object({
        intervalMs: logIntervalSchema.optional(),
        field: logFacetFieldSchema.nullable(),
        view: z.enum(['groups', 'timeseries']),
        transform: z.literal('throughput').optional(),
        limit: z.number().int().min(1).max(100),
        order: logAnalysisOrderSchema,
        minCount: z.number().int().min(1).max(1_000_000),
        measure: optionalLogMeasureSchema.nullable(),
        additionalMeasures: additionalMeasuresSchema,
        grouping: logGroupingSchema.nullable()
      })
      .strict(),
    bTimeShiftMs: logTimeShiftSchema.optional(),
    bWindow: z.object({ start: count, end: count }).strict().optional(),
    matchingA: count,
    matchingB: count,
    truncated: z.boolean(),
    intervalMs: count.positive().nullable(),
    groups: z.array(group).max(100),
    formula: z.string().optional()
  })
  .strict();
export type LogComparisonResult = z.infer<typeof resultSchema>;
export type LogComparisonGroup = LogComparisonResult['groups'][number];
export const logComparisonResultSchema = resultSchema.refine(validResult);
function validResult(result: LogComparisonResult) {
  const { analysis, groups, intervalMs: interval, window } = result;
  const controls = { ...analysis, measure: analysis.measure ?? undefined, grouping: analysis.grouping ?? undefined };
  if (!validComparisonSourceWindows(result) || !validMetadata(result)) return false;
  if (new Set(groups.map(g => JSON.stringify(g.keys))).size !== groups.length) return false;
  for (const source of ['a', 'b'] as const) {
    if (groups.reduce((sum, g) => sum + g[source].count, 0) > result[source === 'a' ? 'matchingA' : 'matchingB'])
      return false;
  }
  const fields = analysis.grouping?.dimensions.map(d => d.field) ?? (analysis.field ? [analysis.field.id] : []);
  return groups.every(g => {
    if (
      g.a.count < analysis.minCount ||
      (!fields.length && (g.a.count !== result.matchingA || g.b.count !== result.matchingB)) ||
      JSON.stringify(g.keys.map(k => k.field)) !== JSON.stringify(fields)
    )
      return false;
    if (!validCells(g, controls.measure, analysis.additionalMeasures)) return false;
    if (interval === null) return g.buckets.length === 0;
    const first = Math.floor(window.start / interval) * interval;
    const size = Math.floor(window.end / interval) - Math.floor(window.start / interval) + 1;
    if (
      size > 60 ||
      g.buckets.length !== size ||
      !g.buckets.every((b, i) => b.start === first + i * interval && validCells(b, controls.measure))
    )
      return false;
    return (['a', 'b'] as const).every(
      source =>
        g.buckets.reduce((sum, b) => sum + b[source].count, 0) === g[source].count &&
        (!controls.measure ||
          g.buckets.reduce((sum, b) => sum + b[source].measurement!.sampleCount, 0) ===
            g[source].measurement!.sampleCount)
    );
  });
}
function validCells(
  pair: { a: z.infer<typeof cell>; b: z.infer<typeof cell> },
  measure: LogComparisonResult['analysis']['measure'],
  additionalMeasures?: LogComparisonResult['analysis']['additionalMeasures']
) {
  return (['a', 'b'] as const).every(
    source =>
      validLogMeasurement(measure ?? undefined, pair[source].measurement, pair[source].count) &&
      validAdditionalMeasurements(additionalMeasures, pair[source].additionalMeasurements, pair[source].count)
  );
}

function validMetadata(result: LogComparisonResult) {
  const { analysis, groups, intervalMs: interval, window } = result;
  const controls = { ...analysis, measure: analysis.measure ?? undefined, grouping: analysis.grouping ?? undefined };
  if (
    !validAdditionalResult(analysis) ||
    !validMeasureOrder(controls) ||
    !validGroupingControls(controls) ||
    window.end <= window.start ||
    groups.length > analysis.limit ||
    (analysis.view === 'timeseries') !== (interval !== null)
  )
    return false;
  if (!validGrid(result)) return false;
  if (
    !logComparisonSchema.safeParse({
      version: 1,
      search: '',
      ...(result.formula === undefined ? {} : { formula: result.formula })
    }).success
  )
    return false;
  return true;
}

function validGrid({ intervalMs, window, analysis }: LogComparisonResult) {
  return (
    (analysis.transform === undefined || analysis.view === 'timeseries') &&
    validLogIntervalGrid(window, intervalMs) &&
    (analysis.intervalMs === undefined || analysis.intervalMs === intervalMs)
  );
}
