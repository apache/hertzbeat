/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';
import { ExploreSignalContractError } from '../model/explore-signal-contract';
import type { SubqueryAnalysisRequest as Request } from './explore-log-subquery-types';
import { descriptor, sameEnvelope } from './explore-log-subquery-schema';

const natural = z.number().int().safe().nonnegative();
const positive = natural.positive();
const measurement = z
  .object({
    state: z.enum(['ready', 'no_samples', 'non_finite']),
    sampleCount: natural,
    value: z.number().finite().nullable()
  })
  .strict();
const bucket = z.object({ start: natural, count: natural, measurement: measurement.nullable() }).strict();
const group = z
  .object({
    keys: z
      .array(
        z
          .object({
            field: z.string(),
            kind: z.enum(['value', 'null', 'all']),
            value: z.union([z.string(), z.number().finite(), z.boolean()]).nullable()
          })
          .strict()
      )
      .max(4),
    count: positive,
    measurement: measurement.nullable(),
    buckets: z.array(bucket).max(60)
  })
  .strict();
const operation = z
  .object({
    kind: z.literal('analysis'),
    view: z.literal('timeseries'),
    grouping: z.array(z.object({ field: z.string(), limit: positive.max(100) }).strict()).max(4),
    measure: z.object({ function: z.string(), field: z.string() }).strict().nullable(),
    limit: positive.max(100),
    order: z.enum(['count-asc', 'count-desc', 'measure-asc', 'measure-desc']),
    minCount: positive.max(1_000_000),
    intervalMs: positive
  })
  .strict();
const response = z
  .object({
    version: z.literal(1),
    window: z.object({ start: natural, end: positive }).strict(),
    executed: z.object({ parameters: z.record(z.string(), z.string()), subquery: descriptor, operation }).strict(),
    result: z
      .object({
        kind: z.literal('analysis'),
        view: z.literal('timeseries'),
        matchingTotal: natural,
        truncated: z.boolean(),
        intervalMs: positive,
        groups: z.array(group).max(100)
      })
      .strict()
  })
  .strict();

export type SubqueryAnalysisResponse = z.infer<typeof response>;

export function parseSubqueryAnalysisResponse(value: unknown, request: Request): SubqueryAnalysisResponse {
  const parsed = response.safeParse(value);
  if (!parsed.success) throw new ExploreSignalContractError('Invalid subquery analysis');
  const data = parsed.data;
  const op = request.operation;
  const first = Math.floor(data.window.start / op.intervalMs) * op.intervalMs;
  const length = Math.floor(data.window.end / op.intervalMs) - Math.floor(data.window.start / op.intervalMs) + 1;
  if (
    !sameEnvelope(data, request) ||
    data.result.intervalMs !== op.intervalMs ||
    data.result.groups.length > op.limit ||
    data.result.groups.reduce((sum, item) => sum + item.count, 0) > data.result.matchingTotal ||
    new Set(data.result.groups.map(item => JSON.stringify(item.keys))).size !== data.result.groups.length ||
    data.result.groups.some(item => !validGroup(item, op, first, length))
  )
    throw new ExploreSignalContractError('Subquery analysis does not match request');
  return data;
}

function validGroup(
  group: SubqueryAnalysisResponse['result']['groups'][number],
  op: Request['operation'],
  first: number,
  length: number
) {
  return (
    group.count >= op.minCount &&
    group.keys.length === op.grouping.length &&
    group.keys.every(
      (key, index) => key.field === op.grouping[index]?.field && (key.kind === 'value') === (key.value !== null)
    ) &&
    validMeasurement(group.measurement, op.measure, group.count) &&
    group.buckets.length === length &&
    group.buckets.every(
      (item, index) =>
        item.start === first + index * op.intervalMs && validMeasurement(item.measurement, op.measure, item.count)
    ) &&
    group.buckets.reduce((sum, item) => sum + item.count, 0) === group.count &&
    (!op.measure ||
      group.buckets.reduce((sum, item) => sum + item.measurement!.sampleCount, 0) === group.measurement!.sampleCount)
  );
}

function validMeasurement(
  value: SubqueryAnalysisResponse['result']['groups'][number]['measurement'],
  measure: Request['operation']['measure'],
  count: number
) {
  if (!measure) return value === null;
  if (!value || value.sampleCount > count) return false;
  if (value.state === 'no_samples') return value.sampleCount === 0 && value.value === null;
  if (value.state === 'non_finite') return value.sampleCount > 0 && value.value === null;
  return value.sampleCount > 0 && value.value !== null;
}
