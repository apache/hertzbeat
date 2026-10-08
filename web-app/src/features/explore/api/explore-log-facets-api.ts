/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { apiMessageGet } from '@/core/http/api-message';
import type { ExactTimeWindow } from '@/shared/query-context';
import type { LogExploreQuery } from '../model/explore-query';
import {
  logFacetFieldSchema,
  logFacetFieldsSchema,
  logFacetValuesSchema,
  logFacetValueSearchSchema
} from '../model/explore-log-facets';
import { searchFieldName } from '../model/explore-log-search-authoring';
import { withoutSimpleFacetField } from '../model/explore-log-structured-facet-action';
import { ExploreSignalContractError } from '../model/explore-signal-contract';
import { buildSignalApiPath } from './explore-api';
export function buildLogFacetPath(
  query: LogExploreQuery,
  window: ExactTimeWindow,
  kind: 'fields' | 'values',
  field?: string,
  valueSearch?: string
) {
  const params = new URLSearchParams(
    buildSignalApiPath({ ...query, start: window.from, end: window.to, windowMode: undefined }).split('?')[1]
  );
  params.delete('sort');
  params.delete('pageIndex');
  params.delete('pageSize');
  if (kind === 'values') {
    if (!field) throw new ExploreSignalContractError();
    if (query.searchSyntax === 'structured-v1') {
      const colon = field.indexOf(':');
      const parsed = logFacetFieldSchema.safeParse({
        id: field,
        source: field.slice(0, colon),
        key: field.slice(colon + 1)
      });
      const name = parsed.success ? searchFieldName(parsed.data) : undefined;
      if (name) {
        const search = withoutSimpleFacetField(query.query ?? '', name);
        if (search) params.set('search', search);
        else params.delete('search');
      }
    }
    params.set('field', field);
    params.set('limit', '20');
    if (valueSearch) params.set('valueSearch', logFacetValueSearchSchema.parse(valueSearch));
  }
  return `/api/logs/facets/${kind}?${params}`;
}
export async function loadLogFacetFields(path: string, window: ExactTimeWindow, signal?: AbortSignal) {
  const result = logFacetFieldsSchema.parse(
    await apiMessageGet(path, { signal: signal ?? null, preserveErrorEnvelope: true })
  );
  requireWindow(result.window, window);
  return result;
}
export async function loadLogFacetValues(
  path: string,
  window: ExactTimeWindow,
  field: string,
  signal?: AbortSignal,
  valueSearch?: string
) {
  const result = logFacetValuesSchema.parse(
    await apiMessageGet(path, { signal: signal ?? null, preserveErrorEnvelope: true })
  );
  requireWindow(result.window, window);
  if (result.field.id !== field || (result.search?.query ?? '') !== (valueSearch ?? ''))
    throw new ExploreSignalContractError();
  return result;
}
function requireWindow(actual: { start: number; end: number }, expected: ExactTimeWindow) {
  if (actual.start !== expected.from || actual.end !== expected.to) throw new ExploreSignalContractError();
}
