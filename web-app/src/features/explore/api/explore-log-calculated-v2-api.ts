/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { apiMessagePostWithErrorEnvelope } from '@/core/http/api-message';
import type { LogExploreQuery } from '../model/explore-query';
import { validLogCalculatedV2Query, parseLogCalculatedV2 } from '../model/explore-log-calculated-v2';
import { readLogSort } from '../model/explore-log-order';
import { logFacetFieldSchema } from '../model/explore-log-facets';
import { searchFieldName } from '../model/explore-log-search-authoring';
import { withoutSimpleFacetField } from '../model/explore-log-structured-facet-action';
import { ExploreSignalContractError } from '../model/explore-signal-contract';
import { buildSignalApiPath } from './explore-api';
import {
  parseCalculatedPageResponse,
  parseCalculatedFacetResponse,
  parseCalculatedValidationResponse
} from './explore-log-calculated-v2-schema';
import { parseCalculatedTrendResponse } from './explore-log-calculated-v2-trend';
import { parseCalculatedAnalysisResponse } from './explore-log-calculated-v2-analysis';
import { DEFAULT_LOG_ANALYSIS, parseLogAnalysis } from '@/platform/perses';

export {
  parseCalculatedPageResponse,
  parseCalculatedFacetResponse,
  parseCalculatedValidationResponse
} from './explore-log-calculated-v2-schema';
export { parseCalculatedTrendResponse } from './explore-log-calculated-v2-trend';
export { parseCalculatedAnalysisResponse } from './explore-log-calculated-v2-analysis';

