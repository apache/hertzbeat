/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { apiMessagePostWithErrorEnvelope } from '@/core/http/api-message';
import { DEFAULT_LOG_ANALYSIS, parseLogAnalysis } from '@/platform/perses';
import { logFacetFieldSchema } from '@/shared/log-field';
import type { LogExploreQuery } from '../model/explore-query';
import { parseLogSubquery, validLogSubqueryQuery } from '../model/explore-log-subquery';
import { readLogSort } from '../model/explore-log-order';
import { searchFieldName } from '../model/explore-log-search-authoring';
import { withoutSimpleFacetField } from '../model/explore-log-structured-facet-action';
import { ExploreSignalContractError } from '../model/explore-signal-contract';
import { buildSignalApiPath } from './explore-api';
import {
  parseSubqueryPageResponse,
  parseSubqueryTrendResponse,
  parseSubqueryFacetResponse
} from './explore-log-subquery-schema';
import { parseSubqueryAnalysisResponse } from './explore-log-subquery-analysis';

export {
  parseSubqueryPageResponse,
  parseSubqueryTrendResponse,
  parseSubqueryFacetResponse
} from './explore-log-subquery-schema';
export { parseSubqueryAnalysisResponse } from './explore-log-subquery-analysis';

const parameterKeys = [
  'start',
  'end',
  'entityId',
  'entityType',
  'collectorId',
  'instance',
  'endpoint',
  'traceId',
  'spanId',
  'severityNumber',
  'severityText',
  'severityCategory',
  'serviceName',
  'serviceNamespace',
  'environment',
  'resourceFilter',
  'attributeFilter',
  'hideInternal',
  'hideNoise',
  'logGroupSelection',
  'logNumericRange',
  'searchSyntax',
  'search'
] as const;
const intervals = [60_000, 300_000, 900_000, 1_800_000, 3_600_000, 21_600_000, 86_400_000];
const SUBQUERY_ENDPOINT = '/api/logs/subquery/query';

function requestBase(query: LogExploreQuery, now: number) {
  if (!validLogSubqueryQuery(query) || query.logSubquery === undefined)
    throw new ExploreSignalContractError('Invalid log subquery');
  const params = new URLSearchParams(buildSignalApiPath(query, now).split('?')[1]);
  const parameters: Record<string, string> = {};
  for (const key of parameterKeys) {
    const value = params.get(key);
    if (value !== null) parameters[key] = value;
  }
  return { version: 1 as const, parameters, subquery: parseLogSubquery(query.logSubquery)! };
}

export function buildSubqueryPageRequest(query: LogExploreQuery, now = Date.now()) {
  const sort = readLogSort(query.logSort);
  return {
    ...requestBase(query, now),
    operation: {
      kind: 'page' as const,
      pageIndex: query.pageIndex ?? 0,
      pageSize: 20,
      sort: {
        field: sort?.field ?? 'timestamp',
        direction: sort?.direction ?? (query.sort === 'oldest' ? ('asc' as const) : ('desc' as const)),
        ...(sort && !['timestamp', 'severityNumber'].includes(sort.field) ? { type: sort.type } : {})
      }
    }
  };
}

export function buildSubqueryTrendRequest(query: LogExploreQuery, now = Date.now()) {
  const base = requestBase(query, now);
  const start = Number(base.parameters.start);
  const end = Number(base.parameters.end);
  const intervalMs = intervals.find(interval => Math.floor(end / interval) - Math.floor(start / interval) < 60);
  if (!intervalMs) throw new ExploreSignalContractError('Subquery trend exceeds supported intervals');
  return { ...base, operation: { kind: 'trend' as const, intervalMs } };
}

export function buildSubqueryFacetRequest(
  query: LogExploreQuery,
  field: string,
  valueSearch?: string,
  now = Date.now()
) {
  const base = requestBase(query, now);
  const separator = field.indexOf(':');
  const parsed = logFacetFieldSchema.safeParse({
    id: field,
    source: field.slice(0, separator),
    key: field.slice(separator + 1)
  });
  if (!parsed.success || (valueSearch !== undefined && new TextEncoder().encode(valueSearch).byteLength > 256))
    throw new ExploreSignalContractError('Invalid subquery facet');
  const name = searchFieldName(parsed.data);
  const search = name ? withoutSimpleFacetField(base.parameters.search ?? '', name) : base.parameters.search;
  const parameters = { ...base.parameters };
  if (search) parameters.search = search;
  else delete parameters.search;
  return {
    ...base,
    parameters,
    operation: { kind: 'facet' as const, field, limit: 20, ...(valueSearch ? { valueSearch } : {}) }
  };
}

export function buildSubqueryAnalysisRequest(query: LogExploreQuery, now = Date.now()) {
  const base = requestBase(query, now);
  const analysis = query.logAnalysis ? parseLogAnalysis(query.logAnalysis) : DEFAULT_LOG_ANALYSIS;
  if (analysis.representation !== 'timeseries' || analysis.transform || analysis.additionalMeasures?.length)
    throw new ExploreSignalContractError('Unsupported subquery analysis');
  const grouping =
    analysis.grouping?.dimensions ?? (analysis.field ? [{ field: analysis.field, limit: analysis.limit }] : []);
  const intervalMs = analysisInterval(base.parameters, analysis.intervalMs);
  return {
    ...base,
    operation: {
      kind: 'analysis' as const,
      view: 'timeseries' as const,
      grouping,
      measure: analysis.measure ?? null,
      limit: analysis.limit,
      order: analysis.order,
      minCount: analysis.minCount,
      intervalMs
    }
  };
}

function analysisInterval(parameters: Record<string, string>, requested: number | undefined) {
  const start = Number(parameters.start);
  const end = Number(parameters.end);
  const interval = requested ?? intervals.find(value => Math.floor(end / value) - Math.floor(start / value) < 60);
  if (!interval || Math.floor(end / interval) - Math.floor(start / interval) >= 60)
    throw new ExploreSignalContractError('Subquery analysis exceeds supported intervals');
  return interval;
}

export async function loadSubqueryPage(query: LogExploreQuery, signal?: AbortSignal) {
  const request = buildSubqueryPageRequest(query);
  const data = await apiMessagePostWithErrorEnvelope(SUBQUERY_ENDPOINT, request, { signal: signal ?? null });
  return parseSubqueryPageResponse(data, request);
}

export async function loadSubqueryTrend(query: LogExploreQuery, signal?: AbortSignal) {
  const request = buildSubqueryTrendRequest(query);
  const data = await apiMessagePostWithErrorEnvelope(SUBQUERY_ENDPOINT, request, { signal: signal ?? null });
  return parseSubqueryTrendResponse(data, request);
}

export async function loadSubqueryFacet(
  query: LogExploreQuery,
  field: string,
  valueSearch?: string,
  signal?: AbortSignal
) {
  const request = buildSubqueryFacetRequest(query, field, valueSearch);
  const data = await apiMessagePostWithErrorEnvelope(SUBQUERY_ENDPOINT, request, { signal: signal ?? null });
  return parseSubqueryFacetResponse(data, request);
}

export async function loadSubqueryAnalysis(query: LogExploreQuery, signal?: AbortSignal) {
  const request = buildSubqueryAnalysisRequest(query);
  const data = await apiMessagePostWithErrorEnvelope(SUBQUERY_ENDPOINT, request, { signal: signal ?? null });
  return parseSubqueryAnalysisResponse(data, request);
}
