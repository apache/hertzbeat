/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { queryLogAnalysis, type LogAnalysisEvidence } from '../logs/log-analysis-query';

import { loadHertzBeatTraceAnalytics } from './hertzbeat-trace-analytics-client';
import type { TraceSpanPage, TraceGroups } from './hertzbeat-trace-analytics-schema';
import { queryMetricComposition } from './hertzbeat-metric-composition';
import type { MetricComposition } from '../metrics/metric-composition';
import { ApiMessageError, apiMessageGet } from '@/core/http/api-message';

import {
  hertzBeatQuerySchema,
  type HertzBeatLogTableQuery,
  type HertzBeatLogAnalysisQuery,
  type HertzBeatMetricQuery,
  type HertzBeatMetricCompositionQuery,
  type HertzBeatQuery,
  type HertzBeatQueryFailure,
  type HertzBeatQueryOutcome,
  type HertzBeatTraceGanttQuery,
  type HertzBeatTraceSpansQuery,
  type HertzBeatTraceGroupsQuery,
  type HertzBeatTraceTableQuery
} from './hertzbeat-query-contract';
import {
  HertzBeatResponseContractError,
  HertzBeatResponseStateError,
  parseLogTable,
  parseMetricResponse,
  parseTraceGantt,
  parseTraceTable,
  type HertzBeatLogRow,
  type HertzBeatMetricData,
  type HertzBeatTableData,
  type HertzBeatTraceDetail,
  type HertzBeatTraceRow
} from './hertzbeat-query-schema';

export { HERTZBEAT_QUERY_LIMITS } from './hertzbeat-query-contract';

const DEFAULT_TABLE_LIMIT = 100;

type QueryOptions = { signal?: AbortSignal | undefined };

export function queryHertzBeatData(
  query: HertzBeatLogAnalysisQuery,
  options?: QueryOptions
): Promise<HertzBeatQueryOutcome<LogAnalysisEvidence>>;
export function queryHertzBeatData(
  query: HertzBeatMetricCompositionQuery,
  options?: QueryOptions
): Promise<HertzBeatQueryOutcome<MetricComposition>>;
export function queryHertzBeatData(
  query: HertzBeatMetricQuery,
  options?: QueryOptions
): Promise<HertzBeatQueryOutcome<HertzBeatMetricData>>;
export function queryHertzBeatData(
  query: HertzBeatLogTableQuery,
  options?: QueryOptions
): Promise<HertzBeatQueryOutcome<HertzBeatTableData<HertzBeatLogRow>>>;
export function queryHertzBeatData(
  query: HertzBeatTraceSpansQuery,
  options?: QueryOptions
): Promise<HertzBeatQueryOutcome<TraceSpanPage>>;
export function queryHertzBeatData(
  query: HertzBeatTraceGroupsQuery,
  options?: QueryOptions
): Promise<HertzBeatQueryOutcome<TraceGroups>>;
export function queryHertzBeatData(
  query: HertzBeatTraceTableQuery,
  options?: QueryOptions
): Promise<HertzBeatQueryOutcome<HertzBeatTableData<HertzBeatTraceRow>>>;
export function queryHertzBeatData(
  query: HertzBeatTraceGanttQuery,
  options?: QueryOptions
): Promise<HertzBeatQueryOutcome<HertzBeatTraceDetail>>;
export async function queryHertzBeatData(
  query: HertzBeatQuery,
  options: QueryOptions = {}
): Promise<HertzBeatQueryOutcome<unknown>> {
  const parsed = hertzBeatQuerySchema.safeParse(query);
  if (!parsed.success) return failure('invalid_request');
  try {
    return await executeQuery(parsed.data, options.signal);
  } catch (error) {
    if (options.signal?.aborted) throw options.signal.reason ?? new DOMException('Aborted', 'AbortError');
    return mapFailure(error);
  }
}

async function executeQuery(query: HertzBeatQuery, signal?: AbortSignal): Promise<HertzBeatQueryOutcome<unknown>> {
  if (query.signal === 'metrics' && query.queryKind === 'composition')
    return queryMetricComposition(query, scalar => queryHertzBeatData(scalar, { signal }), signal);
  if (query.signal === 'metrics') {
    const data = parseMetricResponse(await request(buildMetricPath(query), signal), query.timeWindow);
    return data ? { state: 'ready', data, truncated: 'unknown' } : { state: 'empty', truncated: false };
  }
  if (query.signal === 'logs') return executeLogs(query, signal);
  if (query.queryKind === 'spans' || query.queryKind === 'groups') return executeTraceAnalytics(query, signal);
  if (query.queryKind === 'table') return executeTraceTable(query, signal);
  const data = parseTraceGantt(
    await request(buildTraceGanttPath(query), signal),
    query.traceId,
    query.spanId,
    query.timeWindow
  );
  return data ? { state: 'ready', data, truncated: false } : { state: 'empty', truncated: false };
}

