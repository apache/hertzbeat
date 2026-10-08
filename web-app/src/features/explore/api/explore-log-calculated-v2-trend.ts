/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';
import { ExploreSignalContractError } from '../model/explore-signal-contract';
import type { CalculatedTrendRequest } from './explore-log-calculated-v2-types';
import { executedDefinitions, sameEntries, sameExecutedDefinitions } from './explore-log-calculated-v2-executed';

const natural = z.number().int().safe().nonnegative();
const positive = natural.positive();
const trendIntervals = [60_000, 300_000, 900_000, 1_800_000, 3_600_000, 21_600_000, 86_400_000];
const trendResponse = z
  .object({
    version: z.literal(2),
    window: z.object({ start: natural, end: positive }).strict(),
    executed: z
      .object({
        parameters: z.record(z.string(), z.string()),
        calculatedFields: executedDefinitions,
        operation: z
          .object({ kind: z.literal('trend'), intervalMs: z.number().refine(value => trendIntervals.includes(value)) })
          .strict()
      })
      .strict(),
    result: z
      .object({
        kind: z.literal('trend'),
        intervalMs: z.number().refine(value => trendIntervals.includes(value)),
        matchingTotal: natural,
        buckets: z.array(z.object({ start: natural, count: natural }).strict()).max(60)
      })
      .strict()
  })
  .strict();

export function parseCalculatedTrendResponse(value: unknown, request: CalculatedTrendRequest) {
  const parsed = trendResponse.safeParse(value);
  if (!parsed.success) throw new ExploreSignalContractError('Invalid calculated trend');
  const data = parsed.data;
  const interval = request.operation.intervalMs;
  const start = Number(request.parameters.start);
  const end = Number(request.parameters.end);
  const first = Math.floor(start / interval) * interval;
  const expected = Math.floor(end / interval) - Math.floor(start / interval) + 1;
  if (
    data.window.start !== start ||
    data.window.end !== end ||
    !sameEntries(data.executed.parameters, request.parameters) ||
    !sameEntries(data.executed.operation, request.operation) ||
    !sameExecutedDefinitions(data.executed.calculatedFields.fields, request.calculatedFields.fields) ||
    data.result.intervalMs !== interval ||
    data.result.buckets.length !== expected ||
    data.result.buckets.some((bucket, index) => bucket.start !== first + index * interval) ||
    data.result.buckets.reduce((sum, bucket) => sum + bucket.count, 0) !== data.result.matchingTotal
  )
    throw new ExploreSignalContractError('Calculated trend does not match request');
  return data;
}
