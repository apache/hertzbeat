/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';
import { logFacetFieldSchema } from '@/shared/log-field';
export const logAnalysisFieldIdSchema = z.string().refine(id => {
  if (/^calculated:[A-Za-z][A-Za-z0-9_]{0,63}$/u.test(id)) return true;
  const split = id.indexOf(':');
  return logFacetFieldSchema.safeParse({ id, source: id.slice(0, split), key: id.slice(split + 1) }).success;
});
export const LOG_MEASURE_FUNCTIONS = [
  'avg',
  'min',
  'max',
  'sum',
  'unique',
  'p50',
  'p75',
  'p90',
  'p95',
  'p98',
  'p99'
] as const;
export const logMeasureSchema = z
  .object({ function: z.enum(LOG_MEASURE_FUNCTIONS), field: logAnalysisFieldIdSchema })
  .strict()
  .refine(measure => measure.function === 'unique' || !measure.field.startsWith('builtin:'));
export type LogMeasure = z.infer<typeof logMeasureSchema>;
export const optionalLogMeasureSchema = z
  .union([
    logMeasureSchema,
    z
      .object({ function: z.literal('count') })
      .strict()
      .transform(() => undefined)
  ])
  .optional();
export const logAnalysisOrderSchema = z.enum(['count-asc', 'count-desc', 'measure-asc', 'measure-desc']);
export const logMeasurementSchema = z
  .object({
    state: z.enum(['ready', 'no_samples', 'non_finite']),
    sampleCount: z.number().int().nonnegative().safe(),
    value: z.number().finite().nullable()
  })
  .strict();
export type LogMeasurement = z.infer<typeof logMeasurementSchema>;
export function validMeasureOrder(value: { measure?: LogMeasure | undefined; order: string }) {
  return value.order.startsWith(value.measure ? 'measure-' : 'count-');
}
export function validLogMeasurement(measure: LogMeasure | undefined, value: LogMeasurement | undefined, count: number) {
  if (!measure) return value === undefined;
  if (!value || value.sampleCount > count) return false;
  if (measure.function === 'unique') return validUniqueMeasurement(value);
  if (value.state === 'no_samples') return value.sampleCount === 0 && value.value === null;
  return value.sampleCount > 0 && (value.state === 'ready' ? value.value !== null : value.value === null);
}
export function sameLogMeasure(a: LogMeasure | undefined, b: LogMeasure | undefined) {
  return a?.function === b?.function && a?.field === b?.field;
}

function validUniqueMeasurement(value: LogMeasurement) {
  return (
    value.state === 'ready' &&
    value.value !== null &&
    Number.isSafeInteger(value.value) &&
    value.value >= 0 &&
    value.value <= value.sampleCount &&
    (value.sampleCount === 0 ? value.value === 0 : value.value > 0)
  );
}

export function isLogPercentile(measure: LogMeasure | null | undefined) {
  return measure?.function.startsWith('p') ?? false;
}
export function logMeasureHintKey(measure: LogMeasure | null | undefined) {
  return isLogPercentile(measure) ? 'explore.logAnalysis.percentileHint' : 'explore.logAnalysis.measureHint';
}