async function executeLogs(
  query: HertzBeatLogTableQuery | HertzBeatLogAnalysisQuery,
  signal?: AbortSignal
): Promise<HertzBeatQueryOutcome<unknown>> {
  if (query.logCalculatedV2) return failure('invalid_request');
  if (query.queryKind === 'analysis') {
    const params = new URLSearchParams(buildLogTablePath(query, query.limit ?? DEFAULT_TABLE_LIMIT).split('?')[1]);
    if (query.logGroupSelection) params.set('logGroupSelection', JSON.stringify(query.logGroupSelection));
    return queryLogAnalysis(query, params, signal);
  }
  const limit = query.limit ?? DEFAULT_TABLE_LIMIT;
  const data = parseLogTable(await request(buildLogTablePath(query, limit), signal), limit);
  return data
    ? { state: 'ready', data, truncated: data.total > data.rows.length }
    : { state: 'empty', truncated: false };
}

async function executeTraceAnalytics(
  query: HertzBeatTraceSpansQuery | HertzBeatTraceGroupsQuery,
  signal?: AbortSignal
) {
  const params = new URLSearchParams(buildTraceTablePath(query, query.limit ?? 20).split('?')[1]);
  if (query.queryKind === 'spans') {
    params.set('population', 'matched_spans');
    const data = await loadHertzBeatTraceAnalytics(
      `/api/traces/spans?${params}`,
      { kind: 'spans', population: 'matched_spans' },
      signal
    );
    return analyticsOutcome(data);
  }
  for (const key of ['sort', 'pageIndex', 'pageSize']) params.delete(key);
  params.set('population', query.population);
  params.set('groupBy', query.groupBy);
  params.set('orderBy', query.orderBy ?? 'count-desc');
  params.set('limit', String(query.limit ?? 20));
  const data = await loadHertzBeatTraceAnalytics(
    `/api/traces/stats/groups?${params}`,
    { kind: 'groups', population: query.population, field: query.groupBy, orderBy: query.orderBy ?? 'count-desc' },
    signal
  );
  return analyticsOutcome(data);
}

async function executeTraceTable(
  query: HertzBeatTraceTableQuery,
  signal?: AbortSignal
): Promise<HertzBeatQueryOutcome<HertzBeatTableData<HertzBeatTraceRow>>> {
  const limit = query.limit ?? DEFAULT_TABLE_LIMIT;
  const data = parseTraceTable(await request(buildTraceTablePath(query, limit), signal), limit);
  const truncated = data.total > data.rows.length ? true : (data.query?.truncated ?? 'unknown');
  const { query: metadata, ...table } = data;
  const coverage = metadata ? { query: metadata } : {};
  return data.rows.length > 0
    ? { state: 'ready', data: table, truncated, ...coverage }
    : { state: 'empty', truncated, ...coverage };
}

function request(path: string, signal?: AbortSignal) {
  return apiMessageGet(path, { signal: signal ?? null });
}

function buildMetricPath(query: HertzBeatMetricQuery) {
  const params = baseParams(query, true);
  params.set('query', query.metric.name);
  set(params, 'aggregation', query.metric.aggregation);
  set(params, 'temporalAggregation', query.metric.temporalAggregation);
  setNumber(params, 'step', query.metric.stepSeconds);
  setNumber(params, 'limit', query.limit);
  set(params, 'operationName', query.metric.operationName);
  set(params, 'filter', query.metric.metricFilter);
  set(params, 'groupBy', query.metric.groupBy);
  return `/api/ingestion/otlp/metrics/console?${params.toString()}`;
}

function buildLogTablePath(query: HertzBeatLogTableQuery | HertzBeatLogAnalysisQuery, limit: number) {
  const params = baseParams(query, true);
  params.set('pageIndex', '0');
  params.set('pageSize', String(limit));
  set(params, 'search', query.search);
  set(params, 'searchSyntax', query.searchSyntax);
  set(params, 'sort', query.sort);
  set(params, 'logSort', query.logSort ? JSON.stringify(query.logSort) : undefined);
  set(params, 'logNumericRange', query.logNumericRange ? JSON.stringify(query.logNumericRange) : undefined);
  set(params, 'severityText', query.severity);
  set(params, 'severityCategory', query.severityCategory);
  set(params, 'resourceFilter', query.resourceFilter);
  set(params, 'attributeFilter', query.attributeFilter);
  set(params, 'traceId', query.traceId);
  set(params, 'spanId', query.spanId);
  setBoolean(params, 'hideInternal', query.hideInternal);
  setBoolean(params, 'hideNoise', query.hideNoise);
  return `/api/logs/list?${params.toString()}`;
}

