/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';
import { ExploreSignalContractError } from '../model/explore-signal-contract';
import { logRowSchema } from './explore-log-schema';
import { sameEntries } from './explore-log-calculated-v2-executed';
import type {
  SubqueryPageRequest as PageRequest,
  SubqueryTrendRequest as TrendRequest,
  SubqueryFacetRequest as FacetRequest
} from './explore-log-subquery-types';
const natural = z.number().int().safe().nonnegative();
const positive = natural.positive();
export const descriptor = z
  .object({
    version: z.literal(1),
    mainField: z.string(),
    operator: z.enum(['in', 'not_in']),
    child: z.object({ field: z.string(), searchSyntax: z.literal('structured-v1'), search: z.string() }).strict(),
    rank: z
      .object({
        direction: z.enum(['top', 'bottom']),
        limit: positive.max(1000),
        measure: z.union([
          z.object({ function: z.literal('count_all') }).strict(),
          z.object({ function: z.literal('count_distinct'), field: z.string() }).strict()
        ])
      })
      .strict()
  })
  .strict();
const sort = z
  .object({ field: z.string(), direction: z.enum(['asc', 'desc']), type: z.enum(['number', 'text']).optional() })
  .strict();
const pageOperation = z
  .object({ kind: z.literal('page'), pageIndex: natural, pageSize: positive.max(100), sort })
  .strict();
const trendOperation = z.object({ kind: z.literal('trend'), intervalMs: positive }).strict();
const common = { version: z.literal(1), window: z.object({ start: natural, end: positive }).strict() };
const pageResponse = z
  .object({
    ...common,
    executed: z
      .object({ parameters: z.record(z.string(), z.string()), subquery: descriptor, operation: pageOperation })
      .strict(),
    result: z
      .object({
        kind: z.literal('page'),
        totalElements: natural,
        rows: z.array(z.object({ log: logRowSchema, derived: z.record(z.string(), z.never()) }).strict()).max(100)
      })
      .strict()
  })
  .strict();
const trendResponse = z
  .object({
    ...common,
    executed: z
      .object({ parameters: z.record(z.string(), z.string()), subquery: descriptor, operation: trendOperation })
      .strict(),
    result: z
      .object({
        kind: z.literal('trend'),
        intervalMs: positive,
        matchingTotal: natural,
        buckets: z.array(z.object({ start: natural, count: natural }).strict()).max(60)
      })
      .strict()
  })
  .strict();
const facetResponse = z
  .object({
    ...common,
    executed: z
      .object({
        parameters: z.record(z.string(), z.string()),
        subquery: descriptor,
        operation: z
          .object({
            kind: z.literal('facet'),
            field: z.string(),
            limit: positive.max(100),
            valueSearch: z.string().optional()
          })
          .strict()
      })
      .strict(),
    result: z
      .object({
        kind: z.literal('facet'),
        field: z.string(),
        matchingTotal: natural,
        missingOrNullCount: natural,
        values: z.array(z.object({ value: z.string(), count: positive }).strict()).max(100),
        truncated: z.boolean(),
        search: z.object({ query: z.string(), matchedCount: natural }).strict().optional()
      })
      .strict()
  })
  .strict();

export function parseSubqueryPageResponse(value: unknown, request: PageRequest) {
  const parsed = pageResponse.safeParse(value);
  if (!parsed.success) throw new ExploreSignalContractError('Invalid subquery page');
  const data = parsed.data;
  const remaining = Math.max(0, data.result.totalElements - request.operation.pageIndex * request.operation.pageSize);
  if (!sameEnvelope(data, request) || data.result.rows.length !== Math.min(remaining, request.operation.pageSize))
    throw new ExploreSignalContractError('Subquery page does not match request');
  return data;
}

export function parseSubqueryTrendResponse(value: unknown, request: TrendRequest) {
  const parsed = trendResponse.safeParse(value);
  if (!parsed.success) throw new ExploreSignalContractError('Invalid subquery trend');
  const data = parsed.data;
  const interval = request.operation.intervalMs;
  const start = Number(request.parameters.start);
  const end = Number(request.parameters.end);
  const first = Math.floor(start / interval) * interval;
  const expected = Math.floor(end / interval) - Math.floor(start / interval) + 1;
  if (
    !sameEnvelope(data, request) ||
    data.result.intervalMs !== interval ||
    data.result.buckets.length !== expected ||
    data.result.buckets.some((bucket, index) => bucket.start !== first + index * interval) ||
    data.result.buckets.reduce((sum, bucket) => sum + bucket.count, 0) !== data.result.matchingTotal
  )
    throw new ExploreSignalContractError('Subquery trend does not match request');
  return data;
}

export function parseSubqueryFacetResponse(value: unknown, request: FacetRequest) {
  const parsed = facetResponse.safeParse(value);
  if (!parsed.success) throw new ExploreSignalContractError('Invalid subquery facet');
  const data = parsed.data;
  if (
    !sameEnvelope(data, request) ||
    data.result.field !== request.operation.field ||
    data.result.values.length > request.operation.limit ||
    !validFacetPopulation(data.result, request.operation.valueSearch)
  )
    throw new ExploreSignalContractError('Subquery facet does not match request');
  return data;
}

function validFacetPopulation(result: z.infer<typeof facetResponse>['result'], valueSearch: string | undefined) {
  const population = result.matchingTotal - result.missingOrNullCount;
  const searched = result.search?.matchedCount ?? population;
  const represented = result.values.reduce((sum, item) => sum + item.count, 0);
  return (
    population >= 0 &&
    searched <= population &&
    (result.truncated ? represented <= searched : represented === searched) &&
    new Set(result.values.map(item => item.value)).size === result.values.length &&
    (valueSearch ?? '') === (result.search?.query ?? '')
  );
}

export function sameEnvelope(
  data: {
    window: { start: number; end: number };
    executed: { parameters: Record<string, string>; subquery: unknown; operation: unknown };
  },
  request: { parameters: Record<string, string>; subquery: unknown; operation: unknown }
) {
  return (
    data.window.start === Number(request.parameters.start) &&
    data.window.end === Number(request.parameters.end) &&
    sameEntries(data.executed.parameters, request.parameters) &&
    sameEntries(data.executed.subquery, request.subquery) &&
    sameEntries(data.executed.operation, request.operation)
  );
}
