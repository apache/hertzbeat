/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { parseQueryContext } from '@/shared/query-context';
import { enabledFilterValue } from './explore-parity-filter-model';
import type { ExploreQueryPatch, ExploreSignal } from './explore-query';
export function readValue(value: string | null) {
  return value?.trim() || undefined;
}

export function readOpaqueRouteValue(params: URLSearchParams, key: string) {
  return params.has(key) ? (params.get(key)?.trim() ?? '') : undefined;
}

export function parseUrlTime(params: URLSearchParams) {
  const start = readPositiveInteger(params.get('start'));
  const end = readPositiveInteger(params.get('end'));
  return { start, end };
}

export function readPositiveInteger(value: string | null) {
  if (!value || !/^\d+$/u.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function readLiveMode(params: URLSearchParams) {
  const mode = params.get('mode');
  return mode !== null ? (mode === 'live' ? true : undefined) : params.get('live') === 'true' ? true : undefined;
}

export function aliasedValue(params: URLSearchParams, canonical: string, alias: string) {
  return params.has(canonical) ? params.get(canonical) : params.get(alias);
}

export function setValue(params: URLSearchParams, key: string, value: string | undefined) {
  if (value) params.set(key, value);
}

export function setOpaqueRouteValue(params: URLSearchParams, key: string, value: string | undefined) {
  if (value !== undefined) params.set(key, value);
}

export function setEnabled(params: URLSearchParams, key: string, value: boolean | undefined) {
  if (value) params.set(key, 'true');
}

export function readSignal(value: string | null): ExploreSignal {
  if (value === null) return 'metrics';
  // Explicit unsupported values come from legacy links, whose established fallback was traces.
  return value === 'metrics' || value === 'logs' || value === 'traces' ? value : 'traces';
}

export function parseAliasedContext(params: URLSearchParams) {
  return {
    ...parseQueryContext(params),
    serviceNamespace: readValue(aliasedValue(params, 'serviceNamespace', 'namespace')),
    instance: readValue(aliasedValue(params, 'instance', 'serviceInstanceId')),
    endpoint: readValue(aliasedValue(params, 'endpoint', 'http.route'))
  };
}

export function logQueryFields(query: ExploreQueryPatch) {
  return {
    logRecordUid: query.logRecordUid,
    logView: query.logView,
    logAnalysis: query.logAnalysis,
    logAggregation: query.logAggregation,
    logTransactions: query.logTransactions,
    logCalculated: query.logCalculated,
    logCalculatedV2: query.logCalculatedV2,
    logSubquery: query.logSubquery,
    logReferenceJoin: query.logReferenceJoin,
    logGroupSelection: query.logGroupSelection,
    logNumericRange: query.logNumericRange,
    traceReturnTo: query.traceReturnTo,
    sort: query.sort,
    logSort: query.logSort,
    live: query.live,
    searchSyntax: query.searchSyntax,
    severityText: query.severityText,
    severityCategory: query.severityCategory,
    hideNoise: enabledFilterValue(query.hideNoise)
  };
}