function buildTraceTablePath(
  query: HertzBeatTraceTableQuery | HertzBeatTraceSpansQuery | HertzBeatTraceGroupsQuery,
  limit: number
) {
  const params = baseParams(query, true);
  setBoolean(params, 'endExclusive', query.endExclusive);
  params.set('pageIndex', '0');
  params.set('pageSize', String(limit));
  set(params, 'operationName', query.operationName);
  set(params, 'sort', 'sort' in query ? (query.sort ?? 'newest') : 'newest');
  set(params, 'resourceFilter', query.resourceFilter);
  set(params, 'attributeFilter', query.attributeFilter);
  setBoolean(params, 'errorOnly', query.errorOnly);
  setNumber(params, 'minDurationMs', query.minDurationMs);
  setNumber(params, 'maxDurationMs', query.maxDurationMs);
  set(params, 'spanScope', query.spanScope);
  setBoolean(params, 'hideInternal', query.hideInternal);
  return `/api/traces/list?${params.toString()}`;
}

function buildTraceGanttPath(query: HertzBeatTraceGanttQuery) {
  const params = new URLSearchParams({
    start: String(query.timeWindow.from),
    end: String(query.timeWindow.to)
  });
  set(params, 'spanId', query.spanId);
  return `/api/traces/${encodeURIComponent(query.traceId)}?${params.toString()}`;
}

function baseParams(query: HertzBeatQuery, includeEntityType: boolean) {
  const params = new URLSearchParams();
  set(params, 'entityId', query.context?.entityId);
  if (includeEntityType) set(params, 'entityType', query.context?.entityType);
  params.set('start', String(query.timeWindow.from));
  params.set('end', String(query.timeWindow.to));
  set(params, 'serviceName', query.context?.serviceName);
  set(params, 'serviceNamespace', query.context?.serviceNamespace);
  set(params, 'environment', query.context?.environment);
  set(params, 'collectorId', query.context?.collectorId);
  set(params, 'instance', query.context?.instance);
  set(params, 'endpoint', query.context?.endpoint);
  return params;
}

function set(params: URLSearchParams, key: string, value: string | undefined) {
  if (value) params.set(key, value);
}

function setNumber(params: URLSearchParams, key: string, value: number | undefined) {
  if (value != null) params.set(key, String(value));
}

function setBoolean(params: URLSearchParams, key: string, value: boolean | undefined) {
  if (value) params.set(key, 'true');
}

function mapFailure(error: unknown): HertzBeatQueryOutcome<never> {
  if (error instanceof HertzBeatResponseContractError) return failure('contract_error');
  if (error instanceof HertzBeatResponseStateError) return failure(error.kind);
  if (error instanceof ApiMessageError) {
    if (error.status === 401 || error.status === 403) return failure('permission');
    if (error.status === 400 || error.status === 422 || error.code === 3) return failure('invalid_request');
    if (error.status === 429) return failure('overloaded');
  }
  return failure('unavailable');
}

function failure(kind: HertzBeatQueryFailure['kind']): HertzBeatQueryOutcome<never> {
  const errors: Record<HertzBeatQueryFailure['kind'], HertzBeatQueryFailure> = {
    invalid_request: {
      kind: 'invalid_request',
      messageKey: 'perses.query.invalid',
      retryable: false
    },
    permission: {
      kind: 'permission',
      messageKey: 'perses.query.permission',
      retryable: false
    },
    overloaded: {
      kind: 'overloaded',
      messageKey: 'perses.query.overloaded',
      retryable: true
    },
    unavailable: {
      kind: 'unavailable',
      messageKey: 'perses.query.unavailable',
      retryable: true
    },
    contract_error: {
      kind: 'contract_error',
      messageKey: 'perses.query.contract',
      retryable: false
    }
  };
  return { state: 'error', error: errors[kind] };
}

function analyticsOutcome<T extends { state: string; coverage: { truncated: boolean | null } | null }>(data: T) {
  return data.state === 'ready'
    ? { state: 'ready' as const, data, truncated: data.coverage?.truncated ?? ('unknown' as const) }
    : failure('unavailable');
}