const parameterKeys = [
  'source',
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

export function buildCalculatedPageRequest(query: LogExploreQuery, now = Date.now()) {
  return {
    ...calculatedRequestBase(query, now),
    operation: {
      kind: 'page' as const,
      pageIndex: query.pageIndex ?? 0,
      pageSize: 20,
      sort: calculatedPageSort(query)
    }
  };
}

function calculatedRequestBase(query: LogExploreQuery, now: number) {
  if (!validLogCalculatedV2Query(query) || query.logCalculatedV2 === undefined)
    throw new ExploreSignalContractError('Invalid calculated field query');
  const state = parseLogCalculatedV2(query.logCalculatedV2)!;
  const params = new URLSearchParams(buildSignalApiPath(query, now).split('?')[1]);
  const parameters: Record<string, string> = {};
  for (const key of parameterKeys) {
    const value = params.get(key);
    if (value !== null) parameters[key] = value;
  }
  return {
    version: 2 as const,
    parameters,
    calculatedFields: { version: 2 as const, fields: state.fields }
  };
}

const trendIntervals = [60_000, 300_000, 900_000, 1_800_000, 3_600_000, 21_600_000, 86_400_000];

export function buildCalculatedTrendRequest(query: LogExploreQuery, now = Date.now()) {
  const base = calculatedRequestBase(query, now);
  const start = Number(base.parameters.start);
  const end = Number(base.parameters.end);
  const intervalMs = trendIntervals.find(interval => Math.floor(end / interval) - Math.floor(start / interval) < 60);
  if (!intervalMs) throw new ExploreSignalContractError('Calculated trend window exceeds supported intervals');
  return { ...base, operation: { kind: 'trend' as const, intervalMs } };
}

export function buildCalculatedAnalysisRequest(query: LogExploreQuery, now = Date.now()) {
  const base = calculatedRequestBase(query, now);
  const analysis = query.logAnalysis ? parseLogAnalysis(query.logAnalysis) : DEFAULT_LOG_ANALYSIS;
  if (analysis.representation !== 'timeseries' || analysis.transform || analysis.additionalMeasures?.length)
    throw new ExploreSignalContractError('Unsupported calculated analysis');
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

function analysisInterval(parameters: Record<string, string>, explicit: number | undefined) {
  const start = Number(parameters.start);
  const end = Number(parameters.end);
  const interval = explicit ?? trendIntervals.find(value => Math.floor(end / value) - Math.floor(start / value) < 60);
  if (!interval || Math.floor(end / interval) - Math.floor(start / interval) >= 60)
    throw new ExploreSignalContractError('Calculated analysis window exceeds supported intervals');
  return interval;
}

export async function loadCalculatedAnalysis(query: LogExploreQuery, signal?: AbortSignal) {
  const request = buildCalculatedAnalysisRequest(query);
  const data = await apiMessagePostWithErrorEnvelope('/api/logs/calculated/query', request, { signal: signal ?? null });
  return parseCalculatedAnalysisResponse(data, request);
}

function calculatedPageSort(query: LogExploreQuery) {
  const sort = readLogSort(query.logSort);
  return {
    field: sort?.field ?? 'timestamp',
    direction: sort?.direction ?? (query.sort === 'oldest' ? ('asc' as const) : ('desc' as const)),
    ...(sort && !sort.field.startsWith('calculated:') ? { type: sort.type } : {})
  };
}

export async function loadCalculatedPage(query: LogExploreQuery, signal?: AbortSignal) {
  const request = buildCalculatedPageRequest(query);
  const data = await apiMessagePostWithErrorEnvelope('/api/logs/calculated/query', request, { signal: signal ?? null });
  return parseCalculatedPageResponse(data, request);
}

export async function loadCalculatedTrend(query: LogExploreQuery, signal?: AbortSignal) {
  const request = buildCalculatedTrendRequest(query);
  const data = await apiMessagePostWithErrorEnvelope('/api/logs/calculated/query', request, { signal: signal ?? null });
  return parseCalculatedTrendResponse(data, request);
}

export function buildCalculatedFacetRequest(
  query: LogExploreQuery,
  field: string,
  valueSearch?: string,
  now = Date.now()
) {
  const base = calculatedRequestBase(query, now);
  const [source, ...parts] = field.split(':');
  const key = parts.join(':');
  const outputNames = base.calculatedFields.fields.flatMap(item =>
    item.kind === 'formula' ? [item.name] : item.captures.map(capture => capture.name)
  );
  const rawField = logFacetFieldSchema.safeParse({ id: field, source, key });
  const searchField =
    source === 'calculated' && outputNames.includes(key)
      ? `#${key}`
      : rawField.success
        ? searchFieldName(rawField.data)
        : undefined;
  if (!searchField) throw new ExploreSignalContractError('Invalid calculated facet field');
  if (valueSearch && new TextEncoder().encode(valueSearch).length > 256)
    throw new ExploreSignalContractError('Invalid calculated facet value search');
  const search = withoutSimpleFacetField(base.parameters.search ?? '', searchField);
  const parameters = { ...base.parameters };
  if (search) parameters.search = search;
  else delete parameters.search;
  return {
    ...base,
    parameters,
    operation: { kind: 'facet' as const, field, limit: 20, ...(valueSearch ? { valueSearch } : {}) }
  };
}

export async function loadCalculatedFacet(
  query: LogExploreQuery,
  field: string,
  valueSearch?: string,
  signal?: AbortSignal
) {
  const request = buildCalculatedFacetRequest(query, field, valueSearch);
  const data = await apiMessagePostWithErrorEnvelope('/api/logs/calculated/query', request, { signal: signal ?? null });
  return parseCalculatedFacetResponse(data, request);
}

export function buildCalculatedValidationRequest(raw: string, preview?: { definitionId: string; sourceText: string }) {
  const state = parseLogCalculatedV2(raw);
  if (
    !state ||
    (preview &&
      (new TextEncoder().encode(preview.sourceText).byteLength > 16384 ||
        !state.fields.some(field => field.id === preview.definitionId && field.kind === 'extraction')))
  )
    throw new ExploreSignalContractError('Invalid calculated field validation request');
  return {
    version: 2 as const,
    calculatedFields: { version: 2 as const, fields: state.fields },
    ...(preview ? { preview } : {})
  };
}

export async function validateCalculatedFields(
  raw: string,
  preview?: { definitionId: string; sourceText: string },
  signal?: AbortSignal
) {
  const request = buildCalculatedValidationRequest(raw, preview);
  const data = await apiMessagePostWithErrorEnvelope('/api/logs/calculated/validate', request, {
    signal: signal ?? null
  });
  return parseCalculatedValidationResponse(data, request);
}
