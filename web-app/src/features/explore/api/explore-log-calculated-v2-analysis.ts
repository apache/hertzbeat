/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';
import { ExploreSignalContractError } from '../model/explore-signal-contract';
import type { CalculatedAnalysisRequest } from './explore-log-calculated-v2-types';
import {
  executedDefinitions,
  sameEntries,
  sameExecutedDefinitions,
  validDerived
} from './explore-log-calculated-v2-executed';

const natural = z.number().int().safe().nonnegative();
const positive = natural.positive();
const measurement = z
  .object({
    state: z.enum(['ready', 'no_samples', 'non_finite']),
    sampleCount: natural,
    value: z.number().finite().nullable()
  })
  .strict();
const key = z
  .object({
    field: z.string(),
    kind: z.enum(['value', 'null', 'all']),
    value: z.union([z.string(), z.number().finite(), z.boolean()]).nullable()
  })
  .strict();
const bucket = z.object({ start: natural, count: natural, measurement: measurement.nullable() }).strict();
const group = z
  .object({
    keys: z.array(key).max(4),
    count: positive,
    measurement: measurement.nullable(),
    buckets: z.array(bucket).max(60)
  })
  .strict();
const operation = z
  .object({
    kind: z.literal('analysis'),
    view: z.enum(['groups', 'timeseries']),
    grouping: z.array(z.object({ field: z.string(), limit: positive.max(100) }).strict()).max(4),
    measure: z.object({ function: z.string(), field: z.string() }).strict().nullable(),
    limit: positive.max(100),
    order: z.enum(['count-asc', 'count-desc', 'measure-asc', 'measure-desc']),
    minCount: positive.max(1_000_000),
    intervalMs: positive.optional()
  })
  .strict();
const response = z
  .object({
    version: z.literal(2),
    window: z.object({ start: natural, end: positive }).strict(),
    executed: z
      .object({ parameters: z.record(z.string(), z.string()), calculatedFields: executedDefinitions, operation })
      .strict(),
    result: z
      .object({
        kind: z.literal('analysis'),
        view: z.enum(['groups', 'timeseries']),
        matchingTotal: natural,
        truncated: z.boolean(),
        intervalMs: positive.nullable(),
        groups: z.array(group).max(100)
      })
      .strict()
  })
  .strict();

export type CalculatedAnalysisResponse = z.infer<typeof response>;

export function parseCalculatedAnalysisResponse(
  value: unknown,
  request: CalculatedAnalysisRequest
): CalculatedAnalysisResponse {
  const parsed = response.safeParse(value);
  if (!parsed.success) throw new ExploreSignalContractError('Invalid calculated analysis');
  const data = parsed.data;
  if (!validAnalysisEnvelope(data, request) || !validAnalysisGroups(data, request))
    throw new ExploreSignalContractError('Calculated analysis does not match request');
  return data;
}

function validAnalysisEnvelope(data: CalculatedAnalysisResponse, request: CalculatedAnalysisRequest) {
  const { operation: requested } = request;
  const { result } = data;
  const start = Number(request.parameters.start);
  const end = Number(request.parameters.end);
  return !(
    data.window.start !== start ||
    data.window.end !== end ||
    !sameEntries(data.executed.parameters, request.parameters) ||
    !sameEntries(data.executed.operation, requested) ||
    !sameExecutedDefinitions(data.executed.calculatedFields.fields, request.calculatedFields.fields) ||
    result.view !== requested.view ||
    result.intervalMs !== (requested.intervalMs ?? null)
  );
}

function validAnalysisGroups(data: CalculatedAnalysisResponse, request: CalculatedAnalysisRequest) {
  const { result } = data;
  const requested = request.operation;
  return !(
    result.groups.length > requested.limit ||
    result.groups.reduce((sum, item) => sum + item.count, 0) > result.matchingTotal ||
    new Set(result.groups.map(item => JSON.stringify(item.keys))).size !== result.groups.length ||
    !result.groups.every(item => validGroup(item, data, requested))
  );
}

function validGroup(
  group: CalculatedAnalysisResponse['result']['groups'][number],
  data: CalculatedAnalysisResponse,
  requested: CalculatedAnalysisRequest['operation']
) {
  const outputs = data.executed.calculatedFields.fields.flatMap(field => field.outputs);
  if (group.count < requested.minCount || group.keys.length !== requested.grouping.length) return false;
  if (
    !group.keys.every((item, index) => {
      if (item.field !== requested.grouping[index]?.field || (item.kind === 'value') !== (item.value !== null))
        return false;
      const output = outputs.find(candidate => `calculated:${candidate.name}` === item.field);
      return !output || validDerived(item.value, output.type);
    })
  )
    return false;
  if (!validMeasurement(group.measurement, requested.measure, group.count)) return false;
  if (requested.view === 'groups') return group.buckets.length === 0;
  const interval = requested.intervalMs!;
  const first = Math.floor(data.window.start / interval) * interval;
  const expected = Math.floor(data.window.end / interval) - Math.floor(data.window.start / interval) + 1;
  return (
    group.buckets.length === expected &&
    group.buckets.every(
      (item, index) =>
        item.start === first + index * interval && validMeasurement(item.measurement, requested.measure, item.count)
    ) &&
    group.buckets.reduce((sum, item) => sum + item.count, 0) === group.count &&
    (!requested.measure ||
      group.buckets.reduce((sum, item) => sum + item.measurement!.sampleCount, 0) === group.measurement!.sampleCount)
  );
}

function validMeasurement(
  value: CalculatedAnalysisResponse['result']['groups'][number]['measurement'],
  measure: CalculatedAnalysisRequest['operation']['measure'],
  count: number
) {
  if (!measure) return value === null;
  if (!value || value.sampleCount > count) return false;
  if (value.state === 'no_samples') return value.sampleCount === 0 && value.value === null;
  if (value.state === 'non_finite') return value.sampleCount > 0 && value.value === null;
  return value.sampleCount > 0 && value.value !== null;
}
