/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { z } from 'zod';
import { apiMessageGet } from '@/core/http/api-message';
import { HertzBeatResponseContractError } from './hertzbeat-response-errors';
import {
  traceHistogramSchema,
  traceFacetSchema,
  traceGroupsSchema,
  traceSpanPageSchema,
  type TracePopulation,
  type TraceFacetField
} from './hertzbeat-trace-analytics-schema';
export type TraceAnalyticsRequest = {
  kind: 'histogram' | 'facets' | 'groups' | 'spans';
  population: TracePopulation;
  field?: TraceFacetField;
  orderBy?: 'count-desc' | 'error-count-desc';
};
export async function loadHertzBeatTraceAnalytics<K extends TraceAnalyticsRequest['kind']>(
  path: string,
  request: TraceAnalyticsRequest & { kind: K },
  signal?: AbortSignal
): Promise<z.infer<(typeof schemas)[K]>> {
  const raw = await apiMessageGet(path, { signal: signal ?? null });
  const parsed = schemas[request.kind].safeParse(raw);
  if (!parsed.success) throw new HertzBeatResponseContractError();
  const result = parsed.data;
  const params = new URLSearchParams(path.split('?')[1]);
  if (
    result.window.start !== Number(params.get('start')) ||
    result.window.end !== Number(params.get('end')) ||
    result.window.endExclusive !== (params.get('endExclusive') === 'true') ||
    result.population !== request.population
  )
    throw new HertzBeatResponseContractError();
  requireRequestedData(result.data, request, params);
  return result as z.infer<(typeof schemas)[K]>;
}
const schemas = {
  histogram: traceHistogramSchema,
  facets: traceFacetSchema,
  groups: traceGroupsSchema,
  spans: traceSpanPageSchema
};

function requireRequestedData(
  data: z.infer<(typeof schemas)[keyof typeof schemas]>['data'],
  request: TraceAnalyticsRequest,
  params: URLSearchParams
) {
  if (!data) return;
  if ('field' in data && data.field !== request.field) throw new HertzBeatResponseContractError();
  if ('groupBy' in data && (data.groupBy !== request.field || data.orderBy !== (request.orderBy ?? 'count-desc')))
    throw new HertzBeatResponseContractError();
  if (
    'pageIndex' in data &&
    (data.pageIndex !== Number(params.get('pageIndex')) ||
      data.pageSize !== Number(params.get('pageSize')) ||
      data.sort !== params.get('sort'))
  )
    throw new HertzBeatResponseContractError();
}
